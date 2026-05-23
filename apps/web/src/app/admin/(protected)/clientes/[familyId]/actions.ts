"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { id as genId } from "@/lib/ids";

const ADMIN_ROLES = new Set(["admin", "operator", "support"]);

async function requireAdminId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado.");
  const role = (session.user as { role?: string }).role;
  if (!role || !ADMIN_ROLES.has(role)) throw new Error("Apenas administradores.");
  return session.user.id;
}

async function logAudit(opts: {
  adminId: string;
  familyId: string;
  action: typeof schema.auditAction.enumValues[number];
  metadata?: Record<string, unknown>;
}) {
  await db.insert(schema.auditLogs).values({
    id: genId("alog"),
    familyId: opts.familyId,
    actorUserId: opts.adminId,
    action: opts.action,
    targetType: "family",
    targetId: opts.familyId,
    metadata: opts.metadata ?? null,
  });
}

/**
 * Promove a família para plano gratuito vitalício (subscription.status='free').
 * Zera trial/past_due/blocked.
 */
export async function setFamilyFreePlan(familyId: string) {
  const adminId = await requireAdminId();
  const now = new Date();
  await db
    .update(schema.subscriptions)
    .set({
      status: "free",
      plan: "family-free",
      trialEndsAt: null,
      pastDueSince: null,
      blockedAt: null,
      canceledAt: null,
      nextBillingAt: null,
      updatedAt: now,
    })
    .where(eq(schema.subscriptions.familyId, familyId));
  await logAudit({
    adminId,
    familyId,
    action: "subscription_changed",
    metadata: { newStatus: "free", reason: "admin-comp" },
  });
  revalidatePath(`/admin/clientes/${familyId}`);
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/cobranca");
}

/**
 * Reverte a família do plano gratuito para o ciclo normal:
 *   - se trial original ainda faria sentido (<7d desde signup), volta pra trialing
 *   - caso contrário, marca past_due pra forçar adicionar cartão
 */
export async function revertFreeToNormal(familyId: string) {
  const adminId = await requireAdminId();
  const [sub] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.familyId, familyId))
    .limit(1);

  if (!sub) throw new Error("Família sem assinatura.");

  const now = new Date();
  // 7 dias contados do createdAt da subscription.
  const trialEndsAt = new Date(sub.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  const stillInTrial = now < trialEndsAt;

  await db
    .update(schema.subscriptions)
    .set({
      status: stillInTrial ? "trialing" : "past_due",
      plan: "family-monthly",
      trialEndsAt,
      pastDueSince: stillInTrial ? null : now,
      blockedAt: null,
      updatedAt: now,
    })
    .where(eq(schema.subscriptions.familyId, familyId));

  await logAudit({
    adminId,
    familyId,
    action: "subscription_changed",
    metadata: {
      newStatus: stillInTrial ? "trialing" : "past_due",
      reason: "admin-revert-from-free",
    },
  });
  revalidatePath(`/admin/clientes/${familyId}`);
  revalidatePath("/admin/clientes");
}

/** Admin escolhe qual provedor de IA usar pra esta família. */
export async function setFamilyAiProvider(
  familyId: string,
  provider: "claude" | "openai" | "gemini" | "auto",
) {
  const adminId = await requireAdminId();
  await db
    .update(schema.families)
    .set({ aiProvider: provider, updatedAt: new Date() })
    .where(eq(schema.families.id, familyId));
  await logAudit({
    adminId,
    familyId,
    action: "ai_provider_changed",
    metadata: { newProvider: provider },
  });
  revalidatePath(`/admin/clientes/${familyId}`);
}

/**
 * Admin habilita/desabilita o cliente usar a própria chave de API.
 *
 *  - Habilitar: cliente passa a ver a aba de BYOK e pode colar a chave dele.
 *    Antes disso, o cliente NEM SABE qual IA está sendo usada.
 *  - Desabilitar: também limpa byokProvider e byokApiKeyEnc — assim a chave
 *    do cliente não fica órfã no banco.
 */
export async function setFamilyByokEnabled(familyId: string, enabled: boolean) {
  const adminId = await requireAdminId();
  const update: Record<string, unknown> = {
    byokEnabled: enabled,
    updatedAt: new Date(),
  };
  if (!enabled) {
    update.byokProvider = null;
    update.byokApiKeyEnc = null;
  }
  await db.update(schema.families).set(update).where(eq(schema.families.id, familyId));
  await logAudit({
    adminId,
    familyId,
    action: "config_changed",
    metadata: { byokEnabled: enabled, clearedKey: !enabled },
  });
  revalidatePath(`/admin/clientes/${familyId}`);
  revalidatePath("/app/config/ia");
  revalidatePath("/app/config");
}

/** Admin remove manualmente a chave do cliente (BYOK continua habilitado). */
export async function clearFamilyByokKey(familyId: string) {
  const adminId = await requireAdminId();
  await db
    .update(schema.families)
    .set({ byokProvider: null, byokApiKeyEnc: null, updatedAt: new Date() })
    .where(eq(schema.families.id, familyId));
  await logAudit({
    adminId,
    familyId,
    action: "config_changed",
    metadata: { clearedByokKey: true },
  });
  revalidatePath(`/admin/clientes/${familyId}`);
  revalidatePath("/app/config/ia");
}
