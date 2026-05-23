/**
 * Lógica de status de assinatura (trial / active / past_due / blocked).
 *
 * Regras (alinhadas com §4.11 do prompt-mestre + decisão do trial de 7 dias):
 *   - signup → status='trialing', trial_ends_at = now + 7 dias.
 *   - durante o trial → acesso normal, banner mostra contagem.
 *   - trial vence sem billing ativo → past_due (banner persistente vermelho).
 *   - past_due há > BRAND.pricing.blockAfterDay dias → status='blocked' (wall).
 *
 * Quando integrar Pagar.me de verdade, o webhook de `subscription.payment_succeeded`
 * promove pra 'active'; `subscription.payment_failed` cai pra 'past_due' direto.
 */
import type { Subscription } from "@cofre/db";
import { BRAND } from "@/lib/brand";

export type TrialState =
  | { kind: "trialing"; daysLeft: number }
  | { kind: "active"; nextBillingAt: Date | null }
  | { kind: "free" }
  | { kind: "past_due"; daysSince: number; daysUntilBlock: number }
  | { kind: "blocked"; daysSince: number }
  | { kind: "canceled" };

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function diffDays(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / MS_PER_DAY);
}

export function describeSubscription(sub: Subscription | null | undefined): TrialState {
  if (!sub) {
    // Sem registro → considerar trial expirando agora (defensivo).
    return { kind: "blocked", daysSince: 0 };
  }

  const now = new Date();

  if (sub.status === "active") {
    return { kind: "active", nextBillingAt: sub.nextBillingAt };
  }

  if (sub.status === "free") {
    return { kind: "free" };
  }

  if (sub.status === "canceled") {
    return { kind: "canceled" };
  }

  if (sub.status === "blocked") {
    const since = sub.blockedAt ?? sub.pastDueSince ?? sub.trialEndsAt ?? now;
    return { kind: "blocked", daysSince: Math.max(0, diffDays(now, since)) };
  }

  if (sub.status === "trialing") {
    const endsAt = sub.trialEndsAt;
    if (!endsAt) return { kind: "trialing", daysLeft: BRAND.pricing.trialDays };

    if (now < endsAt) {
      return { kind: "trialing", daysLeft: Math.max(0, diffDays(endsAt, now)) };
    }
    // Trial estourou — derivar past_due / blocked
    const daysSince = diffDays(now, endsAt);
    if (daysSince >= BRAND.pricing.blockAfterDay) {
      return { kind: "blocked", daysSince };
    }
    return {
      kind: "past_due",
      daysSince,
      daysUntilBlock: Math.max(0, BRAND.pricing.blockAfterDay - daysSince),
    };
  }

  // past_due explícito (do Pagar.me)
  const since = sub.pastDueSince ?? now;
  const daysSince = Math.max(0, diffDays(now, since));
  if (daysSince >= BRAND.pricing.blockAfterDay) {
    return { kind: "blocked", daysSince };
  }
  return {
    kind: "past_due",
    daysSince,
    daysUntilBlock: Math.max(0, BRAND.pricing.blockAfterDay - daysSince),
  };
}

export function isBlocked(state: TrialState): boolean {
  return state.kind === "blocked" || state.kind === "canceled";
}
