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

export type PlannedItem = {
  id: string;
  name: string;
  amountCents: number;
  type: "expense" | "income";
  categoryId: string | null;
  categoryName: string | null;
  dueDay: number;
  recurrence: "once" | "monthly" | "annual";
  status: "to_pay" | "paid" | "overdue" | "skipped";
  paidTransactionId: string | null;
  notes: string | null;
};

export type MonthSummary = {
  monthIso: string;
  toPayCents: number;
  paidCents: number;
  overdueCents: number;
  totalExpenseCents: number;
  totalIncomeCents: number;
  items: PlannedItem[];
};

export async function listPlannedForMonth(monthIso?: string): Promise<MonthSummary> {
  const fid = await familyId();
  const now = monthIso ? new Date(monthIso) : new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const today = new Date();

  const rows = await db
    .select({
      pe: schema.plannedExpenses,
      cat: schema.categories,
    })
    .from(schema.plannedExpenses)
    .leftJoin(schema.categories, eq(schema.categories.id, schema.plannedExpenses.categoryId))
    .where(
      and(
        eq(schema.plannedExpenses.familyId, fid),
        gte(schema.plannedExpenses.periodMonth, start),
        lt(schema.plannedExpenses.periodMonth, end),
      ),
    )
    .orderBy(asc(schema.plannedExpenses.dueDay));

  // Marca overdue dinamicamente se vencimento passou e não foi pago
  const items: PlannedItem[] = rows.map(({ pe, cat }) => {
    let st = pe.status;
    if (st === "to_pay") {
      const due = new Date(start.getFullYear(), start.getMonth(), pe.dueDay);
      if (due < today && start.getMonth() === today.getMonth()) st = "overdue";
    }
    return {
      id: pe.id,
      name: pe.name,
      amountCents: pe.amountCents,
      type: pe.type,
      categoryId: pe.categoryId,
      categoryName: cat?.name ?? null,
      dueDay: pe.dueDay,
      recurrence: pe.recurrence,
      status: st,
      paidTransactionId: pe.paidTransactionId,
      notes: pe.notes,
    };
  });

  let toPay = 0;
  let paid = 0;
  let overdue = 0;
  let totalExp = 0;
  let totalInc = 0;
  for (const i of items) {
    if (i.status === "to_pay") toPay += i.amountCents;
    else if (i.status === "paid") paid += i.amountCents;
    else if (i.status === "overdue") overdue += i.amountCents;
    if (i.type === "expense") totalExp += i.amountCents;
    else totalInc += i.amountCents;
  }

  return {
    monthIso: start.toISOString().slice(0, 7),
    toPayCents: toPay,
    paidCents: paid,
    overdueCents: overdue,
    totalExpenseCents: totalExp,
    totalIncomeCents: totalInc,
    items,
  };
}

export async function createPlanned(input: {
  name: string;
  amountCents: number;
  type?: "expense" | "income";
  categoryId?: string | null;
  dueDay: number;
  recurrence?: "once" | "monthly" | "annual";
  monthIso?: string;
  notes?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const fid = await familyId();
    const period = input.monthIso ? new Date(input.monthIso + "-01") : new Date();
    const start = new Date(period.getFullYear(), period.getMonth(), 1);
    const id = genId("pln");
    await db.insert(schema.plannedExpenses).values({
      id,
      familyId: fid,
      name: input.name,
      amountCents: input.amountCents,
      type: input.type ?? "expense",
      categoryId: input.categoryId ?? null,
      dueDay: Math.max(1, Math.min(31, Math.floor(input.dueDay))),
      periodMonth: start,
      recurrence: input.recurrence ?? "monthly",
      status: "to_pay",
      notes: input.notes ?? null,
    });
    revalidatePath("/app/previsto");
    return { ok: true, id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro" };
  }
}

export async function markPlannedPaid(
  plannedId: string,
  opts: { paidAt?: string; paidAmountCents?: number } = {},
): Promise<{ ok: true; transactionId: string } | { ok: false; error: string }> {
  try {
    const fid = await familyId();
    const [pe] = await db
      .select()
      .from(schema.plannedExpenses)
      .where(and(eq(schema.plannedExpenses.id, plannedId), eq(schema.plannedExpenses.familyId, fid)))
      .limit(1);
    if (!pe) return { ok: false, error: "Item não encontrado." };
    if (pe.status === "paid" && pe.paidTransactionId) {
      return { ok: false, error: "Item já pago." };
    }

    const txId = genId("tx");
    const occurredAt = opts.paidAt ? new Date(opts.paidAt) : new Date();
    const amount = opts.paidAmountCents ?? pe.amountCents;

    await db.insert(schema.transactions).values({
      id: txId,
      familyId: fid,
      type: pe.type,
      amountCents: amount,
      currency: "BRL",
      description: pe.name,
      occurredAt,
      origin: "manual",
      status: "confirmed",
      categoryId: pe.categoryId,
      plannedExpenseId: plannedId,
    });

    await db
      .update(schema.plannedExpenses)
      .set({ status: "paid", paidTransactionId: txId, updatedAt: new Date() })
      .where(eq(schema.plannedExpenses.id, plannedId));

    revalidatePath("/app/previsto");
    revalidatePath("/app/transacoes");
    revalidatePath("/app");
    return { ok: true, transactionId: txId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro" };
  }
}

export async function unmarkPlannedPaid(plannedId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const fid = await familyId();
    const [pe] = await db
      .select()
      .from(schema.plannedExpenses)
      .where(and(eq(schema.plannedExpenses.id, plannedId), eq(schema.plannedExpenses.familyId, fid)))
      .limit(1);
    if (!pe?.paidTransactionId) return { ok: false, error: "Item não está marcado como pago." };

    await db
      .delete(schema.transactions)
      .where(eq(schema.transactions.id, pe.paidTransactionId));
    await db
      .update(schema.plannedExpenses)
      .set({ status: "to_pay", paidTransactionId: null, updatedAt: new Date() })
      .where(eq(schema.plannedExpenses.id, plannedId));
    revalidatePath("/app/previsto");
    revalidatePath("/app/transacoes");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro" };
  }
}

export async function skipPlanned(plannedId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const fid = await familyId();
    await db
      .update(schema.plannedExpenses)
      .set({ status: "skipped", updatedAt: new Date() })
      .where(and(eq(schema.plannedExpenses.id, plannedId), eq(schema.plannedExpenses.familyId, fid)));
    revalidatePath("/app/previsto");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro" };
  }
}

export async function deletePlanned(plannedId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const fid = await familyId();
    await db
      .delete(schema.plannedExpenses)
      .where(and(eq(schema.plannedExpenses.id, plannedId), eq(schema.plannedExpenses.familyId, fid)));
    revalidatePath("/app/previsto");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro" };
  }
}

/**
 * Cron mensal (dia 1): pra cada item de mês anterior com recurrence != "once",
 * cria uma cópia no mês corrente. Idempotente.
 */
export async function rolloverPlannedForMonth(monthIso?: string): Promise<{ created: number }> {
  const now = monthIso ? new Date(monthIso + "-01") : new Date();
  const thisStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevEnd = thisStart;

  const previous = await db
    .select()
    .from(schema.plannedExpenses)
    .where(
      and(
        gte(schema.plannedExpenses.periodMonth, prevStart),
        lt(schema.plannedExpenses.periodMonth, prevEnd),
      ),
    );

  let created = 0;
  for (const p of previous) {
    if (p.recurrence === "once") continue;
    if (p.recurrence === "annual" && now.getMonth() !== prevStart.getMonth()) continue;

    // Já existe item igual nesse mês?
    const exists = await db
      .select({ id: schema.plannedExpenses.id })
      .from(schema.plannedExpenses)
      .where(
        and(
          eq(schema.plannedExpenses.familyId, p.familyId),
          eq(schema.plannedExpenses.name, p.name),
          gte(schema.plannedExpenses.periodMonth, thisStart),
          lt(schema.plannedExpenses.periodMonth, new Date(thisStart.getFullYear(), thisStart.getMonth() + 1, 1)),
        ),
      )
      .limit(1);
    if (exists[0]) continue;

    await db.insert(schema.plannedExpenses).values({
      id: genId("pln"),
      familyId: p.familyId,
      name: p.name,
      amountCents: p.amountCents,
      type: p.type,
      categoryId: p.categoryId,
      dueDay: p.dueDay,
      periodMonth: thisStart,
      recurrence: p.recurrence,
      status: "to_pay",
      notes: p.notes,
    });
    created++;
  }
  return { created };
}
