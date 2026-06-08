"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CircleHelp,
  Download,
  Info,
  Sparkles,
  Stethoscope,
  GraduationCap,
  Heart,
  HandCoins,
  Users,
  Wallet,
  Building2,
  Bitcoin,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Section } from "@/components/ui/page-header";
import { formatBRL } from "@/lib/utils";
import {
  IR_BUCKET_INFO,
  marginalRate,
  type IRBucket,
} from "@/lib/ir-constants";
import type { IRReport } from "@/lib/ir";

const BUCKET_ICONS: Partial<Record<IRBucket, React.ComponentType<{ className?: string }>>> = {
  deductible_health: Stethoscope,
  deductible_education: GraduationCap,
  deductible_pension: Heart,
  deductible_pgbl: Wallet,
  deductible_donation: HandCoins,
  deductible_dependent: Users,
};

export function IRDashboard({
  report,
  declarationYear,
  irrfOverride,
}: {
  report: IRReport;
  declarationYear: number;
  currentDeclarationYear: number;
  irrfOverride: number | null;
}) {
  const router = useRouter();
  const [dependents, setDependents] = React.useState(report.dependents);
  const [irrf, setIrrf] = React.useState(
    irrfOverride != null ? (irrfOverride / 100).toFixed(2).replace(".", ",") : "",
  );
  const [activeBucket, setActiveBucket] = React.useState<IRBucket | null>(null);

  // Recalcula com os parâmetros (deps + irrf).
  function recalculate() {
    const params = new URLSearchParams();
    params.set("year", String(report.year));
    if (dependents > 0) params.set("dep", String(dependents));
    if (irrf.trim()) params.set("irrf", irrf.replace(",", "."));
    router.push(`/app/imposto-de-renda?${params.toString()}`);
  }

  const refundCents = report.estimatedRefund;
  const willRefund = refundCents > 0;

  const incomeAnnual = report.income.tributable / 100;
  const margRate = marginalRate(incomeAnnual);

  const deductibleBuckets: IRBucket[] = [
    "deductible_health",
    "deductible_education",
    "deductible_pension",
    "deductible_pgbl",
    "deductible_donation",
    "deductible_dependent",
  ];

  function exportJson() {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `saf-ir-${report.year}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const heroTone: "income" | "expense" | "primary" =
    willRefund ? "income" : refundCents < 0 ? "expense" : "primary";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Plataforma · Imposto de Renda ${report.year}`}
        title={
          <>
            Sua prévia da <span className="display-serif italic">declaração</span> {declarationYear}
          </>
        }
        description="Estimativa baseada nas suas transações registradas — não substitui contador."
        tone={heroTone}
        actions={
          <Button variant="secondary" onClick={exportJson}>
            <Download className="h-4 w-4" /> Exportar JSON
          </Button>
        }
      />

      {/* Banner principal — restituição estimada */}
      <Card
        className={
          "border-2 " +
          (willRefund
            ? "border-[var(--color-income)]/40 bg-[var(--color-income-soft)]/30"
            : refundCents < 0
              ? "border-[var(--color-expense)]/40 bg-[var(--color-expense-soft)]/30"
              : "")
        }
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[var(--color-primary)]" />
                {willRefund
                  ? "Restituição estimada"
                  : refundCents < 0
                    ? "Imposto a pagar estimado"
                    : "Sem restituição ou imposto a pagar"}
              </CardTitle>
              <CardDescription>
                Diferença entre o IR retido na fonte e o IR devido com suas deduções. Alíquota
                marginal atual: <strong>{(margRate * 100).toFixed(1)}%</strong>.
              </CardDescription>
            </div>
            <Badge variant={willRefund ? "income" : refundCents < 0 ? "expense" : "default"}>
              {willRefund ? "favorável" : refundCents < 0 ? "a pagar" : "neutro"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p
            className={
              "display-serif tabular text-4xl sm:text-5xl " +
              (willRefund
                ? "text-[var(--color-income)]"
                : refundCents < 0
                  ? "text-[var(--color-expense)]"
                  : "text-[var(--color-fg)]")
            }
          >
            <span className="text-base align-top mr-1 not-italic">R$</span>
            {(Math.abs(refundCents) / 100)
              .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-[var(--color-fg-muted)] sm:grid-cols-3">
            <Mini label="Renda tributável" value={formatBRL(report.income.tributable)} />
            <Mini label="Rendimentos isentos" value={formatBRL(report.income.exempt)} />
            <Mini label="Bens declarados" value={formatBRL(report.bensEDireitos.total)} />
          </div>
        </CardContent>
      </Card>

      {/* Ajustes do cálculo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajustes do cálculo</CardTitle>
          <CardDescription>
            Informe seus dependentes e o IRRF retido no holerite pra estimativa ficar precisa.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ir-deps" className="text-xs font-medium text-[var(--color-fg-muted)]">
              Dependentes
            </label>
            <Input
              id="ir-deps"
              type="number"
              min={0}
              max={20}
              value={dependents}
              onChange={(e) => setDependents(Math.max(0, parseInt(e.target.value || "0", 10)))}
            />
            <p className="text-[10px] text-[var(--color-fg-subtle)]">
              R$ 2.275,08 por dependente; cada um amplia o teto de educação.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ir-irrf" className="text-xs font-medium text-[var(--color-fg-muted)]">
              IRRF retido no ano (R$)
            </label>
            <Input
              id="ir-irrf"
              inputMode="decimal"
              value={irrf}
              onChange={(e) => setIrrf(e.target.value)}
              placeholder="5.234,50"
            />
            <p className="text-[10px] text-[var(--color-fg-subtle)]">
              Soma do IR retido em todos os holerites do ano (informe imposto, geralmente).
            </p>
          </div>
          <div className="flex items-end">
            <Button variant="secondary" size="sm" onClick={recalculate}>
              Recalcular
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Deduções */}
      <Section
        eyebrow="Deduções"
        title="Pagamentos dedutíveis"
        description="Clique pra ver quanto cada categoria reduz o seu IR."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {deductibleBuckets.map((b) => {
            const info = IR_BUCKET_INFO[b];
            const data = report.deductions[b];
            const Icon = BUCKET_ICONS[b];
            const savedReais = (data.deductible / 100) * margRate;
            const showCard = data.total > 0 || data.deductible > 0;
            return (
              <button
                key={b}
                type="button"
                onClick={() => setActiveBucket(activeBucket === b ? null : b)}
                className={
                  "text-left rounded-[var(--radius-lg)] border p-4 shadow-soft transition-colors " +
                  (activeBucket === b
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)]") +
                  (!showCard ? " opacity-60" : "")
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {Icon && (
                      <span className="grid h-8 w-8 place-items-center rounded-[var(--radius)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                        <Icon className="h-4 w-4" />
                      </span>
                    )}
                    <div>
                      <p className="text-sm font-semibold">{info.label}</p>
                      <p className="text-[10px] text-[var(--color-fg-subtle)]">{info.ficha}</p>
                    </div>
                  </div>
                  {savedReais > 0 && (
                    <Badge variant="income">−R$ {savedReais.toFixed(0)}</Badge>
                  )}
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <p className="num text-xs text-[var(--color-fg-muted)]">
                      Gasto: {formatBRL(data.total)}
                    </p>
                    <p className="num mt-0.5 text-xs font-medium">
                      Dedutível: {formatBRL(data.deductible)}
                    </p>
                  </div>
                </div>
                {activeBucket === b && (
                  <div className="mt-3 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-fg-muted)]">
                    <p className="flex items-start gap-2">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {info.description}
                    </p>
                    {savedReais > 0 && (
                      <p className="mt-2 font-medium text-[var(--color-income)]">
                        Estimativa de economia: R${" "}
                        {savedReais.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Bens e direitos */}
      <Card>
        <CardHeader>
          <CardTitle>Bens e direitos — ficha &ldquo;Bens e Direitos&rdquo;</CardTitle>
          <CardDescription>
            Resumo do que entra na sua declaração. Use os valores na posição em 31/12/{report.year}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <BensSection
            icon={Building2}
            title="Imóveis e bens físicos"
            items={report.bensEDireitos.patrimony.map((p) => ({
              key: p.id,
              label: p.name,
              sub: labelType(p.type),
              valueCents: p.valueCents,
            }))}
          />
          <BensSection
            icon={Wallet}
            title="Ações, FIIs e renda fixa (B3)"
            items={report.bensEDireitos.holdings.map((h) => ({
              key: h.id,
              label: h.ticker,
              sub: `${h.name} · ${labelClass(h.assetClass)}`,
              valueCents: h.valueCents,
            }))}
            hint="Código 31 (ações), 73 (FII), 41 (CDB) — confira o código exato no programa da Receita."
          />
          <BensSection
            icon={Bitcoin}
            title="Criptomoedas"
            items={report.bensEDireitos.crypto.map((c) => ({
              key: c.id,
              label: c.symbol,
              sub: c.name,
              valueCents: c.valueCents,
            }))}
            hint="Código 81 (criptoativos). Obrigatório declarar se a soma ultrapassar R$ 5.000."
          />
          <div className="flex justify-between border-t border-[var(--color-border)] pt-3 text-sm font-semibold">
            <span>Total bens e direitos</span>
            <span className="num">{formatBRL(report.bensEDireitos.total)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Aviso */}
      <div className="rounded-[var(--radius)] border border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)] p-4 text-xs text-[var(--color-warning)]">
        <div className="flex items-start gap-2">
          <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Isso é uma estimativa, não substitui contador.</p>
            <p className="mt-1">
              O cálculo do IR devido aqui usa heurísticas (retenção mensal proporcional sobre
              salário). Pra valor exato, baixe o JSON acima, abra no programa IRPF da Receita
              ({" "}
              <Link href="https://www.gov.br/receitafederal" className="underline-offset-4 hover:underline">
                gov.br/receitafederal
              </Link>
              ) e copie os números nas fichas correspondentes. Em breve: importação direta
              via XML/.DEC.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BensSection({
  icon: Icon,
  title,
  items,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: Array<{ key: string; label: string; sub: string; valueCents: number }>;
  hint?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-dashed border-[var(--color-border)] p-3 text-xs text-[var(--color-fg-subtle)]">
        <Icon className="mb-1 inline-block h-4 w-4" /> {title}: nada declarado.
      </div>
    );
  }
  const total = items.reduce((acc, i) => acc + i.valueCents, 0);
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-[var(--radius)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-sm font-semibold">{title}</p>
        <span className="ml-auto num text-sm font-medium">{formatBRL(total)}</span>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {items.map((it) => (
            <tr key={it.key} className="border-t border-[var(--color-border)]">
              <td className="py-1.5 text-xs">
                <p className="font-medium">{it.label}</p>
                <p className="text-[10px] text-[var(--color-fg-subtle)]">{it.sub}</p>
              </td>
              <td className="num py-1.5 text-right text-xs">{formatBRL(it.valueCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {hint && (
        <p className="mt-2 text-[10px] text-[var(--color-fg-subtle)]">{hint}</p>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
        {label}
      </p>
      <p className="num font-medium text-[var(--color-fg)]">{value}</p>
    </div>
  );
}

function labelType(t: string): string {
  return (
    {
      real_estate: "Imóvel",
      vehicle: "Veículo",
      artwork: "Obra de arte",
      equipment: "Equipamento",
      other: "Outro",
    }[t] ?? t
  );
}

function labelClass(c: string): string {
  return (
    { stock: "Ação", fii: "FII", etf: "ETF", fixed_income: "RF", fund: "Fundo", other: "Outro" }[
      c
    ] ?? c
  );
}
