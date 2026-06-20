"use client";

import Link from "next/link";
import * as React from "react";
import { Check, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  "Captura ilimitada do grupo do WhatsApp",
  "Classificação por Claude, OpenAI ou Gemini",
  "Dashboard mensal e histórico 12 meses",
  "Checklist mensal + metas + receitas futuras",
  "Open Finance via Pluggy (Nubank, Inter, Itaú, BB…)",
  "Dark mode, mobile, exportação CSV",
  "Suporte por WhatsApp em horário comercial",
];

type Props = {
  monthly: number;
  annualEquivalent: number;
  annual: number;
  annualSavings: number;
  discountPct: number;
  trialDays: number;
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PricingCard({
  monthly,
  annualEquivalent,
  annual,
  annualSavings,
  discountPct,
  trialDays,
}: Props) {
  const [cycle, setCycle] = React.useState<"monthly" | "annual">("monthly");
  const displayValue = cycle === "monthly" ? fmt(monthly) : fmt(annualEquivalent);

  return (
    <>
      <div className="scroll-fade mx-auto max-w-3xl px-4 text-center sm:px-6">
        <p className="eyebrow mx-auto">Preço</p>
        <h2 className="section-h2 mx-auto">
          Um plano.{" "}
          <span className="display-serif italic font-normal">Família inteira.</span>
        </h2>
        <p className="mt-4 text-[15px] text-[var(--color-fg-muted)]">
          Sem pegadinha de &ldquo;premium&rdquo;. Sem cobrar por membro do grupo.{" "}
          {trialDays} dias de garantia integral.
        </p>

        <div
          role="tablist"
          aria-label="Ciclo de cobrança"
          className="mx-auto mt-8 inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-soft backdrop-blur-sm"
        >
          {(
            [
              { key: "monthly", label: "Mensal" },
              { key: "annual", label: `Anual · −${discountPct}%` },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              role="tab"
              aria-selected={cycle === opt.key}
              onClick={() => setCycle(opt.key)}
              className={
                "rounded-full px-5 py-2 text-sm font-medium transition-all duration-200 " +
                (cycle === opt.key
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-pop"
                  : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]")
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mx-auto mt-12 max-w-md px-4 sm:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-6 -z-10 rounded-[36px] bg-gradient-to-br from-[var(--color-primary)]/40 via-[var(--color-income)]/15 to-[var(--color-warning)]/20 opacity-60 blur-2xl"
        />

        <div className="relative isolate overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-pop">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-income)] to-[var(--color-warning)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 -right-20 h-72 w-72 rounded-full bg-[var(--color-primary-soft)] blur-3xl opacity-70"
          />

          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-fg-muted)]">
                Plano Família
              </p>
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)]/60 px-2 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
                <Sparkles className="h-3 w-3" /> + IA inclusa
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="display-serif num text-6xl tracking-tight text-[var(--color-fg)]">
                R$ {displayValue}
              </span>
              <span className="text-sm text-[var(--color-fg-muted)]">/mês</span>
            </div>
            {cycle === "annual" && (
              <p className="mt-1 text-xs text-[var(--color-fg-subtle)]">
                Cobrança anual única de R$ {fmt(annual)} · economize R$ {fmt(annualSavings)}
              </p>
            )}

            <Button asChild size="lg" className="mt-7 w-full group shadow-pop">
              <Link href="/assinar">
                Começar com {trialDays} dias de garantia
              </Link>
            </Button>

            <div className="mt-8 border-t border-[var(--color-border)] pt-6">
              <ul className="space-y-3">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[14px]">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--color-income-soft)] text-[var(--color-income)]">
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="text-[var(--color-fg)]">{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-7 flex items-start gap-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-3 text-xs text-[var(--color-fg-muted)]">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" />
              Pagamento processado pelo Pagar.me. Não armazenamos dados do cartão.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
