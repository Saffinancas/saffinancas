import path from "node:path";
import { mkdir } from "node:fs/promises";
import wweb from "whatsapp-web.js";
import type { Client as WAClient, Chat, Message } from "whatsapp-web.js";
const { Client, LocalAuth } = wweb;
import QRCode from "qrcode";
import { env } from "../env.js";
import { log } from "../log.js";
import { enqueueMessage } from "../queue/enqueue.js";
import { db, schema } from "@cofre/db";
import { eq } from "drizzle-orm";

/**
 * Uma sessão = um número WhatsApp pareado por família.
 *
 * `whatsapp-web.js` mantém um Chromium headless pra cada client. Pareou? O
 * `LocalAuth` salva tokens em disco, e nas próximas inicializações ele
 * reconecta sem QR.
 */
export type SessionStatus =
  | "initializing"
  | "qr_pending"
  | "connected"
  | "disconnected"
  | "auth_failure";

export type SessionState = {
  familyId: string;
  status: SessionStatus;
  qrPayload: string | null;
  qrDataUrl: string | null;
  qrExpiresAt: Date | null;
  pairedPhone: string | null;
};

export type EventTrace = {
  ts: string;
  from: string;
  fromMe: boolean;
  isGroup: boolean;
  type: string;
  bodyPreview: string;
  action: "enqueued" | "skipped_no_body" | "skipped_not_group" | "skipped_not_monitored" | "error";
  resolvedFamilyId: string | null;
  note?: string;
};

export class WaSession {
  readonly familyId: string;
  private client: WAClient | null = null;
  state: SessionState;
  /** Ring buffer dos últimos 30 eventos message_create vistos. Pra debug no admin. */
  readonly events: EventTrace[] = [];

  constructor(familyId: string) {
    this.familyId = familyId;
    this.state = {
      familyId,
      status: "initializing",
      qrPayload: null,
      qrDataUrl: null,
      qrExpiresAt: null,
      pairedPhone: null,
    };
  }

  private trace(ev: EventTrace): void {
    this.events.unshift(ev);
    if (this.events.length > 30) this.events.pop();
  }

  async start(): Promise<void> {
    if (this.client) return;
    const dataPath = path.resolve(env.WA_SESSIONS_DIR);
    await mkdir(dataPath, { recursive: true });

    this.client = new Client({
      authStrategy: new LocalAuth({ clientId: this.familyId, dataPath }),
      puppeteer: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
        ],
      },
      // pairWithPhoneNumber permite gerar pairing code de 8 dígitos
      // (alternativa ao QR) — habilitamos via requestPairingCode().
    });

    this.client.on("qr", async (qr: string) => {
      const dataUrl = await QRCode.toDataURL(qr, { width: 256, margin: 1 });
      this.state.qrPayload = qr;
      this.state.qrDataUrl = dataUrl;
      this.state.qrExpiresAt = new Date(Date.now() + 60 * 1000);
      this.state.status = "qr_pending";
      await this.persist();
      log.info({ familyId: this.familyId }, "QR gerado");
    });

    this.client.on("ready", async () => {
      const me = this.client?.info?.wid?.user ?? null;
      this.state.status = "connected";
      this.state.pairedPhone = me ? `+${me}` : null;
      this.state.qrPayload = null;
      this.state.qrDataUrl = null;
      this.state.qrExpiresAt = null;
      await this.persist();
      log.info({ familyId: this.familyId, phone: me }, "WhatsApp conectado");
    });

    this.client.on("authenticated", () => {
      log.info({ familyId: this.familyId }, "Autenticado (sessão restaurada)");
    });

    this.client.on("auth_failure", async (msg: string) => {
      log.warn({ familyId: this.familyId, msg }, "Falha de autenticação");
      this.state.status = "auth_failure";
      await this.persist();
    });

    this.client.on("disconnected", async (reason: string) => {
      log.warn({ familyId: this.familyId, reason }, "Desconectado");
      this.state.status = "disconnected";
      this.state.pairedPhone = null;
      await this.persist();
    });

    // 'message_create' dispara pra TODAS as mensagens — incluindo as enviadas
    // pelo próprio número pareado. 'message' só dispara pras recebidas dos outros.
    // No nosso caso o usuário pareia o próprio celular, então a maioria das
    // mensagens vem como "fromMe" e precisamos capturá-las.
    this.client.on("message_create", (msg: Message) => {
      this.handleIncomingMessage(msg).catch((err) =>
        log.error({ err, familyId: this.familyId }, "Erro ao tratar mensagem"),
      );
    });

    await this.client.initialize();
  }

  /**
   * Roteamento de mensagens.
   *
   *  - Sessão Saf global: escuta TODOS os grupos onde o número Saf está. Faz
   *    lookup da família via `whatsapp_group_links` pelo `externalChatId`.
   *    Mensagem sem família vinculada → ainda é enfileirada com `familyId =
   *    'saf-global'` pro consumer reconhecer comando `vincular CODIGO` e
   *    materializar o link.
   *  - Sessão por família: comportamento antigo — só repassa mensagens do
   *    grupo monitorado.
   */
  private async handleIncomingMessage(msg: Message): Promise<void> {
    const isSafGlobal = this.familyId === SAF_GLOBAL_ID;
    const isGroup = msg.from.endsWith("@g.us");
    const baseTrace: Omit<EventTrace, "action" | "resolvedFamilyId" | "note"> = {
      ts: new Date().toISOString(),
      from: msg.from,
      fromMe: !!msg.fromMe,
      isGroup,
      type: msg.type ?? "unknown",
      bodyPreview: (msg.body ?? "").slice(0, 80),
    };

    if (!msg.body || msg.body.length === 0) {
      this.trace({ ...baseTrace, action: "skipped_no_body", resolvedFamilyId: null });
      return;
    }

    if (isSafGlobal) {
      if (!isGroup) {
        this.trace({ ...baseTrace, action: "skipped_not_group", resolvedFamilyId: null });
        return;
      }

      let resolvedFamilyId: string | null = null;
      try {
        const [link] = await db
          .select({ familyId: schema.whatsappGroupLinks.familyId })
          .from(schema.whatsappGroupLinks)
          .where(eq(schema.whatsappGroupLinks.externalChatId, msg.from))
          .limit(1);
        resolvedFamilyId = link?.familyId ?? null;
      } catch (err) {
        log.error({ err }, "lookup group link falhou");
        this.trace({
          ...baseTrace,
          action: "error",
          resolvedFamilyId: null,
          note: err instanceof Error ? err.message : String(err),
        });
        return;
      }

      try {
        const contact = await msg.getContact().catch(() => null);
        await enqueueMessage({
          familyId: resolvedFamilyId ?? SAF_GLOBAL_ID,
          waMessageId: msg.id._serialized,
          waChatId: msg.from,
          senderPhone: contact?.number ? `+${contact.number}` : msg.author ?? msg.from,
          senderName: contact?.pushname ?? contact?.name ?? null,
          body: msg.body,
          mediaType: msg.hasMedia ? msg.type : null,
          receivedAt: new Date(msg.timestamp * 1000).toISOString(),
        });
        this.trace({
          ...baseTrace,
          action: "enqueued",
          resolvedFamilyId: resolvedFamilyId ?? SAF_GLOBAL_ID,
        });
      } catch (err) {
        this.trace({
          ...baseTrace,
          action: "error",
          resolvedFamilyId: resolvedFamilyId ?? SAF_GLOBAL_ID,
          note: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    const [session] = await db
      .select({ groupId: schema.whatsappSessions.monitoredGroupId })
      .from(schema.whatsappSessions)
      .where(eq(schema.whatsappSessions.familyId, this.familyId))
      .limit(1);

    const monitored = session?.groupId;
    if (!monitored || msg.from !== monitored) {
      this.trace({
        ...baseTrace,
        action: "skipped_not_monitored",
        resolvedFamilyId: this.familyId,
        note: `monitored=${monitored ?? "null"}`,
      });
      return;
    }

    try {
      const contact = await msg.getContact().catch(() => null);
      await enqueueMessage({
        familyId: this.familyId,
        waMessageId: msg.id._serialized,
        waChatId: msg.from,
        senderPhone: contact?.number ? `+${contact.number}` : msg.author ?? msg.from,
        senderName: contact?.pushname ?? contact?.name ?? null,
        body: msg.body,
        mediaType: msg.hasMedia ? msg.type : null,
        receivedAt: new Date(msg.timestamp * 1000).toISOString(),
      });
      this.trace({ ...baseTrace, action: "enqueued", resolvedFamilyId: this.familyId });
    } catch (err) {
      this.trace({
        ...baseTrace,
        action: "error",
        resolvedFamilyId: this.familyId,
        note: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /** Envia mensagem texto pra um chat (grupo ou DM). */
  async sendText(to: string, body: string): Promise<void> {
    if (!this.client) throw new Error("Sessão não iniciada.");
    await this.client.sendMessage(to, body);
  }

  /**
   * Gera um pairing code de 8 caracteres pra parear via "Linked Devices →
   * Vincular com número de telefone" no app WhatsApp.
   *
   * Espera o cliente estar inicializado (ou inicializa). Telefone em formato
   * só dígitos com DDI (ex.: "5531999999999").
   */
  async requestPairingCode(phoneE164: string): Promise<string> {
    if (!this.client) await this.start();
    if (!this.client) throw new Error("Cliente não pôde ser inicializado.");
    const digits = phoneE164.replace(/\D/g, "");
    if (!digits || digits.length < 10) {
      throw new Error("Telefone inválido — use formato +5531999999999.");
    }
    // whatsapp-web.js expõe requestPairingCode no Client (v1.27+).
    const c = this.client as unknown as { requestPairingCode: (n: string, show?: boolean) => Promise<string> };
    if (typeof c.requestPairingCode !== "function") {
      throw new Error(
        "Esta versão de whatsapp-web.js não expõe requestPairingCode. Atualize a lib.",
      );
    }
    const code = await c.requestPairingCode(digits, false);
    this.state.status = "qr_pending";
    await this.persist();
    return code;
  }

  async listGroups(): Promise<Array<{ id: string; name: string; participants: number }>> {
    if (!this.client) return [];
    const chats = await this.client.getChats();
    return chats
      .filter((c: Chat) => c.isGroup)
      .map((c: Chat) => ({
        id: c.id._serialized,
        name: c.name,
        participants:
          "participants" in c && Array.isArray((c as { participants?: unknown[] }).participants)
            ? ((c as { participants: unknown[] }).participants?.length ?? 0)
            : 0,
      }));
  }

  async logout(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.logout();
    } catch (err) {
      log.warn({ err, familyId: this.familyId }, "logout retornou erro (ignorado)");
    }
    await this.client.destroy().catch(() => {});
    this.client = null;
    this.state.status = "disconnected";
    this.state.pairedPhone = null;
    this.state.qrPayload = null;
    this.state.qrDataUrl = null;
    this.state.qrExpiresAt = null;
    await this.persist();
  }

  private async persist(): Promise<void> {
    // Sessão Saf global não tem família real — estado fica só em memória.
    if (this.familyId === SAF_GLOBAL_ID) return;

    const now = new Date();
    const statusMap: Record<SessionStatus, "qr_pending" | "connected" | "disconnected" | "unpaired" | "banned"> = {
      initializing: "unpaired",
      qr_pending: "qr_pending",
      connected: "connected",
      disconnected: "disconnected",
      auth_failure: "banned",
    };
    const dbStatus = statusMap[this.state.status];

    const [existing] = await db
      .select({ id: schema.whatsappSessions.id })
      .from(schema.whatsappSessions)
      .where(eq(schema.whatsappSessions.familyId, this.familyId))
      .limit(1);

    if (!existing) return;

    await db
      .update(schema.whatsappSessions)
      .set({
        status: dbStatus,
        pairedPhone: this.state.pairedPhone,
        qrPayload: this.state.qrPayload,
        qrExpiresAt: this.state.qrExpiresAt,
        lastSeenAt: now,
        updatedAt: now,
      })
      .where(eq(schema.whatsappSessions.familyId, this.familyId));
  }
}

/**
 * ID especial para a sessão global Saf — número operacional da plataforma
 * que entra em todos os grupos das famílias clientes. Não persiste em
 * whatsapp_sessions (não tem família associada).
 */
export const SAF_GLOBAL_ID = "saf-global";
