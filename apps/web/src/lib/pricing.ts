"use server";

/**
 * Preço da plataforma — fonte de verdade.
 *
 * Lê de `platform_settings`:
 *   - pricing.monthly_cents (int)      → mensalidade em centavos
 *   - pricing.annual_discount_pct (int 0-100) → desconto sobre 12x mensal
 *
 * Fallback pra constantes em BRAND quando não setado.
 *
 * Anual é DERIVADO: `monthly * 12 * (1 - discount/100)`. Não armazena anual
 * direto pra evitar inconsistência.
 */
import { getPlatformSetting } from "@/lib/platform-settings";
import { BRAND } from "@/lib/brand";

export type Pricing = {
  /** Mensal em centavos (BRL). */
  monthlyCents: number;
  /** Anual em centavos (BRL) — derivado. */
  annualCents: number;
  /** Equivalente mensal do plano anual em centavos. */
  annualEquivalentCents: number;
  /** Desconto percentual aplicado sobre 12× mensal (0-100). */
  annualDiscountPct: number;
  /** Quanto se economiza no anual vs 12× mensal (centavos). */
  annualSavingsCents: number;
  /** Dias de trial — vem do BRAND. */
  trialDays: number;
};

export async function getPricing(): Promise<Pricing> {
  let rawMonthly: string | null = null;
  let rawDiscount: string | null = null;
  try {
    [rawMonthly, rawDiscount] = await Promise.all([
      getPlatformSetting("pricing.monthly_cents"),
      getPlatformSetting("pricing.annual_discount_pct"),
    ]);
  } catch {
    // Banco indisponível (ex.: durante prerender do build): usa fallback do BRAND.
    // Nunca deixar o preço derrubar a renderização de páginas estáticas.
  }

  const monthlyCents =
    parsePositiveInt(rawMonthly) ?? Math.round(BRAND.pricing.monthlyBRL * 100);
  const discount = clampPct(
    parsePositiveInt(rawDiscount) ??
      computeDefaultDiscount(BRAND.pricing.monthlyBRL, BRAND.pricing.annualBRL),
  );
  const annualCents = Math.round(monthlyCents * 12 * (1 - discount / 100));
  const annualEquivalentCents = Math.round(annualCents / 12);
  const annualSavingsCents = monthlyCents * 12 - annualCents;

  return {
    monthlyCents,
    annualCents,
    annualEquivalentCents,
    annualDiscountPct: discount,
    annualSavingsCents,
    trialDays: BRAND.pricing.trialDays,
  };
}

function parsePositiveInt(s: string | null): number | null {
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function clampPct(n: number): number {
  if (n < 0) return 0;
  if (n > 95) return 95;
  return n;
}

function computeDefaultDiscount(monthlyBRL: number, annualBRL: number): number {
  if (!monthlyBRL || !annualBRL) return 20;
  const eq = annualBRL / 12;
  const pct = Math.round((1 - eq / monthlyBRL) * 100);
  return clampPct(pct);
}

