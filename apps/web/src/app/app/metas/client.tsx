"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Target, TrendingUp, ArrowDown, Archive, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { ProgressRing } from "@/components/ui/bento";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createGoal,
  depositToGoal,
  withdrawFromGoal,
  archiveGoal,
  type Goal,
} from "@/lib/goals";
import { formatBRL } from "@/lib/utils";

export function MetasClient({ initial }: { initial: Goal[] }) {
  const router = useRouter();
  const [openAdd, setOpenAdd] = React.useState(false);
  const [openDeposit, setOpenDeposit] = React.useState<Goal | null>(null);

  const totals = React.useMemo(() => {
    let saved = 0;
    let target = 0;
    let reached = 0;
    for (const g of initial) {
      saved += g.savedCents;
      target += g.targetCents;
      if (g.savedCents >= g.targetCents) reached += 1;
    }
    const pct = target > 0 ? (saved / target) * 100 : 0;
    return { saved, target, reached, pct, count: initial.length };
  }, [initial]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Plataforma · Metas"
        title={
          <>
            Dinheiro com <span className="display-serif italic">propósito</span>
          </>
        }
        description="Reserve grana pra coisas concretas — viagem, carro, casa, escola. A gente projeta quanto falta no ritmo atual."
        actions={
          <Button onClick={() => setOpenAdd(true)}>
            <Plus className="h-4 w-4" /> Nova meta
          </Button>
        }
      />

      {initial.length > 0 && (
        <div className="grid auto-rows-[minmax(120px,_auto)] grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            tone="primary"
            label="Guardado"
            value={
              <span className="num">
                <span className="text-sm font-normal text-[var(--color-fg-muted)] align-top mr-1">
                  R$
                </span>
                {(totals.saved / 100).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            }
            trend={`de ${formatBRL(totals.target)} totais`}
            chart={
              totals.target > 0 ? (
                <div className="flex items-center justify-end">
                  <ProgressRing value={totals.pct} label="meta" size={72} />
                </div>
              ) : undefined
            }
          />
          <StatCard
            tone="income"
            label="Metas atingidas"
            value={
              <span className="num">
                {totals.reached}
                <span className="text-base font-normal text-[var(--color-fg-muted)] ml-1">
                  / {totals.count}
                </span>
              </span>
            }
            trend={totals.reached === totals.count ? "todas concluídas" : "em progresso"}
            icon={<Target className="h-4 w-4" />}
          />
          <StatCard
            tone="default"
            label="Falta"
            value={
              <span className="num">
                <span className="text-sm font-normal text-[var(--color-fg-muted)] align-top mr-1">
                  R$
                </span>
                {(Math.max(0, totals.target - totals.saved) / 100).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            }
            trend="pra fechar todas as metas"
          />
          <StatCard
            tone="warning"
            label="Progresso"
            value={<span className="num">{Math.round(totals.pct)}%</span>}
            trend="média ponderada por valor"
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </div>
      )}

      {initial.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-[var(--color-primary)]" />
              Comece sua primeira meta
            </CardTitle>
            <CardDescription>
              Defina um valor alvo e prazo. A gente projeta quando você atinge no ritmo atual.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setOpenAdd(true)}>
              <Plus className="h-4 w-4" /> Criar meta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {initial.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onDeposit={() => setOpenDeposit(g)}
              onArchive={async () => {
                if (!confirm(`Arquivar meta "${g.name}"?`)) return;
                await archiveGoal(g.id);
                router.refresh();
              }}
            />
          ))}
        </div>
      )}

      <AddDialog open={openAdd} onOpenChange={setOpenAdd} onCreated={() => router.refresh()} />
      <DepositDialog
        goal={openDeposit}
        onOpenChange={(o) => !o && setOpenDeposit(null)}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}

function GoalCard({
  goal,
  onDeposit,
  onArchive,
}: {
  goal: Goal;
  onDeposit: () => void;
  onArchive: () => void;
}) {
  const pct = Math.round(goal.progress * 100);
  const reached = goal.savedCents >= goal.targetCents;
  return (
    <Card className={reached ? "border-[var(--color-income)]/30" : ""}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate">{goal.name}</CardTitle>
            <CardDescription>
              {goal.deadline ? (
                <>Prazo: {new Date(goal.deadline).toLocaleDateString("pt-BR")}</>
              ) : (
                "Sem prazo definido"
              )}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onArchive} aria-label="Arquivar">
            <Archive className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex items-baseline justify-between">
            <span className="num text-2xl font-semibold">{formatBRL(goal.savedCents)}</span>
            <span className="text-xs text-[var(--color-fg-muted)]">
              de {formatBRL(goal.targetCents)}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
            <div
              className={
                "h-full transition-all " +
                (reached ? "bg-[var(--color-income)]" : "bg-[var(--color-primary)]")
              }
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-[var(--color-fg-subtle)]">{pct}% concluído</p>
        </div>

        {!reached && goal.monthsToTarget != null && (
          <div className="flex items-start gap-2 rounded-[var(--radius)] border border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)]/30 p-2 text-xs">
            <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
            <p>
              Ao ritmo atual ({formatBRL(goal.avgMonthlyContribCents)}/mês), atinge em{" "}
              <strong>{goal.monthsToTarget}</strong> mês(es).
            </p>
          </div>
        )}

        <Button onClick={onDeposit} size="sm" disabled={reached}>
          <Plus className="h-3.5 w-3.5" /> Aportar
        </Button>
      </CardContent>
    </Card>
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
  const [target, setTarget] = React.useState("");
  const [deadline, setDeadline] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setName("");
      setTarget("");
      setDeadline("");
      setNotes("");
      setError(null);
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cents = parseAmount(target);
    if (!name.trim()) return setError("Nome obrigatório.");
    if (!cents) return setError("Valor inválido.");
    setLoading(true);
    const r = await createGoal({
      name: name.trim(),
      targetCents: cents,
      deadline: deadline || null,
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
          <DialogTitle>Nova meta</DialogTitle>
          <DialogDescription>Defina um objetivo concreto pra família.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gol-name">Nome</Label>
            <Input
              id="gol-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Viagem pra Europa, Honda Civic 2024..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gol-target">Valor alvo (R$)</Label>
              <Input
                id="gol-target"
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="50000,00"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gol-deadline">Prazo (opcional)</Label>
              <Input
                id="gol-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gol-notes">Observações</Label>
            <textarea
              id="gol-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm"
              placeholder="Links do modelo, detalhes, motivação..."
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
              Criar meta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DepositDialog({
  goal,
  onOpenChange,
  onSaved,
}: {
  goal: Goal | null;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = React.useState("");
  const [mode, setMode] = React.useState<"deposit" | "withdraw">("deposit");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (goal) {
      setAmount("");
      setMode("deposit");
      setError(null);
    }
  }, [goal]);

  if (!goal) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cents = parseAmount(amount);
    if (!cents) return setError("Valor inválido.");
    setLoading(true);
    const r =
      mode === "deposit"
        ? await depositToGoal(goal!.id, cents)
        : await withdrawFromGoal(goal!.id, cents);
    setLoading(false);
    if (!r.ok) return setError(r.error);
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={!!goal} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{goal.name}</DialogTitle>
          <DialogDescription>
            {formatBRL(goal.savedCents)} de {formatBRL(goal.targetCents)} guardados
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode("deposit")}
              className={
                "rounded-[var(--radius)] border p-2 text-xs " +
                (mode === "deposit"
                  ? "border-[var(--color-income)] bg-[var(--color-income-soft)] text-[var(--color-income)]"
                  : "border-[var(--color-border)]")
              }
            >
              <Plus className="mr-1 inline h-3 w-3" /> Aportar
            </button>
            <button
              type="button"
              onClick={() => setMode("withdraw")}
              className={
                "rounded-[var(--radius)] border p-2 text-xs " +
                (mode === "withdraw"
                  ? "border-[var(--color-expense)] bg-[var(--color-expense-soft)] text-[var(--color-expense)]"
                  : "border-[var(--color-border)]")
              }
            >
              <ArrowDown className="mr-1 inline h-3 w-3" /> Retirar
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dep-amount">Valor (R$)</Label>
            <Input
              id="dep-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="500,00"
              autoFocus
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
              Confirmar
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
