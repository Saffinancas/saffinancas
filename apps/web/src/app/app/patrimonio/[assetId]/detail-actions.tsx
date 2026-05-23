"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, RefreshCcw, Check } from "lucide-react";
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
import { formatBRL } from "@/lib/utils";
import {
  createRental,
  recordRentPayment,
  updateAssetCurrentValue,
} from "@/lib/patrimony";

type Rental = {
  id: string;
  tenantName: string;
  monthlyRentCents: number;
  status: "active" | "ended" | "suspended";
  contractStart: string;
};
type Payment = {
  id: string;
  periodMonth: string;
  dueDate: string;
  paidAt: string | null;
  expectedAmountCents: number;
  paidAmountCents: number | null;
};

export function AssetDetailActions({
  assetId,
  currentValueCents,
  rentals,
  payments,
}: {
  assetId: string;
  currentValueCents: number;
  rentals: Rental[];
  payments: Payment[];
}) {
  const [openValue, setOpenValue] = React.useState(false);
  const [openRental, setOpenRental] = React.useState(false);
  const [openPayment, setOpenPayment] = React.useState<Rental | null>(null);

  const activeRental = rentals.find((r) => r.status === "active");

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Aluguéis</CardTitle>
              <CardDescription>
                Quando você marca um pagamento como recebido, vira receita automaticamente.
              </CardDescription>
            </div>
            {!activeRental && (
              <Button size="sm" onClick={() => setOpenRental(true)}>
                <Plus className="h-4 w-4" /> Novo contrato
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {rentals.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--color-fg-muted)]">
              Sem contrato de aluguel.
            </p>
          ) : (
            rentals.map((r) => (
              <div
                key={r.id}
                className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{r.tenantName}</p>
                    <p className="text-xs text-[var(--color-fg-muted)]">
                      Aluguel: <span className="num font-medium">{formatBRL(r.monthlyRentCents)}</span>{" "}
                      · desde {new Date(r.contractStart).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Badge variant={r.status === "active" ? "income" : "default"}>
                    {r.status === "active" ? "ativo" : r.status === "ended" ? "encerrado" : "suspenso"}
                  </Badge>
                </div>
                {r.status === "active" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-3"
                    onClick={() => setOpenPayment(r)}
                  >
                    <Check className="h-4 w-4" /> Registrar pagamento
                  </Button>
                )}
              </div>
            ))
          )}

          {payments.length > 0 && (
            <div className="mt-4 border-t border-[var(--color-border)] pt-3">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
                Histórico de pagamentos
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
                    <th className="py-1 font-medium">Mês</th>
                    <th className="py-1 text-right font-medium">Previsto</th>
                    <th className="py-1 text-right font-medium">Recebido</th>
                    <th className="py-1 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.slice(0, 12).map((p) => (
                    <tr key={p.id} className="border-t border-[var(--color-border)]">
                      <td className="py-1.5 text-xs">
                        {new Date(p.periodMonth).toLocaleDateString("pt-BR", {
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="num py-1.5 text-right text-xs text-[var(--color-fg-muted)]">
                        {formatBRL(p.expectedAmountCents)}
                      </td>
                      <td className="num py-1.5 text-right text-xs font-medium">
                        {p.paidAmountCents != null ? formatBRL(p.paidAmountCents) : "—"}
                      </td>
                      <td className="py-1.5 text-xs">
                        {p.paidAt ? (
                          <Badge variant="income">recebido</Badge>
                        ) : (
                          <Badge variant="warning">pendente</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Valor atual</CardTitle>
              <CardDescription>
                Atualize quando reavaliar (mercado, avaliação profissional ou tabela FIPE).
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setOpenValue(true)}>
              <RefreshCcw className="h-4 w-4" /> Atualizar valor
            </Button>
          </div>
        </CardHeader>
      </Card>

      <ValueDialog
        open={openValue}
        onOpenChange={setOpenValue}
        assetId={assetId}
        currentValueCents={currentValueCents}
      />
      <RentalDialog open={openRental} onOpenChange={setOpenRental} assetId={assetId} />
      {openPayment && (
        <PaymentDialog
          open={!!openPayment}
          onOpenChange={(o) => !o && setOpenPayment(null)}
          rental={openPayment}
        />
      )}
    </>
  );
}

function ValueDialog({
  open,
  onOpenChange,
  assetId,
  currentValueCents,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  assetId: string;
  currentValueCents: number;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const [source, setSource] = React.useState<"manual" | "market" | "appraisal" | "tax_table">(
    "manual",
  );
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setValue((currentValueCents / 100).toFixed(2).replace(".", ","));
      setSource("manual");
      setNotes("");
      setError(null);
    }
  }, [open, currentValueCents]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cents = parseAmountToCents(value);
    if (!cents) {
      setError("Valor inválido.");
      return;
    }
    setLoading(true);
    try {
      await updateAssetCurrentValue({
        assetId,
        valueCents: cents,
        source,
        notes: notes || null,
      });
      router.refresh();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atualizar valor de mercado</DialogTitle>
          <DialogDescription>
            Cria um snapshot na timeline. O valor atual usado em todo lugar passa a ser esse.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-value">Novo valor (R$)</Label>
            <Input
              id="v-value"
              inputMode="decimal"
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-source">Origem</Label>
            <select
              id="v-source"
              aria-label="Origem da reavaliação"
              value={source}
              onChange={(e) =>
                setSource(e.target.value as "manual" | "market" | "appraisal" | "tax_table")
              }
              className="h-10 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
            >
              <option value="manual">Estimativa manual</option>
              <option value="market">Pesquisa de mercado</option>
              <option value="appraisal">Avaliação profissional</option>
              <option value="tax_table">Tabela (FIPE)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="v-notes">Notas (opcional)</Label>
            <Input
              id="v-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Imóveis semelhantes vendendo entre R$ X e R$ Y"
            />
          </div>
          {error && (
            <p className="rounded-[var(--radius)] border border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)] px-3 py-2 text-xs text-[var(--color-expense)]">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RentalDialog({
  open,
  onOpenChange,
  assetId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  assetId: string;
}) {
  const router = useRouter();
  const [tenant, setTenant] = React.useState("");
  const [rent, setRent] = React.useState("");
  const [start, setStart] = React.useState(new Date().toISOString().slice(0, 10));
  const [day, setDay] = React.useState("5");
  const [adjustment, setAdjustment] = React.useState<"none" | "igpm" | "ipca" | "inpc">("igpm");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setTenant("");
      setRent("");
      setStart(new Date().toISOString().slice(0, 10));
      setDay("5");
      setAdjustment("igpm");
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cents = parseAmountToCents(rent);
    if (!cents) {
      setError("Valor de aluguel inválido.");
      return;
    }
    setLoading(true);
    try {
      await createRental({
        assetId,
        tenantName: tenant,
        monthlyRentCents: cents,
        contractStart: start,
        paymentDay: Number(day),
        adjustmentIndex: adjustment,
      });
      router.refresh();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo contrato de aluguel</DialogTitle>
          <DialogDescription>Pra começar a registrar recebimentos mensais.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="r-tenant">Nome do inquilino</Label>
            <Input
              id="r-tenant"
              required
              value={tenant}
              onChange={(e) => setTenant(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="r-rent">Aluguel mensal (R$)</Label>
              <Input
                id="r-rent"
                inputMode="decimal"
                required
                value={rent}
                onChange={(e) => setRent(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="r-day">Dia do vencimento</Label>
              <Input
                id="r-day"
                type="number"
                min={1}
                max={28}
                required
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="r-start">Início do contrato</Label>
              <Input
                id="r-start"
                type="date"
                required
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="r-adj">Índice de reajuste</Label>
              <select
                id="r-adj"
                aria-label="Índice de reajuste"
                value={adjustment}
                onChange={(e) =>
                  setAdjustment(e.target.value as "none" | "igpm" | "ipca" | "inpc")
                }
                className="h-10 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
              >
                <option value="igpm">IGP-M</option>
                <option value="ipca">IPCA</option>
                <option value="inpc">INPC</option>
                <option value="none">Sem reajuste</option>
              </select>
            </div>
          </div>
          {error && (
            <p className="rounded-[var(--radius)] border border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)] px-3 py-2 text-xs text-[var(--color-expense)]">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar contrato
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PaymentDialog({
  open,
  onOpenChange,
  rental,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  rental: Rental;
}) {
  const router = useRouter();
  const [periodMonth, setPeriodMonth] = React.useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [amount, setAmount] = React.useState(
    (rental.monthlyRentCents / 100).toFixed(2).replace(".", ","),
  );
  const [paidAt, setPaidAt] = React.useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cents = parseAmountToCents(amount);
    if (!cents) {
      setError("Valor inválido.");
      return;
    }
    setLoading(true);
    try {
      await recordRentPayment({
        rentalId: rental.id,
        periodMonth,
        paidAmountCents: cents,
        paidAt,
      });
      router.refresh();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pagamento de aluguel</DialogTitle>
          <DialogDescription>
            Gera receita automática no dashboard, vinculada ao mês de competência.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-period">Mês de competência</Label>
            <Input
              id="p-period"
              type="month"
              required
              value={periodMonth.slice(0, 7)}
              onChange={(e) => setPeriodMonth(`${e.target.value}-01`)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-amount">Valor recebido (R$)</Label>
              <Input
                id="p-amount"
                inputMode="decimal"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="p-date">Data do recebimento</Label>
              <Input
                id="p-date"
                type="date"
                required
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </div>
          </div>
          {error && (
            <p className="rounded-[var(--radius)] border border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)] px-3 py-2 text-xs text-[var(--color-expense)]">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function parseAmountToCents(input: string): number | null {
  const cleaned = input.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}
