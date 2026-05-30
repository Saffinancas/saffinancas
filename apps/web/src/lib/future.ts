"use server";

import { and, eq, gte, lt, asc } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { id as genId } from "@/lib/ids";

async function familyId(): Promise<string> {
  const s = await auth.api.getSession({ headers: await headers() });
  const fid = (s?.user as { familyId?: string | null })?.familyId;
  if (!fid) throw new Error("Sem família.");
  return fid;
}

export type FutureIncome = {
  id: string;
  name: string;
  kind: string;
  totalCents: number;
  expectedAt: string | null;
  notes: string | null;
  received: boolean;
  installments: Array<{
    id: string;
    sequence: number;
    amountCents: number;
    expectedAt: string;
    received: boolean;
  }>;
};

export type ForecastMonth = {
  monthIso: string;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  cumulativeCents: number;
};

export async function listFutureIncomes(): Promise<FutureIncome[]> {
  const fid = await familyId();
  const incomes = await db
    .select()
    .from(schema.futureIncomes)
    .where(eq(schema.futureIncomes.familyId, fid))
    .orderBy(asc(schema.futureIncomes.expectedAt));

  const ids = incomes.map((i) => i.id);
  const installments = ids.length
    ? await db
        .select()
        .from(schema.futureIncomeInstallments)
        .orderBy(asc(schema.futureIncomeInstallments.sequence))
    : [];

  return incomes.map((i) => ({
    id: i.id,
    name: i.name,
    kind: i.kind,
    totalCents: Number(i.totalCents),
    expectedAt: i.expectedAt?.toISOString() ?? null,
    notes: i.notes,
    received: !!i.receivedTransactionId,
    installments: installments
      .filter((inst) => inst.futureIncomeId === i.id)
      .map((inst) => ({
        id: inst.id,
        sequence: inst.sequence,
        amountCents: Number(inst.amountCents),
        expectedAt: inst.expectedAt.toISOString(),
        received: !!inst.receivedTransactionId,
      })),
  }));
}

export async function createFutureIncome(input: {
  name: string;
  kind: string;
  totalCents: number;
  expectedAt?: string | null;
  installments?: number;
  notes?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const fid = await familyId();
    const id = genId("fin");
    const expectedAt = input.expectedAt ? new Date(input.expectedAt) : null;

    await db.insert(schema.futureIncomes).values({
      id,
      familyId: fid,
      name: input.name,
      totalCents: input.totalCents,
      expectedAt,
      kind: input.kind,
      notes: input.notes ?? null,
    });

    // Se parcelado, cria as parcelas
    if (input.installments && input.installments > 1 && expectedAt) {
      const each = Math.floor(input.totalCents / input.installments);
      const remainder = input.totalCents - each * input.installments;
      for (let s = 1; s <= input.installments; s++) {
        const d = new Date(expectedAt);
        d.setMonth(d.getMonth() + (s - 1));
        await db.insert(schema.futureIncomeInstallments).values({
          id: genId("fii"),
          futureIncomeId: id,
          sequence: s,
          amountCents: s === input.installments ? each + remainder : each,
          expectedAt: d,
        });
      }
    }

    revalidatePath("/app/futuro");
    return { ok: true, id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro" };
  }
}

export async function markFutureReceived(
  futureIncomeId: string,
  installmentId?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const fid = await familyId();
    const [fi] = await db
      .select()
      .from(schema.futureIncomes)
      .where(and(eq(schema.futureIncomes.id, futureIncomeId), eq(schema.futureIncomes.familyId, fid)))
      .limit(1);
    if (!fi) return { ok: false, error: "Receita futura não encontrada." };

    if (installmentId) {
      const [inst] = await db
        .select()
        .from(schema.futureIncomeInstallments)
        .where(eq(schema.futureIncomeInstallments.id, installmentId))
        .limit(1);
      if (!inst || inst.futureIncomeId !== futureIncomeId) {
        return { ok: false, error: "Parcela inválida." };
      }
      const txId = genId("tx");
      await db.insert(schema.transactions).values({
        id: txId,
        familyId: fid,
        type: "income",
        amountCents: Number(inst.amountCents),
        currency: "BRL",
        description: `${fi.name} (${inst.sequence}/${fi.totalCents > 0 ? "?" : ""})`,
        occurredAt: new Date(),
        origin: "manual",
        status: "confirmed",
      });
      await db
        .update(schema.futureIncomeInstallments)
        .set({ receivedTransactionId: txId })
        .where(eq(schema.futureIncomeInstallments.id, installmentId));
    } else {
      const txId = genId("tx");
      await db.insert(schema.transactions).values({
        id: txId,
        familyId: fid,
        type: "income",
        amountCents: Number(fi.totalCents),
        currency: "BRL",
        description: fi.name,
        occurredAt: new Date(),
        origin: "manual",
        status: "confirmed",
      });
      await db
        .update(schema.futureIncomes)
        .set({ receivedTransactionId: txId, updatedAt: new Date() })
        .where(eq(schema.futureIncomes.id, futureIncomeId));
    }
    revalidatePath("/app/futuro");
    revalidatePath("/app/transacoes");
    revalidatePath("/app");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro" };
  }
}

export async function deleteFutureIncome(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const fid = await familyId();
    await db
      .delete(schema.futureIncomes)
      .where(and(eq(schema.futureIncomes.id, id), eq(schema.futureIncomes.familyId, fid)));
    revalidatePath("/app/futuro");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro" };
  }
}

/**
 * Projeção de fluxo de caixa para os próximos N meses.
 * Combina: previstos (planned_expenses) + receitas futuras (future_incomes + installments).
 */
export async function forecastCashflow(months = 12): Promise<ForecastMonth[]> {
  const fid = await familyId();
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);

  const [plans, incomes, installments] = await Promise.all([
    db
      .select()
      .from(schema.plannedExpenses)
      .where(
        and(
          eq(schema.plannedExpenses.familyId, fid),
          gte(schema.plannedExpenses.periodMonth, start),
          lt(schema.plannedExpenses.periodMonth, end),
        ),
      ),
    db
      .select()
      .from(schema.futureIncomes)
      .where(eq(schema.futureIncomes.familyId, fid)),
    db.select().from(schema.futureIncomeInstallments),
  ]);

  const futureIds = new Set(incomes.map((i) => i.id));

  const buckets: Map<string, ForecastMonth> = new Map();
  for (let i = 0; i < months; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    const key = d.toISOString().slice(0, 7);
    buckets.set(key, {
      monthIso: key,
      incomeCents: 0,
      expenseCents: 0,
      netCents: 0,
      cumulativeCents: 0,
    });
  }

  for (const p of plans) {
    if (p.status === "skipped" || p.status === "paid") continue;
    const key = new Date(p.periodMonth).toISOString().slice(0, 7);
    const b = buckets.get(key);
    if (!b) continue;
    if (p.type === "expense") b.expenseCents += Number(p.amountCents);
    else b.incomeCents += Number(p.amountCents);
  }

  for (const fi of incomes) {
    if (fi.receivedTransactionId) continue;
    const insts = installments.filter((x) => x.futureIncomeId === fi.id);
    if (insts.length > 0) {
      for (const inst of insts) {
        if (inst.receivedTransactionId) continue;
        const key = new Date(inst.expectedAt).toISOString().slice(0, 7);
        const b = buckets.get(key);
        if (!b) continue;
        b.incomeCents += Number(inst.amountCents);
      }
    } else if (fi.expectedAt) {
      const key = new Date(fi.expectedAt).toISOString().slice(0, 7);
      const b = buckets.get(key);
      if (b) b.incomeCents += Number(fi.totalCents);
    }
  }

  let cumulative = 0;
  const result: ForecastMonth[] = [];
  for (const b of buckets.values()) {
    b.netCents = b.incomeCents - b.expenseCents;
    cumulative += b.netCents;
    b.cumulativeCents = cumulative;
    result.push(b);
  }
  // suprime warnings
  void futureIds;
  return result;
}
