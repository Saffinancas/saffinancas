"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, gte, sql } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { id as genId } from "@/lib/ids";
import { AI_PRICES, estimateCostCents, AVG_INPUT_TOKENS, AVG_OUTPUT_TOKENS } from "@/lib/ai-pricing";

const ADMIN_ROLES = new Set(["admin", "operator", "support"]);

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado.");
  const role = (session.user as { role?: string }).role;
  if (!role || !ADMIN_ROLES.has(role)) throw new Error("Apenas administradores.");
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/**
 * Insere `ai_usage_events` sintéticos pro mês corrente, distribuídos entre as
 * famílias existentes. Pra ver o relatório vivo antes do pipeline de IA estar
 * de fato classificando.
 */
export async function generateDemoUsage(): Promise<{ inserted: number; families: number }> {
  await requireAdmin();
  const families = await db.select().from(schema.families);

  if (families.length === 0) {
    return { inserted: 0, families: 0 };
  }

  const monthStart = startOfMonth(new Date());
  const now = new Date();
  const rows = [];

  for (const fam of families) {
    const provider =
      fam.aiProvider === "auto" ? "claude" : (fam.aiProvider as keyof typeof AI_PRICES);
    if (!provider) continue;
    // Entre 30 e 200 chamadas no mês.
    const n = 30 + Math.floor(Math.random() * 170);
    for (let i = 0; i < n; i++) {
      const inputTokens = AVG_INPUT_TOKENS + Math.floor(Math.random() * 200 - 100);
      const outputTokens = AVG_OUTPUT_TOKENS + Math.floor(Math.random() * 80 - 40);
      const created = new Date(
        monthStart.getTime() + Math.random() * (now.getTime() - monthStart.getTime()),
      );
      rows.push({
        id: genId("aiu"),
        familyId: fam.id,
        provider,
        model: AI_PRICES[provider].model,
        inputTokens,
        outputTokens,
        costCents: estimateCostCents(provider, inputTokens, outputTokens),
        createdAt: created,
      });
    }
  }

  // Insert em batches pra evitar query gigante.
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    await db.insert(schema.aiUsageEvents).values(rows.slice(i, i + BATCH));
  }

  revalidatePath("/admin/uso-ia");
  revalidatePath("/admin/clientes");
  return { inserted: rows.length, families: families.length };
}

export async function clearDemoUsage(): Promise<void> {
  await requireAdmin();
  const monthStart = startOfMonth(new Date());
  await db
    .delete(schema.aiUsageEvents)
    .where(and(gte(schema.aiUsageEvents.createdAt, monthStart)));
  revalidatePath("/admin/uso-ia");
  revalidatePath("/admin/clientes");
}
