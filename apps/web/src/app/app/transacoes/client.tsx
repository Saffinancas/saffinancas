"use client";

import * as React from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBRL } from "@/lib/utils";
import {
  createManualTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/lib/transactions";

type Txn = {
  id: string;
  type: "expense" | "income";
  amountCents: number;
  description: string;
  occurredAt: string;
  origin: "whatsapp" | "bank" | "manual" | "planned";
  status: "pending_review" | "confirmed" | "disputed" | "deleted";
  categoryId: string | null;
  categoryName: string | null;
};

type Cat = { id: string; name: string; allowedType: string; icon: string };

type Props = {
  initialOpen: boolean;
  transactions: Txn[];
  categories: Cat[];
};

export function TransactionsClient({ initialOpen, transactions, categories }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(initialOpen);
  const [editing, setEditing] = React.useState<Txn | null>(null);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(t: Txn) {
    setEditing(t);
    setOpen(true);
  }

  const totals = React.useMemo(() => {
    let income = 0;
    let expense = 0;
    let pending = 0;
    for (const t of transactions) {
      if (t.status === "deleted") continue;
      if (t.type === "income") income += t.amountCents;
      else expense += t.amountCents;
      if (t.status === "pending_review") pending += 1;
    }
    return { income, expense, balance: income - expense, pending, count: transactions.length };
  }, [transactions]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Plataforma · Transações"
        title={
          <>
            Tudo que <span className="display-serif italic">entrou e saiu</span>
          </>
        }
        description="Clique numa linha pra editar, reclassificar ou apagar. A IA já fez o primeiro chute — você só refina."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Lançar
          </Button>
        }
      />

      <div className="grid auto-rows-[minmax(120px,_auto)] grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          tone={totals.balance >= 0 ? "income" : "expense"}
          label="Saldo"
          value={
            <span className="num">
              <span className="text-sm font-normal text-[var(--color-fg-muted)] align-top mr-1">
                R$
              </span>
              {(Math.abs(totals.balance) / 100).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          }
          trend={`considerando ${totals.count} lançamento${totals.count === 1 ? "" : "s"}`}
        />
        <StatCard
          tone="income"
          label="Receita"
          value={
            <span className="num">
              <span className="text-sm font-normal text-[var(--color-fg-muted)] align-top mr-1">
                R$
              </span>
              {(totals.income / 100).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          }
          trend="somatório das entradas"
        />
        <StatCard
          tone="expense"
          label="Despesa"
          value={
            <span className="num">
              <span className="text-sm font-normal text-[var(--color-fg-muted)] align-top mr-1">
                R$
              </span>
              {(totals.expense / 100).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          }
          trend="somatório das saídas"
        />
        <StatCard
          tone={totals.pending > 0 ? "warning" : "default"}
          label="A revisar"
          value={<span className="num">{totals.pending}</span>}
          trend={totals.pending === 0 ? "tudo confirmado" : "lançamentos pendentes"}
        />
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center">
          <p className="text-sm text-[var(--color-fg-muted)]">
            Nada por aqui ainda. Lance sua primeira transação ou conecte o WhatsApp.
          </p>
          <Button className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Lançar primeira
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
                <th className="px-4 py-2.5 font-medium">Data</th>
                <th className="px-4 py-2.5 font-medium">Descrição</th>
                <th className="px-4 py-2.5 font-medium">Categoria</th>
                <th className="px-4 py-2.5 font-medium">Origem</th>
                <th className="px-4 py-2.5 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => openEdit(t)}
                  className="cursor-pointer border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-muted)]"
                >
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-[var(--color-fg-muted)]">
                    {new Date(t.occurredAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium">{t.description}</p>
                    {t.status === "pending_review" && (
                      <Badge variant="warning" className="mt-1">
                        revisar
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[var(--color-fg-muted)]">
                    {t.categoryName ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[var(--color-fg-muted)]">
                    {labelForOrigin(t.origin)}
                  </td>
                  <td
                    className={
                      "num whitespace-nowrap px-4 py-2.5 text-right text-sm font-semibold " +
                      (t.type === "income"
                        ? "text-[var(--color-income)]"
                        : "text-[var(--color-expense)]")
                    }
                  >
                    {t.type === "income" ? "+" : "−"}
                    {formatBRL(t.amountCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TransactionDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditing(null);
        }}
        categories={categories}
        editing={editing}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}

function TransactionDialog({
  open,
  onOpenChange,
  categories,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  categories: Cat[];
  editing: Txn | null;
  onSaved: () => void;
}) {
  const [type, setType] = React.useState<"expense" | "income">("expense");
  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (editing) {
      setType(editing.type);
      setAmount((editing.amountCents / 100).toFixed(2).replace(".", ","));
      setDescription(editing.description);
      setDate(editing.occurredAt.slice(0, 10));
      setCategoryId(editing.categoryId ?? "");
    } else {
      setType("expense");
      setAmount("");
      setDescription("");
      setDate(new Date().toISOString().slice(0, 10));
      setCategoryId("");
    }
    setError(null);
  }, [editing, open]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cents = parseAmountToCents(amount);
    if (cents == null) {
      setError("Valor inválido.");
      return;
    }
    setLoading(true);
    try {
      if (editing) {
        await updateTransaction(editing.id, {
          type,
          amountCents: cents,
          description,
          occurredAt: date,
          categoryId: categoryId || null,
        });
      } else {
        await createManualTransaction({
          type,
          amountCents: cents,
          description,
          occurredAt: date,
          categoryId: categoryId || null,
        });
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    if (!confirm("Apagar esta transação?")) return;
    setLoading(true);
    try {
      await deleteTransaction(editing.id);
      onSaved();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  const filteredCats = categories.filter(
    (c) => c.allowedType === "both" || c.allowedType === type,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar transação" : "Nova transação"}</DialogTitle>
          <DialogDescription>
            Em centavos no banco; aqui é só preencher como você escreveria pra um amigo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={
                "flex-1 rounded-[var(--radius)] border px-3 py-2 text-sm font-medium transition-colors " +
                (type === "expense"
                  ? "border-[var(--color-expense)] bg-[var(--color-expense-soft)] text-[var(--color-expense)]"
                  : "border-[var(--color-border)] text-[var(--color-fg-muted)]")
              }
            >
              Despesa
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={
                "flex-1 rounded-[var(--radius)] border px-3 py-2 text-sm font-medium transition-colors " +
                (type === "income"
                  ? "border-[var(--color-income)] bg-[var(--color-income-soft)] text-[var(--color-income)]"
                  : "border-[var(--color-border)] text-[var(--color-fg-muted)]")
              }
            >
              Receita
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-amount">Valor</Label>
            <Input
              id="tx-amount"
              inputMode="decimal"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="320,00"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tx-desc">Descrição</Label>
            <Input
              id="tx-desc"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mercado Extra"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-date">Data</Label>
              <Input
                id="tx-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tx-cat">Categoria</Label>
              <select
                id="tx-cat"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="h-10 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
              >
                <option value="">(sem categoria)</option>
                {filteredCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="rounded-[var(--radius)] border border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)] px-3 py-2 text-xs text-[var(--color-expense)]">
              {error}
            </p>
          )}

          <DialogFooter className="mt-2">
            {editing && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={loading}
                className="mr-auto text-[var(--color-expense)] hover:bg-[var(--color-expense-soft)]"
              >
                <Trash2 className="h-4 w-4" /> Apagar
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Salvar" : "Lançar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function parseAmountToCents(input: string): number | null {
  // Aceita "320", "320,00", "320.00", "1.234,56", "R$ 320,00"
  const cleaned = input
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function labelForOrigin(o: string): string {
  switch (o) {
    case "whatsapp":
      return "WhatsApp";
    case "bank":
      return "Banco";
    case "manual":
      return "Manual";
    case "planned":
      return "Previsto";
    default:
      return o;
  }
}
