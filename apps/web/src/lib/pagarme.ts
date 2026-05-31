"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { getPlatformSetting } from "@/lib/platform-settings";

/**
 * Adapter Pagar.me v5 em **modo simulado** até as chaves serem plugadas.
 *
 * Quando `pagarme.api_key` (platform_settings ou env PAGARME_API_KEY) estiver
 * setado, o modo passa pra "real". Webhooks são processados em
 * /api/webhooks/pagarme.
 */

export async function pagarmeMode(): Promise<"sim" | "real"> {
  const k = await getPlatformSetting("pagarme.api_key");
  return k?.trim() ? "real" : "sim";
}

type CardSim = {
  number: string;
  holder: string;
  expMonth: number;
  expYear: number;
  cvv: string;
};

export async function attachCardAndActivate(card: CardSim): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { ok: false, error: "Não autenticado." };
  const u = session.user as { familyId?: string | null };
  if (!u.familyId) return { ok: false, error: "Sem família." };

  // Validação superficial — em prod o Pagar.me valida.
  if (card.number.replace(/\D/g, "").length < 13) {
    return { ok: false, error: "Número de cartão inválido." };
  }

  const mode = await pagarmeMode();
  if (mode === "real") {
    // TODO: chamada real ao Pagar.me v5 — criar customer, card, subscription.
    // Stub para não quebrar build.
    return { ok: false, error: "Pagar.me real ainda não implementado nesta release." };
  }

  // SIM
  const now = new Date();
  const nextBilling = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  await db
    .update(schema.subscriptions)
    .set({
      status: "active",
      pagarmeCustomerId: "cus_sim_" + Math.random().toString(36).slice(2, 10),
      pagarmeSubscriptionId: "sub_sim_" + Math.random().toString(36).slice(2, 10),
      nextBillingAt: nextBilling,
      trialEndsAt: now, // marca trial como encerrado
      pastDueSince: null,
      blockedAt: null,
      updatedAt: now,
    })
    .where(eq(schema.subscriptions.familyId, u.familyId));
  revalidatePath("/app");
  revalidatePath("/app/cobranca");
  return { ok: true };
}

export async function getPricingForBrand() {
  return {
    monthly: BRAND.pricing.monthlyBRL,
    annual: BRAND.pricing.annualBRL,
    trialDays: BRAND.pricing.trialDays,
    mode: await pagarmeMode(),
  };
}
