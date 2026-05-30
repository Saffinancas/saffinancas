"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Check, Undo2, X, AlertCircle, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createPlanned,
  markPlannedPaid,
  unmarkPlannedPaid,
  skipPlanned,
  deletePlanned,
  type MonthSummary,
  type PlannedItem,
} from "@/lib/planned";
import { formatBRL } from "@/lib/utils";

type Category = { id: string; name: string };

export function PrevistoClient({
  initial,
  categories,
}: {
  initial: MonthSummary;
  categories: Category[];
}) {
  const router = useRouter();
  const [openAdd, setOpenAdd] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);

  function nav(deltaMonths: number) {
    const parts = initial.monthIso.split("-").map(Number);
    const y = parts[0]!;
    const m = parts[1]!;
    const next = new Date(y, m - 1 + deltaMonths, 1);
    const monthIso = next.toISOString().slice(0, 7);
    router.push(`/app/previsto?m=${monthIso}`);
  }

  async function handlePay(item: PlannedItem) {
    setBusy(item.id);
    const r = await markPlannedPaid(item.id);
    setBusy(null);
    if (!r.ok) alert(r.error);
    else router.refresh();
  }

  async function handleUndo(item: PlannedItem) {
    if (!confirm("Desfazer pagamento? A transação correspondente será removida.")) return;
    setBusy(item.id);
    const r = await unmarkPlannedPaid(item.id);
    setBusy(null);
    if (!r.ok) alert(r.error);
    else router.refresh();
  }

  async function handleSkip(item: PlannedItem) {
    if (!confirm("Pular este item neste mês?")) return;
    setBusy(item.id);
    await skipPlanned(item.id);
    setBusy(null);
    router.refresh();
  }

  async function handleDelete(item: PlannedItem) {
    if (!confirm("Apagar este item? Não dá pra desfazer.")) return;
    setBusy(item.id);
    await deletePlanned(item.id);
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Previsto</h1>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            Checklist do mês. Marca como pago → vira despesa real.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => nav(-1)} aria-label="Mês anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-1 text-sm font-medium">
            {monthLabel(initial.monthIso)}
          </span>
          <Button variant="ghost" size="sm" onClick={() => nav(1)} aria-label="Próximo mês">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button onClick={() => setOpenAdd(true)}>
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <SummaryCard label="A pagar" value={initial.toPayCents} accent="warning" />
        <SummaryCard label="Pago" value={initial.paidCents} accent="income" />
        <SummaryCard label="Atrasado" value={initial.overdueCents} accent="expense" />
        <SummaryCard
          label="Saldo previsto"
          value={initial.totalIncomeCents - initial.totalExpenseCents}
          accent={
            initial.totalIncomeCents - initial.totalExpenseCents >= 0 ? "income" : "expense"
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Itens</CardTitle>
          <CardDescription>
            {initial.items.length === 0
              ? "Nenhum item neste mês. Adicione contas, salário, mensalidade..."
              : `${initial.items.length} item(ns) cadastrado(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {initial.items.length === 0 ? (
            <p className="text-sm text-[var(--color-fg-muted)]">
              Use o botão Adicionar pra criar o primeiro.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--color-border)]">
              {initial.items.map((it) => (
                <li key={it.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {it.name}
                      <StatusBadge status={it.status} />
                      {it.recurrence !== "once" && (
                        <Badge variant="default">
                          {it.recurrence === "monthly" ? "mensal" : "anual"}
                        </Badge>
                      )}
                    </p>
                    <p className="text-[10px] text-[var(--color-fg-subtle)]">
                      Dia {it.dueDay} · {it.categoryName ?? "sem categoria"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        "num text-sm font-medium " +
                        (it.type === "expense"
                          ? "text-[var(--color-expense)]"
                          : "text-[var(--color-income)]")
                      }
                    >
                      {it.type === "expense" ? "-" : "+"}
                      {formatBRL(it.amountCents)}
                    </span>
                    <div className="flex items-center gap-1">
                      {it.status === "paid" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUndo(it)}
                          disabled={busy === it.id}
                        >
                          {busy === it.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Undo2 className="h-4 w-4" />
                          )}
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handlePay(it)}
                            disabled={busy === it.id}
                          >
                            {busy === it.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                            Pago
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSkip(it)}
                            disabled={busy === it.id}
                            aria-label="Pular este mês"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(it)}
                        disabled={busy === it.id}
                        aria-label="Apagar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AddDialog
        open={openAdd}
        onOpenChange={setOpenAdd}
        categories={categories}
        monthIso={initial.monthIso}
        onCreated={() => router.refresh()}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "income" | "expense" | "warning";
}) {
  const color =
    accent === "income"
      ? "var(--color-income)"
      : accent === "expense"
        ? "var(--color-expense)"
        : "var(--color-warning)";
  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">{label}</p>
      <p className="num mt-1 text-lg font-semibold" style={{ color }}>
        {formatBRL(value)}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: PlannedItem["status"] }) {
  const map: Record<
    PlannedItem["status"],
    { label: string; variant: "income" | "warning" | "expense" | "default" }
  > = {
    to_pay: { label: "A pagar", variant: "warning" },
    paid: { label: "Pago", variant: "income" },
    overdue: { label: "Atrasado", variant: "expense" },
    skipped: { label: "Pulado", variant: "default" },
  };
  const v = map[status];
  return <Badge variant={v.variant}>{v.label}</Badge>;
}

function AddDialog({
  open,
  onOpenChange,
  categories,
  monthIso,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  categories: Category[];
  monthIso: string;
  onCreated: () => void;
}) {
  const [name, setName] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [type, setType] = React.useState<"expense" | "income">("expense");
  const [categoryId, setCategoryId] = React.useState<string>("");
  const [dueDay, setDueDay] = React.useState(10);
  const [recurrence, setRecurrence] = React.useState<"once" | "monthly" | "annual">("monthly");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setName("");
      setAmount("");
      setType("expense");
      setCategoryId("");
      setDueDay(10);
      setRecurrence("monthly");
      setError(null);
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cents = parseAmount(amount);
    if (!name.trim()) return setError("Nome obrigatório.");
    if (!cents) return setError("Valor inválido.");
    setLoading(true);
    const r = await createPlanned({
      name: name.trim(),
      amountCents: cents,
      type,
      categoryId: categoryId || null,
      dueDay,
      recurrence,
      monthIso,
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
          <DialogTitle>Adicionar previsto</DialogTitle>
          <DialogDescription>Conta, salário, mensalidade — qualquer coisa que tu sabe que vai entrar ou sair.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={
                "rounded-[var(--radius)] border p-2 text-xs " +
                (type === "expense"
                  ? "border-[var(--color-expense)] bg-[var(--color-expense-soft)] text-[var(--color-expense)]"
                  : "border-[var(--color-border)]")
              }
            >
              Despesa
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={
                "rounded-[var(--radius)] border p-2 text-xs " +
                (type === "income"
                  ? "border-[var(--color-income)] bg-[var(--color-income-soft)] text-[var(--color-income)]"
                  : "border-[var(--color-border)]")
              }
            >
              Receita
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pln-name">Nome</Label>
            <Input
              id="pln-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aluguel, Internet, Salário..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pln-amount">Valor (R$)</Label>
              <Input
                id="pln-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="1500,00"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pln-due">Dia do vencimento</Label>
              <Input
                id="pln-due"
                type="number"
                min={1}
                max={31}
                value={dueDay}
                onChange={(e) => setDueDay(parseInt(e.target.value || "1", 10))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pln-cat">Categoria</Label>
              <select
                id="pln-cat"
                title="Categoria"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm"
              >
                <option value="">— sem categoria —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pln-rec">Recorrência</Label>
              <select
                id="pln-rec"
                title="Recorrência"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as "once" | "monthly" | "annual")}
                className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm"
              >
                <option value="monthly">Mensal</option>
                <option value="annual">Anual</option>
                <option value="once">Único</option>
              </select>
            </div>
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

function monthLabel(iso: string): string {
  const parts = iso.split("-").map(Number);
  const y = parts[0]!;
  const m = parts[1]!;
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
