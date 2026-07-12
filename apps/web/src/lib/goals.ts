"use server";

import { and, eq, isNull, desc, sql } from "drizzle-orm";
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

export type Goal = {
  id: string;
  name: string;
  targetCents: number;
  savedCents: number;
  deadline: string | null;
  iconUrl: string | null;
  notes: string | null;
  externalLinks: Array<{ label: string; url: string }>;
  /** Quantos meses faltam ao ritmo atual; null se sem deadline ou ritmo zero. */
  monthsToTarget: number | null;
  /** Aporte médio últimos 90 dias. */
  avgMonthlyContribCents: number;
  progress: number;
  createdAt: string;
};

export async function listGoals(): Promise<Goal[]> {
  const fid = await familyId();
  const rows = await db
    .select()
    .from(schema.goals)
    .where(and(eq(schema.goals.familyId, fid), isNull(schema.goals.archivedAt), isNull(schema.goals.deletedAt)))
    .orderBy(desc(schema.goals.createdAt));

  return rows.map((r) => {
    const target = Number(r.targetCents);
    const saved = Number(r.savedCents);
    const progress = target > 0 ? Math.min(1, saved / target) : 0;
    // Cálculo bem simples: usa savedCents/idadeEmMeses como proxy do ritmo
    const ageMonths = Math.max(
      1,
      (Date.now() - new Date(r.createdAt).getTime()) / (30 * 24 * 3600 * 1000),
    );
    const avgMonth = Math.round(saved / ageMonths);
    const monthsToTarget =
      target > saved && avgMonth > 0 ? Math.ceil((target - saved) / avgMonth) : null;

    return {
      id: r.id,
      name: r.name,
      targetCents: target,
      savedCents: saved,
      deadline: r.deadline?.toISOString() ?? null,
      iconUrl: r.iconUrl,
      notes: r.notes,
      externalLinks: r.externalLinks ?? [],
      monthsToTarget,
      avgMonthlyContribCents: avgMonth,
      progress,
      createdAt: r.createdAt.toISOString(),
    };
  });
}

export async function createGoal(input: {
  name: string;
  targetCents: number;
  deadline?: string | null;
  iconUrl?: string | null;
  notes?: string | null;
  externalLinks?: Array<{ label: string; url: string }>;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const fid = await familyId();
    const id = genId("gol");
    await db.insert(schema.goals).values({
      id,
      familyId: fid,
      name: input.name,
      targetCents: input.targetCents,
      savedCents: 0,
      deadline: input.deadline ? new Date(input.deadline) : null,
      iconUrl: input.iconUrl ?? null,
      notes: input.notes ?? null,
      externalLinks: input.externalLinks ?? null,
    });
    revalidatePath("/app/metas");
    return { ok: true, id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro" };
  }
}

export async function depositToGoal(
  goalId: string,
  amountCents: number,
): Promise<{ ok: true; newSavedCents: number } | { ok: false; error: string }> {
  try {
    const fid = await familyId();
    // UPDATE atômico via expressão SQL — evita lost update quando dois
    // depósitos concorrentes (double-click, app + WhatsApp) rodam ao
    // mesmo tempo. O WHERE já garante posse + isolamento por família.
    const rows = await db
      .update(schema.goals)
      .set({
        savedCents: sql`${schema.goals.savedCents} + ${amountCents}`,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.goals.id, goalId), eq(schema.goals.familyId, fid)))
      .returning({ savedCents: schema.goals.savedCents });
    if (rows.length === 0) return { ok: false, error: "Meta não encontrada." };
    revalidatePath("/app/metas");
    return { ok: true, newSavedCents: Number(rows[0]!.savedCents) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro" };
  }
}

export async function withdrawFromGoal(
  goalId: string,
  amountCents: number,
): Promise<{ ok: true; newSavedCents: number } | { ok: false; error: string }> {
  return depositToGoal(goalId, -Math.abs(amountCents));
}

export async function archiveGoal(goalId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const fid = await familyId();
    await db
      .update(schema.goals)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(schema.goals.id, goalId), eq(schema.goals.familyId, fid)));
    revalidatePath("/app/metas");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro" };
  }
}
