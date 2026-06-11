import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import {
  createClassifier,
  type AIProvider,
  type ClassifyContext,
  type TransactionDraft,
} from "@cofre/ai";
import { log } from "../log.js";
import type { ClassifyJob } from "./enqueue.js";
import { sessionManager } from "../wa/manager.js";
import { SAF_GLOBAL_ID } from "../wa/session.js";

const LINK_CMD = /^vincular\s+([A-Za-z0-9]{4,8})/i;

const AVG_INPUT_TOKENS = 480;
const AVG_OUTPUT_TOKENS = 130;
const USD_TO_BRL = 5.0;

const AI_PRICES: Record<AIProvider, { inputPerM: number; outputPerM: number; model: string }> = {
  claude: { inputPerM: 1.0, outputPerM: 5.0, model: "claude-haiku-4-5" },
  openai: { inputPerM: 0.15, outputPerM: 0.6, model: "gpt-4o-mini" },
  gemini: { inputPerM: 0.075, outputPerM: 0.3, model: "gemini-1.5-flash" },
  auto: { inputPerM: 1.0, outputPerM: 5.0, model: "claude-haiku-4-5" },
};

function estimateCostCents(provider: AIProvider, input: number, output: number): number {
  const p = AI_PRICES[provider];
  const usd = (input / 1_000_000) * p.inputPerM + (output / 1_000_000) * p.outputPerM;
  return Math.round(usd * USD_TO_BRL * 100);
}

function dedupHash(familyId: string, draft: TransactionDraft, occurredAt: Date): string {
  const day = occurredAt.toISOString().slice(0, 10);
  return [familyId, draft.type, draft.amount_cents, day, draft.description?.slice(0, 40)]
    .filter(Boolean)
    .join("|");
}

/**
 * Lê a configuração de IA da família, classifica a mensagem, persiste raw +
 * transação (se for transação) + ai_usage_events.
 */
export async function processClassifyJob(job: ClassifyJob): Promise<void> {
  // Saf global: mensagem chegou num grupo sem família vinculada. Trata comando
  // `vincular CODIGO` pra materializar o link, ou ignora (próximas msgs do mesmo
  // grupo serão re-enfileiradas com a família correta pelo lookup do session.ts).
  if (job.familyId === SAF_GLOBAL_ID) {
    await handleSafUnlinked(job);
    return;
  }

  // 1. carrega família
  const [family] = await db
    .select({
      id: schema.families.id,
      aiProvider: schema.families.aiProvider,
      byokEnabled: schema.families.byokEnabled,
      byokProvider: schema.families.byokProvider,
      timezone: schema.families.timezone,
    })
    .from(schema.families)
    .where(eq(schema.families.id, job.familyId))
    .limit(1);

  if (!family) {
    log.warn({ familyId: job.familyId }, "Família não encontrada — descartando job");
    return;
  }

  // 2. salva raw message (idempotente)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);

  const memberId = await upsertMember(job);

  const existingRaw = await db
    .select({ id: schema.whatsappMessages.id })
    .from(schema.whatsappMessages)
    .where(
      and(
        eq(schema.whatsappMessages.familyId, job.familyId),
        eq(schema.whatsappMessages.waMessageId, job.waMessageId),
      ),
    )
    .limit(1);

  if (existingRaw[0]) {
    log.debug({ waMessageId: job.waMessageId }, "Mensagem já registrada — pulando");
    return;
  }

  const rawId = `wam_${cryptoRandom()}`;
  await db.insert(schema.whatsappMessages).values({
    id: rawId,
    familyId: job.familyId,
    waMessageId: job.waMessageId,
    waChatId: job.waChatId,
    senderPhone: job.senderPhone,
    senderMemberId: memberId,
    body: job.body,
    mediaType: job.mediaType,
    receivedAt: new Date(job.receivedAt),
    expiresAt,
  });

  // 3. classifica
  const provider: AIProvider = family.byokEnabled && family.byokProvider
    ? family.byokProvider
    : family.aiProvider;

  const classifier = createClassifier(provider);
  const ctx: ClassifyContext = {
    receivedAt: job.receivedAt,
    timezone: family.timezone ?? "America/Sao_Paulo",
    text: job.body,
    senderName: job.senderName ?? undefined,
    locale: "pt-BR",
  };

  let draft: TransactionDraft;
  try {
    draft = await classifier.classify(ctx);
  } catch (err) {
    log.error({ err, familyId: job.familyId }, "Erro ao classificar — descartando msg");
    await db
      .update(schema.whatsappMessages)
      .set({ discardedReason: "ai_error", processedAt: new Date() })
      .where(eq(schema.whatsappMessages.id, rawId));
    return;
  }

  const costCents = estimateCostCents(provider, AVG_INPUT_TOKENS, AVG_OUTPUT_TOKENS);
  const usageId = `aiu_${cryptoRandom()}`;

  // 4. se não é transação, marca raw como descartado e loga uso
  if (!draft.is_transaction || !draft.amount_cents || !draft.type) {
    await db.insert(schema.aiUsageEvents).values({
      id: usageId,
      familyId: job.familyId,
      provider,
      model: AI_PRICES[provider].model,
      inputTokens: AVG_INPUT_TOKENS,
      outputTokens: AVG_OUTPUT_TOKENS,
      costCents,
      paidByCustomer: family.byokEnabled,
      transactionId: null,
    });
    await db
      .update(schema.whatsappMessages)
      .set({ discardedReason: "not_transaction", processedAt: new Date() })
      .where(eq(schema.whatsappMessages.id, rawId));
    log.info({ familyId: job.familyId, confidence: draft.confidence }, "Msg não é transação");
    return;
  }

  // 5. cria transação (dedupHash evita duplicatas óbvias)
  const occurredAt = draft.occurred_at ? new Date(draft.occurred_at) : new Date(job.receivedAt);
  const hash = dedupHash(job.familyId, draft, occurredAt);

  const txId = `tx_${cryptoRandom()}`;
  await db.insert(schema.transactions).values({
    id: txId,
    familyId: job.familyId,
    type: draft.type,
    amountCents: draft.amount_cents,
    currency: draft.currency ?? "BRL",
    description: draft.description ?? job.body.slice(0, 200),
    occurredAt,
    origin: "whatsapp",
    status: draft.confidence >= 0.65 ? "confirmed" : "pending_review",
    whatsappMemberId: memberId,
    whatsappMessageId: rawId,
    aiProviderUsed: provider,
    aiConfidence: String(draft.confidence),
    aiCategorySuggestion: draft.category_suggestion ?? null,
    dedupHash: hash,
  });

  await db.insert(schema.aiUsageEvents).values({
    id: usageId,
    familyId: job.familyId,
    provider,
    model: AI_PRICES[provider].model,
    inputTokens: AVG_INPUT_TOKENS,
    outputTokens: AVG_OUTPUT_TOKENS,
    costCents,
    paidByCustomer: family.byokEnabled,
    transactionId: txId,
  });

  await db
    .update(schema.whatsappMessages)
    .set({ processedAt: new Date() })
    .where(eq(schema.whatsappMessages.id, rawId));

  // Confirmação no WhatsApp do membro: "✓ Lancei -R$ X,XX (descrição)".
  // Mesmo formato que o pipeline web (inbound.ts:298). Best-effort: se sessão
  // Saf não está conectada ou send falha, só loga — não retenta o job.
  try {
    const session = sessionManager.get(SAF_GLOBAL_ID);
    if (session && session.state.status === "connected") {
      const sign = draft.type === "expense" ? "−" : "+";
      const valor = (draft.amount_cents / 100).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      const desc = draft.description ?? draft.category_suggestion ?? "sem descrição";
      await session.sendText(
        job.waChatId,
        `✓ Lancei ${sign}R$ ${valor} (${desc}).`,
      );
    }
  } catch (err) {
    log.warn({ err, familyId: job.familyId }, "Falha ao mandar confirmação WhatsApp");
  }

  log.info(
    {
      familyId: job.familyId,
      txId,
      type: draft.type,
      amount: draft.amount_cents,
      confidence: draft.confidence,
    },
    "Transação criada",
  );
}

async function safReply(to: string, body: string): Promise<void> {
  try {
    const session = sessionManager.get(SAF_GLOBAL_ID);
    if (!session) return;
    await session.sendText(to, body);
  } catch (err) {
    log.warn({ err, to }, "Saf reply falhou");
  }
}

async function handleSafUnlinked(job: ClassifyJob): Promise<void> {
  const match = job.body.match(LINK_CMD);
  if (!match) {
    // Mensagem comum em grupo desconhecido. Responde uma vez (rate-limited via
    // memória? por enquanto: responde sempre) explicando como vincular.
    await safReply(
      job.waChatId,
      "Olá! Sou o Saf Finanças. Pra começar a capturar gastos desse grupo, alguém precisa pegar o código no app (menu WhatsApp) e mandar aqui: vincular SEU_CODIGO",
    );
    return;
  }

  const code = (match[1] ?? "").toUpperCase();
  const [session] = await db
    .select({
      familyId: schema.whatsappSessions.familyId,
      expiresAt: schema.whatsappSessions.linkCodeExpiresAt,
    })
    .from(schema.whatsappSessions)
    .where(eq(schema.whatsappSessions.linkCode, code))
    .limit(1);

  if (!session) {
    await safReply(job.waChatId, "Código inválido. Gere um novo no painel da Saf, menu WhatsApp.");
    return;
  }
  if (session.expiresAt && session.expiresAt < new Date()) {
    await safReply(job.waChatId, "Código expirado. Gere um novo no painel da Saf.");
    return;
  }

  // Materializa o link (provider=web_js) e marca a sessão como connected.
  await db
    .insert(schema.whatsappGroupLinks)
    .values({
      id: `walk_${cryptoRandom()}`,
      familyId: session.familyId,
      provider: "web_js",
      externalChatId: job.waChatId,
      chatName: null,
      isGroup: true,
    })
    .onConflictDoUpdate({
      target: [schema.whatsappGroupLinks.provider, schema.whatsappGroupLinks.externalChatId],
      set: {
        familyId: session.familyId,
        isGroup: true,
        archivedAt: null,
        linkedAt: new Date(),
      },
    });

  await db
    .update(schema.whatsappSessions)
    .set({
      status: "connected",
      linkCode: null,
      linkCodeExpiresAt: null,
      monitoredGroupId: job.waChatId,
      pairedPhone: job.senderPhone,
      provider: "web_js",
      lastSeenAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.whatsappSessions.familyId, session.familyId));

  await safReply(
    job.waChatId,
    "✓ Grupo vinculado à conta Saf! A partir de agora, mensagens com gasto viram transações automaticamente.",
  );
  log.info({ familyId: session.familyId, chatId: job.waChatId }, "Saf link estabelecido");
}

async function upsertMember(job: ClassifyJob): Promise<string> {
  const [existing] = await db
    .select({ id: schema.whatsappMembers.id })
    .from(schema.whatsappMembers)
    .where(
      and(
        eq(schema.whatsappMembers.familyId, job.familyId),
        eq(schema.whatsappMembers.phone, job.senderPhone),
      ),
    )
    .limit(1);

  if (existing) {
    if (job.senderName) {
      await db
        .update(schema.whatsappMembers)
        .set({ pushName: job.senderName, updatedAt: new Date() })
        .where(eq(schema.whatsappMembers.id, existing.id));
    }
    return existing.id;
  }

  const id = `wmb_${cryptoRandom()}`;
  await db.insert(schema.whatsappMembers).values({
    id,
    familyId: job.familyId,
    phone: job.senderPhone,
    pushName: job.senderName ?? null,
  });
  return id;
}

function cryptoRandom(): string {
  // Pequeno helper sem importar nada extra
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// Suprime warning de import não usado no path PGlite local
void sql;
