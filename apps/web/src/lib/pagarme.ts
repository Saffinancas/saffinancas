"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { BRAND } from "@/lib/brand";

/**
 * Adapter Pagar.me v5 em **modo simulado** até as chaves serem plugadas no .env.
 *
 * Quando `PAGARME_API_KEY` estiver setado:
 *   - createSubscription faz POST real em https://api.pagar.me/core/v5/subscriptions
 *   - webhooks são processados em /api/webhooks/pagarme
 *
 * Em modo sim:
 *   - createSubscription só promove o status pra 'active' com nextBillingAt = +30d
 *   - útil pra desenvolver o fluxo cliente sem precisar de cartão real
 */

const MODE = (process.env.PAGARME_API_KEY?.trim() ? "real" : "sim") as "sim" | "real";

export async function pagarmeMode(): Promise<"sim" | "real"> {
  return MODE;
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

  if (MODE === "real") {
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
    mode: MODE,
  };
}
