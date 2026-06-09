"use client";

import * as React from "react";
import { Loader2, Check, AlertCircle, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BentoCard, ProgressRing } from "@/components/ui/bento";
import { updatePricingAction } from "./actions";

type Props = {
  initial: {
    monthlyCents: number;
    annualDiscountPct: number;
  };
};

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseInputToCents(s: string): number {
  // Aceita "29,90", "29.90", "29", "R$ 29,90"
  const clean = s.replace(/[^\d,.-]/g, "").replace(",", ".");
  const n = Number(clean);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function PricingClient({ initial }: Props) {
  const [monthly, setMonthly] = React.useState(fmtBRL(initial.monthlyCents));
  const [discount, setDiscount] = React.useState(String(initial.annualDiscountPct));
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  // Cálculos live
  const monthlyCents = parseInputToCents(monthly);
  const discountPct = Math.max(0, Math.min(95, Number(discount) || 0));
  const yearlyCents = Math.round(monthlyCents * 12 * (1 - discountPct / 100));
  const yearlyEquivCents = Math.round(yearlyCents / 12);
  const savingsCents = monthlyCents * 12 - yearlyCents;

  const changed =
    monthlyCents !== initial.monthlyCents || discountPct !== initial.annualDiscountPct;

  function onSave() {
    setError(null);
    setSaved(false);
    if (monthlyCents < 100) {
      setError("Mensalidade mínima: R$ 1,00.");
      return;
    }
    startTransition(async () => {
      const r = await updatePricingAction({ monthlyCents, annualDiscountPct: discountPct });
      if (!r.ok) {
        setError(r.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    });
  }

  function onReset() {
    setMonthly(fmtBRL(initial.monthlyCents));
    setDiscount(String(initial.annualDiscountPct));
    setError(null);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.25fr]">
      {/* Formulário */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-soft">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
          Edição
        </p>
        <h3 className="mt-1 text-lg font-semibold tracking-tight">
          Mensalidade <span className="display-serif italic">+ desconto anual</span>
        </h3>

        <div className="mt-5 space-y-4">
          {/* Mensal */}
          <div>
            <Label htmlFor="monthly" className="text-xs">
              Mensalidade
            </Label>
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--color-fg-muted)]">
                R$
              </span>
              <Input
                id="monthly"
                inputMode="decimal"
                value={monthly}
                onChange={(e) => setMonthly(e.target.value)}
                placeholder="29,90"
                className="num pl-10 text-base font-medium"
              />
            </div>
            <p className="mt-1 text-[11px] text-[var(--color-fg-subtle)]">
              Cobrança recorrente mensal — em centavos: {monthlyCents}
            </p>
          </div>

          {/* Desconto anual */}
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="discount" className="text-xs">
                Desconto no plano anual
              </Label>
              <span className="num text-sm font-semibold tabular text-[var(--color-primary)]">
                {discountPct}%
              </span>
            </div>
            <input
              id="discount"
              type="range"
              min={0}
              max={50}
              step={1}
              value={discountPct}
              onChange={(e) => setDiscount(e.target.value)}
              className="mt-2 w-full accent-[var(--color-primary)]"
            />
            <div className="mt-1 flex justify-between text-[10px] text-[var(--color-fg-subtle)]">
              <span>0%</span>
              <span>15%</span>
              <span>30%</span>
              <span>50%</span>
            </div>
            <p className="mt-2 text-[11px] text-[var(--color-fg-subtle)]">
              Padrão de mercado: 15–25%. Acima de 30% sinaliza desespero.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button onClick={onSave} disabled={pending || !changed}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4 text-[var(--color-income)]" />
            ) : null}
            {saved ? "Salvo" : "Salvar preços"}
          </Button>
          {changed && (
            <Button variant="ghost" onClick={onReset} disabled={pending}>
              Descartar
            </Button>
          )}
          {!changed && (
            <Badge variant="default" className="text-[10px]">
              Sem alterações
            </Badge>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-[var(--radius)] border border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)] p-3 text-xs text-[var(--color-expense)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="space-y-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
          Preview · cliente vê
        </p>

        <div className="grid grid-cols-2 gap-3">
          <BentoCard
            tone="primary"
            eyebrow="Plano mensal"
            metric={
              <span className="num">
                <span className="text-sm font-normal text-[var(--color-fg-muted)] align-top mr-1">
                  R$
                </span>
                {fmtBRL(monthlyCents)}
              </span>
            }
            footnote="/mês · cobrança recorrente"
          />

          <BentoCard
            tone="income"
            eyebrow={
              <span className="inline-flex items-center gap-1.5">
                Plano anual <Badge variant="income" className="text-[9px]">−{discountPct}%</Badge>
              </span>
            }
            metric={
              <span className="num">
                <span className="text-sm font-normal text-[var(--color-fg-muted)] align-top mr-1">
                  R$
                </span>
                {fmtBRL(yearlyEquivCents)}
              </span>
            }
            footnote={
              <span>
                /mês · R$ {fmtBRL(yearlyCents)} à vista
              </span>
            }
          />
        </div>

        <BentoCard
          tone="income"
          eyebrow="Economia anual"
          title={
            <span className="inline-flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-[var(--color-income)]" />
              Quanto o cliente economiza pagando o ano
            </span>
          }
          metric={
            <span className="num">
              <span className="text-sm font-normal text-[var(--color-fg-muted)] align-top mr-1">
                R$
              </span>
              {fmtBRL(savingsCents)}
            </span>
          }
          footnote={`12× mensal seria R$ ${fmtBRL(monthlyCents * 12)} · ano sai por R$ ${fmtBRL(yearlyCents)}`}
        >
          <div className="mt-2 flex items-center gap-4">
            <ProgressRing
              value={discountPct * 2 /* visual: 50% = ring cheio */}
              label="desconto"
              color="var(--color-income)"
              size={84}
            />
            <ul className="space-y-1.5 text-[12px]">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-fg-subtle)]" />
                <span className="text-[var(--color-fg-muted)]">12× mensal:</span>
                <span className="num font-medium tabular">R$ {fmtBRL(monthlyCents * 12)}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-income)]" />
                <span className="text-[var(--color-fg-muted)]">Anual:</span>
                <span className="num font-medium tabular text-[var(--color-income)]">
                  R$ {fmtBRL(yearlyCents)}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
                <span className="text-[var(--color-fg-muted)]">Equivalente mensal:</span>
                <span className="num font-medium tabular text-[var(--color-primary)]">
                  R$ {fmtBRL(yearlyEquivCents)}
                </span>
              </li>
            </ul>
          </div>
        </BentoCard>
      </div>
    </div>
  );
}
