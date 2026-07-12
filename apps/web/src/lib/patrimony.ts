"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, desc, sql } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { id } from "@/lib/ids";

type PatrimonyAssetType = (typeof schema.patrimonyAssetType.enumValues)[number];
type RentalAdjustmentIndex = (typeof schema.rentalAdjustmentIndex.enumValues)[number];

async function requireFamily(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado.");
  const u = session.user as { familyId?: string | null };
  if (!u.familyId) throw new Error("Sem família.");
  return u.familyId;
}

// ============================================================================
// ASSETS (imóveis, veículos etc.)
// ============================================================================

export async function createAsset(input: {
  name: string;
  type: PatrimonyAssetType;
  acquisitionDate: string;
  acquisitionCostCents: number;
  currentValueCents?: number;
  metadata?: Record<string, unknown>;
  notes?: string | null;
}) {
  if (input.acquisitionCostCents < 0) throw new Error("Custo inválido.");
  const familyId = await requireFamily();
  const acq = new Date(input.acquisitionDate);
  if (Number.isNaN(acq.getTime())) throw new Error("Data inválida.");
  const cur = input.currentValueCents ?? input.acquisitionCostCents;
  const assetId = id("ast");

  await db.insert(schema.patrimonyAssets).values({
    id: assetId,
    familyId,
    name: input.name.trim(),
    type: input.type,
    acquisitionDate: acq,
    acquisitionCostCents: Math.round(input.acquisitionCostCents),
    currentValueCents: Math.round(cur),
    metadata: input.metadata ?? null,
    notes: input.notes ?? null,
  });

  // Cria valoração inicial = custo de aquisição.
  await db.insert(schema.patrimonyValuations).values({
    id: id("val"),
    assetId,
    familyId,
    valuedAt: acq,
    valueCents: Math.round(input.acquisitionCostCents),
    source: "manual",
    notes: "Custo de aquisição",
  });

  revalidatePath("/app/patrimonio");
}

export async function updateAssetCurrentValue(opts: {
  assetId: string;
  valueCents: number;
  notes?: string | null;
  source?: "manual" | "market" | "appraisal" | "tax_table";
}) {
  if (opts.valueCents < 0) throw new Error("Valor inválido.");
  const familyId = await requireFamily();

  // SEGURANÇA: valida posse ANTES de qualquer INSERT — se pulasse essa
  // checagem, o INSERT em patrimonyValuations aceitaria assetId de outra
  // família (o valuation ainda seria armarrado ao familyId do atacante,
  // mas apareceria no histórico da vítima porque getAssetWithHistory
  // filtra só por assetId).
  const [owned] = await db
    .select({ id: schema.patrimonyAssets.id })
    .from(schema.patrimonyAssets)
    .where(
      and(
        eq(schema.patrimonyAssets.id, opts.assetId),
        eq(schema.patrimonyAssets.familyId, familyId),
      ),
    )
    .limit(1);
  if (!owned) throw new Error("Ativo não encontrado.");

  const now = new Date();
  await db.insert(schema.patrimonyValuations).values({
    id: id("val"),
    assetId: opts.assetId,
    familyId,
    valuedAt: now,
    valueCents: Math.round(opts.valueCents),
    source: opts.source ?? "manual",
    notes: opts.notes ?? null,
  });
  await db
    .update(schema.patrimonyAssets)
    .set({ currentValueCents: Math.round(opts.valueCents), updatedAt: now })
    .where(
      and(
        eq(schema.patrimonyAssets.id, opts.assetId),
        eq(schema.patrimonyAssets.familyId, familyId),
      ),
    );
  revalidatePath(`/app/patrimonio/${opts.assetId}`);
  revalidatePath("/app/patrimonio");
}

export async function deleteAsset(assetId: string) {
  const familyId = await requireFamily();
  await db
    .update(schema.patrimonyAssets)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(schema.patrimonyAssets.id, assetId),
        eq(schema.patrimonyAssets.familyId, familyId),
      ),
    );
  revalidatePath("/app/patrimonio");
}

export async function listAssets(familyId: string) {
  return db
    .select()
    .from(schema.patrimonyAssets)
    .where(
      and(
        eq(schema.patrimonyAssets.familyId, familyId),
        sql`${schema.patrimonyAssets.deletedAt} is null`,
      ),
    )
    .orderBy(desc(schema.patrimonyAssets.acquisitionDate));
}

export async function getAssetWithHistory(assetId: string, familyId: string) {
  const [asset] = await db
    .select()
    .from(schema.patrimonyAssets)
    .where(
      and(
        eq(schema.patrimonyAssets.id, assetId),
        eq(schema.patrimonyAssets.familyId, familyId),
      ),
    )
    .limit(1);

  if (!asset) return null;

  const valuations = await db
    .select()
    .from(schema.patrimonyValuations)
    .where(eq(schema.patrimonyValuations.assetId, assetId))
    .orderBy(schema.patrimonyValuations.valuedAt);

  const rentalsList = await db
    .select()
    .from(schema.rentals)
    .where(eq(schema.rentals.assetId, assetId));

  return { asset, valuations, rentals: rentalsList };
}

// ============================================================================
// RENTALS — contratos + pagamentos mensais
// ============================================================================

export async function createRental(input: {
  assetId: string;
  tenantName: string;
  tenantContact?: string | null;
  monthlyRentCents: number;
  contractStart: string;
  contractEnd?: string | null;
  paymentDay?: number;
  adjustmentIndex?: RentalAdjustmentIndex;
  notes?: string | null;
}) {
  const familyId = await requireFamily();
  await db.insert(schema.rentals).values({
    id: id("rnt"),
    assetId: input.assetId,
    familyId,
    tenantName: input.tenantName.trim(),
    tenantContact: input.tenantContact ?? null,
    monthlyRentCents: Math.round(input.monthlyRentCents),
    contractStart: new Date(input.contractStart),
    contractEnd: input.contractEnd ? new Date(input.contractEnd) : null,
    paymentDay: input.paymentDay ?? 5,
    adjustmentIndex: input.adjustmentIndex ?? "igpm",
    status: "active",
    notes: input.notes ?? null,
  });
  revalidatePath(`/app/patrimonio/${input.assetId}`);
}

export async function adjustRent(opts: {
  rentalId: string;
  newMonthlyRentCents: number;
  appliedAt?: string;
}) {
  const familyId = await requireFamily();
  await db
    .update(schema.rentals)
    .set({
      monthlyRentCents: Math.round(opts.newMonthlyRentCents),
      lastAdjustmentAt: opts.appliedAt ? new Date(opts.appliedAt) : new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(schema.rentals.id, opts.rentalId), eq(schema.rentals.familyId, familyId)));
  revalidatePath("/app/patrimonio");
}

export async function endRental(rentalId: string, endDate?: string) {
  const familyId = await requireFamily();
  await db
    .update(schema.rentals)
    .set({
      status: "ended",
      contractEnd: endDate ? new Date(endDate) : new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(schema.rentals.id, rentalId), eq(schema.rentals.familyId, familyId)));
  revalidatePath("/app/patrimonio");
}

export async function recordRentPayment(opts: {
  rentalId: string;
  periodMonth: string; // YYYY-MM-01
  paidAmountCents: number;
  paidAt?: string;
  notes?: string | null;
}) {
  if (opts.paidAmountCents <= 0) throw new Error("Valor inválido.");
  const familyId = await requireFamily();
  const period = new Date(opts.periodMonth);
  if (Number.isNaN(period.getTime())) throw new Error("Mês inválido.");

  const [rental] = await db
    .select()
    .from(schema.rentals)
    .where(and(eq(schema.rentals.id, opts.rentalId), eq(schema.rentals.familyId, familyId)))
    .limit(1);
  if (!rental) throw new Error("Aluguel não encontrado.");

  // Cria a transação de receita
  const txId = id("tx");
  await db.insert(schema.transactions).values({
    id: txId,
    familyId,
    type: "income",
    amountCents: Math.round(opts.paidAmountCents),
    description: `Aluguel ${rental.tenantName}`,
    occurredAt: opts.paidAt ? new Date(opts.paidAt) : new Date(),
    origin: "manual",
    status: "confirmed",
  });

  // Insere ou atualiza o rental_payment
  const dueDate = new Date(period.getFullYear(), period.getMonth(), rental.paymentDay);
  await db
    .insert(schema.rentalPayments)
    .values({
      id: id("rpm"),
      rentalId: opts.rentalId,
      familyId,
      periodMonth: period,
      dueDate,
      paidAt: opts.paidAt ? new Date(opts.paidAt) : new Date(),
      expectedAmountCents: rental.monthlyRentCents,
      paidAmountCents: Math.round(opts.paidAmountCents),
      linkedTransactionId: txId,
      notes: opts.notes ?? null,
    })
    .onConflictDoUpdate({
      target: [schema.rentalPayments.rentalId, schema.rentalPayments.periodMonth],
      set: {
        paidAt: opts.paidAt ? new Date(opts.paidAt) : new Date(),
        paidAmountCents: Math.round(opts.paidAmountCents),
        linkedTransactionId: txId,
        notes: opts.notes ?? null,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/app/patrimonio");
  revalidatePath("/app");
  revalidatePath("/app/transacoes");
}

export async function listRentalPayments(rentalId: string, familyId: string) {
  return db
    .select()
    .from(schema.rentalPayments)
    .where(
      and(
        eq(schema.rentalPayments.rentalId, rentalId),
        eq(schema.rentalPayments.familyId, familyId),
      ),
    )
    .orderBy(desc(schema.rentalPayments.periodMonth));
}
