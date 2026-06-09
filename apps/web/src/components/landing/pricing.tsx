import { getPricing } from "@/lib/pricing";
import { PricingCard } from "./pricing-card";

export async function Pricing() {
  const p = await getPricing();

  return (
    <section
      id="precos"
      className="relative overflow-hidden border-t border-[var(--color-border)] bg-[var(--color-bg-muted)] py-20 sm:py-28"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-1/3 top-10 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-[var(--color-primary)]/12 blur-[120px]" />
        <div className="absolute right-1/3 bottom-10 h-[300px] w-[300px] translate-x-1/2 rounded-full bg-[var(--color-income)]/10 blur-[100px]" />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.02] [background-image:linear-gradient(var(--color-fg)_1px,transparent_1px),linear-gradient(90deg,var(--color-fg)_1px,transparent_1px)] [background-size:40px_40px]"
      />

      <PricingCard
        monthly={p.monthlyCents / 100}
        annualEquivalent={p.annualEquivalentCents / 100}
        annual={p.annualCents / 100}
        annualSavings={p.annualSavingsCents / 100}
        discountPct={p.annualDiscountPct}
        trialDays={p.trialDays}
      />
    </section>
  );
}
