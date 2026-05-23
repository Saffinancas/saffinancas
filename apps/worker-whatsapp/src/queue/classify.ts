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
