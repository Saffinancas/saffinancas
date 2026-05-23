"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, desc, sql } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { id } from "@/lib/ids";

type Brokerage = (typeof schema.brokerage.enumValues)[number];
type AssetClass = (typeof schema.assetClass.enumValues)[number];
type DividendKind = (typeof schema.dividendKind.enumValues)[number];

async function requireFamily(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado.");
  const u = session.user as { familyId?: string | null };
  if (!u.familyId) throw new Error("Sem família.");
  return u.familyId;
}

// ============================================================================
// HOLDINGS — posições em renda variável / fixa via B3
// ============================================================================

export async function createHolding(input: {
  assetClass: AssetClass;
  ticker: string;
  name: string;
  brokerage: Brokerage;
  quantity: number;
  avgCostCents: number;
  currentPriceCents?: number | null;
  notes?: string | null;
}) {
  if (input.quantity <= 0) throw new Error("Quantidade inválida.");
  if (input.avgCostCents < 0) throw new Error("Preço médio inválido.");
  const familyId = await requireFamily();
  await db.insert(schema.holdings).values({
    id: id("hld"),
    familyId,
    assetClass: input.assetClass,
    ticker: input.ticker.toUpperCase().trim(),
    name: input.name.trim(),
    brokerage: input.brokerage,
    quantity: String(input.quantity),
    avgCostCents: Math.round(input.avgCostCents),
    currentPriceCents:
      input.currentPriceCents != null ? Math.round(input.currentPriceCents) : null,
    notes: input.notes ?? null,
  });
  revalidatePath("/app/investimentos");
  revalidatePath("/app/investimentos/b3");
}

export async function deleteHolding(holdingId: string) {
  const familyId = await requireFamily();
  await db
    .update(schema.holdings)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(schema.holdings.id, holdingId), eq(schema.holdings.familyId, familyId)));
  revalidatePath("/app/investimentos/b3");
}

export async function updateHoldingPrice(holdingId: string, currentPriceCents: number) {
  const familyId = await requireFamily();
  await db
    .update(schema.holdings)
    .set({
      currentPriceCents: Math.round(currentPriceCents),
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(schema.holdings.id, holdingId), eq(schema.holdings.familyId, familyId)));
  revalidatePath("/app/investimentos/b3");
}

// ============================================================================
// DIVIDENDOS — quando marcado como recebido, gera transação automaticamente
// ============================================================================

export async function createDividend(input: {
  holdingId?: string | null;
  ticker: string;
  kind: DividendKind;
  amountCents: number;
  payableAt: string; // ISO date
  competenceMonth?: string | null; // YYYY-MM-01
  status?: "pending" | "received";
  notes?: string | null;
}) {
  if (input.amountCents <= 0) throw new Error("Valor inválido.");
  const familyId = await requireFamily();
  const payable = new Date(input.payableAt);
  if (Number.isNaN(payable.getTime())) throw new Error("Data inválida.");
  const competence = input.competenceMonth
    ? new Date(input.competenceMonth)
    : new Date(payable.getFullYear(), payable.getMonth(), 1);
  const status = input.status ?? "pending";

  const divId = id("div");
  let linkedTxId: string | null = null;

  if (status === "received") {
    // Cria a transação de receita automaticamente.
    linkedTxId = await createReceiptForDividend({
      familyId,
      ticker: input.ticker,
      kind: input.kind,
      amountCents: input.amountCents,
      payableAt: payable,
    });
  }

  await db.insert(schema.dividends).values({
    id: divId,
    familyId,
    holdingId: input.holdingId ?? null,
    ticker: input.ticker.toUpperCase().trim(),
    kind: input.kind,
    amountCents: Math.round(input.amountCents),
    payableAt: payable,
    competenceMonth: competence,
    status,
    linkedTransactionId: linkedTxId,
    notes: input.notes ?? null,
  });

  revalidatePath("/app/investimentos/b3");
  revalidatePath("/app");
  revalidatePath("/app/transacoes");
}

/**
 * Marca dividendo pendente como recebido — gera a transaction.
 * Idempotente: se já estiver received, não duplica.
 */
export async function markDividendReceived(dividendId: string) {
  const familyId = await requireFamily();
  const [div] = await db
    .select()
    .from(schema.dividends)
    .where(and(eq(schema.dividends.id, dividendId), eq(schema.dividends.familyId, familyId)))
    .limit(1);
  if (!div) throw new Error("Dividendo não encontrado.");
  if (div.status === "received") return;

  const txId = await createReceiptForDividend({
    familyId,
    ticker: div.ticker,
    kind: div.kind,
    amountCents: div.amountCents,
    payableAt: div.payableAt,
  });

  await db
    .update(schema.dividends)
    .set({ status: "received", linkedTransactionId: txId, updatedAt: new Date() })
    .where(eq(schema.dividends.id, dividendId));

  revalidatePath("/app/investimentos/b3");
  revalidatePath("/app");
  revalidatePath("/app/transacoes");
}

async function createReceiptForDividend(opts: {
  familyId: string;
  ticker: string;
  kind: DividendKind;
  amountCents: number;
  payableAt: Date;
}): Promise<string> {
  // Tenta achar categoria existente da família que case com "investimento" / "renda extra"
  const candidates = await db
    .select()
    .from(schema.categories)
    .where(
      and(
        eq(schema.categories.familyId, opts.familyId),
        sql`${schema.categories.allowedType} in ('income', 'both')`,
      ),
    );
  const categoryName = opts.kind === "rent" ? "Investimentos" : "Investimentos";
  const fallback =
    candidates.find((c) => /investiment/i.test(c.name))?.id ??
    candidates.find((c) => /renda extra/i.test(c.name))?.id ??
    null;

  const txId = id("tx");
  await db.insert(schema.transactions).values({
    id: txId,
    familyId: opts.familyId,
    type: "income",
    amountCents: opts.amountCents,
    description: `${labelForKind(opts.kind)} ${opts.ticker}`,
    occurredAt: opts.payableAt,
    categoryId: fallback,
    origin: "manual",
    status: "confirmed",
  });
  return txId;
}

function labelForKind(k: DividendKind): string {
  switch (k) {
    case "dividend":
      return "Dividendo";
    case "jcp":
      return "JCP";
    case "rent":
      return "Rendimento FII";
    case "amortization":
      return "Amortização";
    default:
      return "Provento";
  }
}

export async function deleteDividend(dividendId: string) {
  const familyId = await requireFamily();
  await db
    .delete(schema.dividends)
    .where(and(eq(schema.dividends.id, dividendId), eq(schema.dividends.familyId, familyId)));
  revalidatePath("/app/investimentos/b3");
}

export async function listHoldings(familyId: string) {
  return db
    .select()
    .from(schema.holdings)
    .where(and(eq(schema.holdings.familyId, familyId), sql`${schema.holdings.deletedAt} is null`))
    .orderBy(schema.holdings.ticker);
}

export async function listDividends(familyId: string, opts?: { limit?: number }) {
  return db
    .select()
    .from(schema.dividends)
    .where(eq(schema.dividends.familyId, familyId))
    .orderBy(desc(schema.dividends.payableAt))
    .limit(opts?.limit ?? 200);
}

// ============================================================================
// CRYPTO
// ============================================================================

type CryptoVenue = (typeof schema.cryptoVenue.enumValues)[number];

export async function createCryptoHolding(input: {
  symbol: string;
  name: string;
  quantity: number;
  avgCostCents: number;
  currentPriceCents?: number | null;
  venue: CryptoVenue;
  walletAddress?: string | null;
  notes?: string | null;
}) {
  if (input.quantity <= 0) throw new Error("Quantidade inválida.");
  const familyId = await requireFamily();
  await db.insert(schema.cryptoHoldings).values({
    id: id("ch"),
    familyId,
    symbol: input.symbol.toUpperCase().trim(),
    name: input.name.trim(),
    quantity: String(input.quantity),
    avgCostCents: Math.round(input.avgCostCents),
    currentPriceCents:
      input.currentPriceCents != null ? Math.round(input.currentPriceCents) : null,
    venue: input.venue,
    walletAddress: input.walletAddress ?? null,
    notes: input.notes ?? null,
  });
  revalidatePath("/app/investimentos/cripto");
}

export async function deleteCryptoHolding(holdingId: string) {
  const familyId = await requireFamily();
  await db
    .update(schema.cryptoHoldings)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(schema.cryptoHoldings.id, holdingId),
        eq(schema.cryptoHoldings.familyId, familyId),
      ),
    );
  revalidatePath("/app/investimentos/cripto");
}

export async function listCryptoHoldings(familyId: string) {
  return db
    .select()
    .from(schema.cryptoHoldings)
    .where(
      and(
        eq(schema.cryptoHoldings.familyId, familyId),
        sql`${schema.cryptoHoldings.deletedAt} is null`,
      ),
    )
    .orderBy(schema.cryptoHoldings.symbol);
}
