import path from "node:path";
import { mkdir } from "node:fs/promises";
import { Client, LocalAuth, type Message } from "whatsapp-web.js";
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

export class WaSession {
  readonly familyId: string;
  private client: Client | null = null;
  state: SessionState;

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
    });

    this.client.on("qr", async (qr) => {
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

    this.client.on("auth_failure", async (msg) => {
      log.warn({ familyId: this.familyId, msg }, "Falha de autenticação");
      this.state.status = "auth_failure";
      await this.persist();
    });

    this.client.on("disconnected", async (reason) => {
      log.warn({ familyId: this.familyId, reason }, "Desconectado");
      this.state.status = "disconnected";
      this.state.pairedPhone = null;
      await this.persist();
    });

    this.client.on("message", (msg) => {
      this.handleIncomingMessage(msg).catch((err) =>
        log.error({ err, familyId: this.familyId }, "Erro ao tratar mensagem"),
      );
    });

    await this.client.initialize();
  }

  /**
   * Só repassa mensagens do grupo monitorado pra fila. Mensagens 1:1, status,
   * outros grupos — ignorados.
   */
  private async handleIncomingMessage(msg: Message): Promise<void> {
    const [session] = await db
      .select({ groupId: schema.whatsappSessions.monitoredGroupId })
      .from(schema.whatsappSessions)
      .where(eq(schema.whatsappSessions.familyId, this.familyId))
      .limit(1);

    const monitored = session?.groupId;
    if (!monitored) return;
    if (msg.from !== monitored) return;
    if (!msg.body || msg.body.length === 0) return;

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
  }

  async listGroups(): Promise<Array<{ id: string; name: string; participants: number }>> {
    if (!this.client) return [];
    const chats = await this.client.getChats();
    return chats
      .filter((c) => c.isGroup)
      .map((c) => ({
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
