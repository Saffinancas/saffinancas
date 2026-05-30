/**
 * Pipeline unificado de ingestão: webhook → vincula/identifica família →
 * classifica via IA → persiste raw + transação + ai_usage_event → opcional
 * resposta no chat.
 *
 * Chamado pelos endpoints /api/whatsapp/{twilio,meta}/webhook.
 */
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { createClassifier, type AIProvider, type TransactionDraft } from "@cofre/ai";
import { id as genId } from "@/lib/ids";
import type { IncomingMessage, WhatsappProvider, WhatsappProviderId } from "./types";

const AVG_INPUT_TOKENS = 480;
const AVG_OUTPUT_TOKENS = 130;
const USD_TO_BRL = 5.0;
const AI_PRICES: Record<AIProvider, { inputPerM: number; outputPerM: number; model: string }> = {
  claude: { inputPerM: 1.0, outputPerM: 5.0, model: "claude-haiku-4-5" },
  openai: { inputPerM: 0.15, outputPerM: 0.6, model: "gpt-4o-mini" },
  gemini: { inputPerM: 0.075, outputPerM: 0.3, model: "gemini-1.5-flash" },
  auto: { inputPerM: 1.0, outputPerM: 5.0, model: "claude-haiku-4-5" },
};

function estimateCostCents(p: AIProvider, input: number, output: number): number {
  const r = AI_PRICES[p];
  const usd = (input / 1_000_000) * r.inputPerM + (output / 1_000_000) * r.outputPerM;
  return Math.round(usd * USD_TO_BRL * 100);
}

export type IngestResult = {
  status: "linked" | "ingested" | "ignored_unlinked" | "error";
  message?: string;
};

const LINK_CMD = /^vincular\s+([A-Za-z0-9]{4,8})/i;

export async function handleIncomingMessage(
  msg: IncomingMessage,
  providerId: WhatsappProviderId,
  provider: WhatsappProvider,
): Promise<IngestResult> {
  // Dedup: já processamos essa mensagem?
  const existing = await db
    .select({ id: schema.whatsappMessages.id })
    .from(schema.whatsappMessages)
    .where(eq(schema.whatsappMessages.waMessageId, msg.externalMessageId))
    .limit(1);
  if (existing[0]) return { status: "ignored_unlinked", message: "duplicate" };

  // 1) Comando vincular?
  const linkMatch = msg.body.match(LINK_CMD);
  if (linkMatch) {
    const code = (linkMatch[1] ?? "").toUpperCase();
    const linked = await tryLinkByCode(code, providerId, msg);
    if (linked.status === "linked") {
      await safeReply(provider, msg.senderPhone, "✓ Vinculado! A partir de agora, seus gastos viram transações automaticamente.");
    } else {
      await safeReply(provider, msg.senderPhone, "Código inválido ou expirado. Gere um novo no app.");
    }
    return linked;
  }

  // 2) Identifica a família por (provider, external_chat_id)
  const [link] = await db
    .select({ familyId: schema.whatsappGroupLinks.familyId, isGroup: schema.whatsappGroupLinks.isGroup })
    .from(schema.whatsappGroupLinks)
    .where(
      and(
        eq(schema.whatsappGroupLinks.provider, providerId),
        eq(schema.whatsappGroupLinks.externalChatId, msg.externalChatId),
        isNull(schema.whatsappGroupLinks.archivedAt),
      ),
    )
    .limit(1);

  if (!link) {
    // Não vinculado — instrui usuário a vincular
    await safeReply(
      provider,
      msg.senderPhone,
      "Olá! Eu sou o Saf Finanças. Pra começar a registrar suas transações, mande aqui: vincular SEU_CODIGO (pega no painel da Saf, menu WhatsApp).",
    );
    return { status: "ignored_unlinked" };
  }

  // 3) Carrega família e classifica
  await ingestForFamily(link.familyId, msg, provider);
  return { status: "ingested" };
}

async function tryLinkByCode(
  code: string,
  providerId: WhatsappProviderId,
  msg: IncomingMessage,
): Promise<IngestResult> {
  const [session] = await db
    .select({
      familyId: schema.whatsappSessions.familyId,
      expiresAt: schema.whatsappSessions.linkCodeExpiresAt,
    })
    .from(schema.whatsappSessions)
    .where(eq(schema.whatsappSessions.linkCode, code))
    .limit(1);

  if (!session) return { status: "error", message: "code_not_found" };
  if (session.expiresAt && session.expiresAt < new Date()) {
    return { status: "error", message: "code_expired" };
  }

  // Cria o link (ou ignora se já existe pra essa combinação)
  await db
    .insert(schema.whatsappGroupLinks)
    .values({
      id: genId("walk"),
      familyId: session.familyId,
      provider: providerId,
      externalChatId: msg.externalChatId,
      chatName: msg.groupName ?? null,
      isGroup: msg.isGroup,
    })
    .onConflictDoNothing();

  // Limpa o code (one-time use) e marca sessão como conectada
  await db
    .update(schema.whatsappSessions)
    .set({
      status: "connected",
      linkCode: null,
      linkCodeExpiresAt: null,
      monitoredGroupId: msg.externalChatId,
      monitoredGroupName: msg.groupName ?? null,
      pairedPhone: msg.senderPhone,
      provider: providerId,
      lastSeenAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.whatsappSessions.familyId, session.familyId));

  return { status: "linked" };
}

async function ingestForFamily(
  familyId: string,
  msg: IncomingMessage,
  provider: WhatsappProvider,
): Promise<void> {
  const [family] = await db
    .select({
      aiProvider: schema.families.aiProvider,
      byokEnabled: schema.families.byokEnabled,
      byokProvider: schema.families.byokProvider,
      timezone: schema.families.timezone,
    })
    .from(schema.families)
    .where(eq(schema.families.id, familyId))
    .limit(1);

  if (!family) return;

  // Persiste raw
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 90);
  const memberId = await upsertMember(familyId, msg);
  const rawId = genId("wam");

  await db.insert(schema.whatsappMessages).values({
    id: rawId,
    familyId,
    waMessageId: msg.externalMessageId,
    waChatId: msg.externalChatId,
    senderPhone: msg.senderPhone,
    senderMemberId: memberId,
    body: msg.body,
    mediaType: msg.mediaType,
    receivedAt: new Date(msg.receivedAt),
    expiresAt,
  });

  // Classifica
  const aiProvider: AIProvider =
    family.byokEnabled && family.byokProvider ? family.byokProvider : family.aiProvider;
  const classifier = createClassifier(aiProvider);

  let draft: TransactionDraft;
  try {
    draft = await classifier.classify({
      text: msg.body,
      senderName: msg.senderName ?? undefined,
      timezone: family.timezone ?? "America/Sao_Paulo",
      receivedAt: msg.receivedAt,
      locale: "pt-BR",
    });
  } catch (err) {
    console.error("[whatsapp.inbound] classify failed", err);
    await db
      .update(schema.whatsappMessages)
      .set({ discardedReason: "ai_error", processedAt: new Date() })
      .where(eq(schema.whatsappMessages.id, rawId));
    return;
  }

  const costCents = estimateCostCents(aiProvider, AVG_INPUT_TOKENS, AVG_OUTPUT_TOKENS);
  const usageId = genId("aiu");

  if (!draft.is_transaction || !draft.amount_cents || !draft.type) {
    await db.insert(schema.aiUsageEvents).values({
      id: usageId,
      familyId,
      provider: aiProvider,
      model: AI_PRICES[aiProvider].model,
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
    return;
  }

  const occurredAt = draft.occurred_at ? new Date(draft.occurred_at) : new Date(msg.receivedAt);
  const txId = genId("tx");
  await db.insert(schema.transactions).values({
    id: txId,
    familyId,
    type: draft.type,
    amountCents: draft.amount_cents,
    currency: draft.currency ?? "BRL",
    description: draft.description ?? msg.body.slice(0, 200),
    occurredAt,
    origin: "whatsapp",
    status: draft.confidence >= 0.65 ? "confirmed" : "pending_review",
    whatsappMemberId: memberId,
    whatsappMessageId: rawId,
    aiProviderUsed: aiProvider,
    aiConfidence: String(draft.confidence),
    aiCategorySuggestion: draft.category_suggestion ?? null,
  });

  await db.insert(schema.aiUsageEvents).values({
    id: usageId,
    familyId,
    provider: aiProvider,
    model: AI_PRICES[aiProvider].model,
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

  // Resposta opcional pro chat
  if (provider.capabilities.canSendMessages) {
    const sign = draft.type === "expense" ? "-" : "+";
    const valor = (draft.amount_cents / 100).toFixed(2).replace(".", ",");
    await safeReply(
      provider,
      msg.externalChatId,
      `✓ Lancei ${sign}R$ ${valor} (${draft.description ?? "sem descrição"}).`,
    );
  }
}

async function upsertMember(familyId: string, msg: IncomingMessage): Promise<string> {
  const [existing] = await db
    .select({ id: schema.whatsappMembers.id })
    .from(schema.whatsappMembers)
    .where(
      and(
        eq(schema.whatsappMembers.familyId, familyId),
        eq(schema.whatsappMembers.phone, msg.senderPhone),
      ),
    )
    .limit(1);
  if (existing) return existing.id;

  const id = genId("wmb");
  await db.insert(schema.whatsappMembers).values({
    id,
    familyId,
    phone: msg.senderPhone,
    pushName: msg.senderName ?? null,
  });
  return id;
}

async function safeReply(provider: WhatsappProvider, to: string, body: string): Promise<void> {
  if (!provider.capabilities.canSendMessages) return;
  try {
    await provider.sendMessage({ to, body });
  } catch (err) {
    console.error("[whatsapp.inbound] reply failed", err);
  }
}
