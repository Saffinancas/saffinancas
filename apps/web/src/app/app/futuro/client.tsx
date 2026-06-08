"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Check, TrendingUp, TrendingDown, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, StatCard, Section } from "@/components/ui/page-header";
import { Sparkline } from "@/components/ui/bento";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createFutureIncome,
  markFutureReceived,
  deleteFutureIncome,
  type FutureIncome,
  type ForecastMonth,
} from "@/lib/future";
import { formatBRL } from "@/lib/utils";

const KIND_OPTIONS = [
  { id: "13_salario", label: "13º salário" },
  { id: "ferias", label: "Férias" },
  { id: "restituicao_ir", label: "Restituição IR" },
  { id: "freelance", label: "Freelance combinado" },
  { id: "emprestimo_receber", label: "Empréstimo a receber" },
  { id: "venda_ativo", label: "Venda de ativo" },
  { id: "outro", label: "Outro" },
];

export function FuturoClient({
  incomes,
  forecast,
}: {
  incomes: FutureIncome[];
  forecast: ForecastMonth[];
}) {
  const router = useRouter();
  const [openAdd, setOpenAdd] = React.useState(false);

  const summary = React.useMemo(() => {
    let totalExpected = 0;
    let received = 0;
    for (const i of incomes) {
      totalExpected += i.totalCents;
      if (i.received) received += i.totalCents;
    }
    const lastCumulative = forecast.length ? forecast[forecast.length - 1]!.cumulativeCents : 0;
    const lowest = forecast.length
      ? Math.min(...forecast.map((d) => d.cumulativeCents))
      : 0;
    return { totalExpected, received, pending: totalExpected - received, lastCumulative, lowest };
  }, [incomes, forecast]);

  const sparkValues = forecast.map((d) => d.cumulativeCents / 100);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Plataforma · Futuro"
        title={
          <>
            O que vem <span className="display-serif italic">pela frente</span>
          </>
        }
        description="O que vai entrar nos próximos meses e como impacta o fluxo de caixa."
        actions={
          <Button onClick={() => setOpenAdd(true)}>
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        }
      />

      <div className="grid auto-rows-[minmax(120px,_auto)] grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          tone="income"
          label="Esperado"
          value={
            <span className="num">
              <span className="text-sm font-normal text-[var(--color-fg-muted)] align-top mr-1">
                R$
              </span>
              {(summary.totalExpected / 100).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          }
          trend={`${incomes.length} receita${incomes.length === 1 ? "" : "s"} cadastrada${incomes.length === 1 ? "" : "s"}`}
          icon={<TrendingUp className="h-4 w-4 text-[var(--color-income)]" />}
        />
        <StatCard
          tone="primary"
          label="Já recebido"
          value={
            <span className="num">
              <span className="text-sm font-normal text-[var(--color-fg-muted)] align-top mr-1">
                R$
              </span>
              {(summary.received / 100).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          }
          trend="virou transação real"
        />
        <StatCard
          tone="warning"
          label="A receber"
          value={
            <span className="num">
              <span className="text-sm font-normal text-[var(--color-fg-muted)] align-top mr-1">
                R$
              </span>
              {(summary.pending / 100).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          }
          trend="ainda em rota"
        />
        <StatCard
          tone={summary.lowest < 0 ? "expense" : "income"}
          label="Saldo em 12 meses"
          value={
            <span className="num">
              <span className="text-sm font-normal text-[var(--color-fg-muted)] align-top mr-1">
                R$
              </span>
              {(summary.lastCumulative / 100).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          }
          trend={
            summary.lowest < 0
              ? `mínimo: ${formatBRL(summary.lowest)}`
              : "fluxo se mantém positivo"
          }
          chart={
            sparkValues.length > 1 ? (
              <Sparkline
                values={sparkValues}
                height={42}
                stroke={summary.lowest < 0 ? "var(--color-expense)" : "var(--color-income)"}
              />
            ) : undefined
          }
        />
      </div>

      <Section
        eyebrow="Projeção"
        title="Fluxo de caixa próximos 12 meses"
        description="Combina previsto (a pagar) com receitas futuras. Saldo acumulado mostra quando o resultado vira positivo ou negativo."
      >
        <Card>
          <CardContent className="pt-6">
            <ForecastChart data={forecast} />
          </CardContent>
        </Card>
      </Section>

      <Section eyebrow="Carteira futura" title="Receitas esperadas">
        <Card>
          <CardContent className="pt-6">
            {incomes.length === 0 ? (
              <p className="text-sm text-[var(--color-fg-muted)]">
                Cadastre receitas que você sabe que vão entrar — 13º, restituição IR, freelance combinado,
                empréstimo a receber...
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-[var(--color-border)]">
                {incomes.map((i) => (
                  <FutureItem
                    key={i.id}
                    income={i}
                    onUpdate={() => router.refresh()}
                  />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </Section>

      <AddDialog open={openAdd} onOpenChange={setOpenAdd} onCreated={() => router.refresh()} />
    </div>
  );
}

function ForecastChart({ data }: { data: ForecastMonth[] }) {
  // Gráfico de barras simples + linha acumulada
  if (data.length === 0) {
    return <p className="text-sm text-[var(--color-fg-muted)]">Sem dados.</p>;
  }
  const max = Math.max(
    ...data.map((d) => Math.abs(d.cumulativeCents)),
    ...data.map((d) => d.incomeCents),
    ...data.map((d) => d.expenseCents),
    1,
  );
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-12 gap-1">
        {data.map((d) => (
          <div key={d.monthIso} className="flex flex-col items-center gap-1">
            <div className="flex h-24 w-full flex-col-reverse items-stretch">
              {d.incomeCents > 0 && (
                <div
                  className="bg-[var(--color-income)]"
                  style={{ height: `${(d.incomeCents / max) * 50}%` }}
                  title={`Receita: ${formatBRL(d.incomeCents)}`}
                />
              )}
              {d.expenseCents > 0 && (
                <div
                  className="bg-[var(--color-expense)] opacity-70"
                  style={{ height: `${(d.expenseCents / max) * 50}%` }}
                  title={`Despesa: ${formatBRL(d.expenseCents)}`}
                />
              )}
            </div>
            <span className="text-[9px] text-[var(--color-fg-subtle)]">
              {d.monthIso.slice(5)}
            </span>
          </div>
        ))}
      </div>
      <ul className="grid grid-cols-3 gap-2 text-xs">
        {data.slice(0, 6).map((d) => (
          <li
            key={d.monthIso}
            className="flex items-center justify-between rounded-[var(--radius)] border border-[var(--color-border)] px-2 py-1.5"
          >
            <span className="text-[var(--color-fg-muted)]">{d.monthIso}</span>
            <span
              className={
                "num font-medium " +
                (d.cumulativeCents >= 0
                  ? "text-[var(--color-income)]"
                  : "text-[var(--color-expense)]")
              }
            >
              {formatBRL(d.cumulativeCents)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FutureItem({
  income,
  onUpdate,
}: {
  income: FutureIncome;
  onUpdate: () => void;
}) {
  const [busy, setBusy] = React.useState(false);

  async function receive(installmentId?: string) {
    setBusy(true);
    const r = await markFutureReceived(income.id, installmentId);
    setBusy(false);
    if (!r.ok) alert(r.error);
    else onUpdate();
  }

  async function remove() {
    if (!confirm(`Apagar "${income.name}"?`)) return;
    setBusy(true);
    await deleteFutureIncome(income.id);
    setBusy(false);
    onUpdate();
  }

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          {income.name}
          <Badge variant="default">{kindLabel(income.kind)}</Badge>
          {income.received && <Badge variant="income">recebido</Badge>}
        </p>
        <p className="text-[10px] text-[var(--color-fg-subtle)]">
          {income.expectedAt
            ? `Esperado em ${new Date(income.expectedAt).toLocaleDateString("pt-BR")}`
            : "Sem data definida"}
        </p>
        {income.installments.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1 text-[10px]">
            {income.installments.map((inst) => (
              <li
                key={inst.id}
                className="flex items-center justify-between rounded-[var(--radius)] bg-[var(--color-surface-muted)] px-2 py-1"
              >
                <span>
                  Parcela {inst.sequence} ·{" "}
                  {new Date(inst.expectedAt).toLocaleDateString("pt-BR")} ·{" "}
                  <span className="num">{formatBRL(inst.amountCents)}</span>
                </span>
                {inst.received ? (
                  <Badge variant="income">recebido</Badge>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => receive(inst.id)} disabled={busy}>
                    <Check className="h-3 w-3" /> Recebi
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-col items-end gap-2">
        <span className="num text-sm font-medium text-[var(--color-income)]">
          +{formatBRL(income.totalCents)}
        </span>
        <div className="flex gap-1">
          {!income.received && income.installments.length === 0 && (
            <Button size="sm" onClick={() => receive()} disabled={busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Recebi
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={remove} disabled={busy}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </li>
  );
}

function AddDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = React.useState("");
  const [kind, setKind] = React.useState("13_salario");
  const [total, setTotal] = React.useState("");
  const [expectedAt, setExpectedAt] = React.useState("");
  const [installments, setInstallments] = React.useState(1);
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setName("");
      setKind("13_salario");
      setTotal("");
      setExpectedAt("");
      setInstallments(1);
      setNotes("");
      setError(null);
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cents = parseAmount(total);
    if (!name.trim()) return setError("Nome obrigatório.");
    if (!cents) return setError("Valor inválido.");
    setLoading(true);
    const r = await createFutureIncome({
      name: name.trim(),
      kind,
      totalCents: cents,
      expectedAt: expectedAt || null,
      installments,
      notes: notes.trim() || null,
    });
    setLoading(false);
    if (!r.ok) return setError(r.error);
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receita futura</DialogTitle>
          <DialogDescription>Receita que tu sabe que vai cair, mas ainda não caiu.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fi-name">Nome</Label>
            <Input
              id="fi-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="13º 2026, Freela cliente X..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fi-kind">Tipo</Label>
              <select
                id="fi-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm"
              >
                {KIND_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fi-total">Valor total (R$)</Label>
              <Input
                id="fi-total"
                inputMode="decimal"
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                placeholder="5000,00"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fi-date">Data esperada</Label>
              <Input
                id="fi-date"
                type="date"
                value={expectedAt}
                onChange={(e) => setExpectedAt(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fi-inst">Parcelas (1 = pgto único)</Label>
              <Input
                id="fi-inst"
                type="number"
                min={1}
                max={36}
                value={installments}
                onChange={(e) => setInstallments(parseInt(e.target.value || "1", 10))}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fi-notes">Observações</Label>
            <textarea
              id="fi-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm"
            />
          </div>
          {error && (
            <p className="flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)] px-3 py-2 text-xs text-[var(--color-expense)]">
              <AlertCircle className="h-3.5 w-3.5" /> {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function parseAmount(s: string): number | null {
  const cleaned = s.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function kindLabel(kind: string): string {
  return KIND_OPTIONS.find((k) => k.id === kind)?.label ?? kind;
}

// suprime warnings (TrendingUp/Down não usados na chart minimalista atual)
void TrendingUp;
void TrendingDown;
