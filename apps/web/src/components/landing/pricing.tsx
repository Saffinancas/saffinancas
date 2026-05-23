"use client";

import Link from "next/link";
import * as React from "react";
import { Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

const features = [
  "Captura ilimitada do grupo do WhatsApp",
  "Classificação por Claude, OpenAI ou Gemini",
  "Dashboard mensal e histórico 12 meses",
  "Checklist mensal + metas + receitas futuras",
  "Open Finance via Pluggy (Nubank, Inter, Itaú, BB…)",
  "Dark mode, mobile, exportação CSV",
  "Suporte por WhatsApp em horário comercial",
];

export function Pricing() {
  const [cycle, setCycle] = React.useState<"monthly" | "annual">("monthly");

  const monthly = BRAND.pricing.monthlyBRL;
  const annual = BRAND.pricing.annualBRL;
  const annualEquivalent = annual / 12;
  const savings = Math.round((1 - annualEquivalent / monthly) * 100);

  return (
    <section id="precos" className="border-t border-[var(--color-border)] bg-[var(--color-bg-muted)] py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-primary)]">
          Preço
        </p>
        <h2 className="mt-2 text-balance text-3xl tracking-tight sm:text-4xl">
          Um plano. <span className="display-serif italic">Família inteira.</span>
        </h2>
        <p className="mt-3 text-[15px] text-[var(--color-fg-muted)]">
          Sem pegadinha de &ldquo;premium&rdquo;. Sem cobrar por membro do grupo.{" "}
          {BRAND.pricing.trialDays} dias de garantia integral.
        </p>

        <div
          role="tablist"
          aria-label="Ciclo de cobrança"
          className="mx-auto mt-7 inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-soft"
        >
          {(
            [
              { key: "monthly", label: "Mensal" },
              { key: "annual", label: `Anual · −${savings}%` },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              role="tab"
              aria-selected={cycle === opt.key}
              onClick={() => setCycle(opt.key)}
              className={
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors " +
                (cycle === opt.key
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-soft"
                  : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]")
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-md px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-pop">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-[var(--color-primary-soft)] blur-3xl opacity-70"
          />

          <div className="relative">
            <p className="text-sm text-[var(--color-fg-muted)]">Plano Família</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="display-serif tabular text-5xl text-[var(--color-fg)]">
                R$ {cycle === "monthly" ? monthly.toFixed(2).replace(".", ",") : annualEquivalent.toFixed(2).replace(".", ",")}
              </span>
              <span className="text-sm text-[var(--color-fg-muted)]">
                /mês
              </span>
            </div>
            {cycle === "annual" && (
              <p className="mt-1 text-xs text-[var(--color-fg-subtle)]">
                Cobrança anual única de R$ {annual.toFixed(2).replace(".", ",")}
              </p>
            )}

            <Button asChild size="lg" className="mt-6 w-full">
              <Link href="/assinar">Começar com {BRAND.pricing.trialDays} dias de garantia</Link>
            </Button>

            <ul className="mt-7 space-y-3">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[14px]">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="text-[var(--color-fg)]">{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7 flex items-start gap-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-3 text-xs text-[var(--color-fg-muted)]">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" />
              Pagamento processado pelo Pagar.me. Não armazenamos dados do cartão.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
