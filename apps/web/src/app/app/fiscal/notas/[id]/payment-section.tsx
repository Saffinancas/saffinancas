"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2, Clock, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBRL } from "@/lib/utils";
import { markInvoicePaid, unmarkInvoicePaid } from "@/lib/fiscal/invoices";

export function PaymentSection({
  invoiceId,
  valorTotal,
  paymentReceivedAt,
  paymentReceivedAmountCents,
  linkedTransactionId,
}: {
  invoiceId: string;
  valorTotal: number;
  paymentReceivedAt: string | null;
  paymentReceivedAmountCents: number | null;
  linkedTransactionId: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [paidAt, setPaidAt] = React.useState(new Date().toISOString().slice(0, 10));
  const [paidAmount, setPaidAmount] = React.useState(
    (valorTotal / 100).toFixed(2).replace(".", ","),
  );
  const [error, setError] = React.useState<string | null>(null);

  async function handleConfirm() {
    setError(null);
    const cents = parseAmountToCents(paidAmount);
    if (!cents) {
      setError("Valor inválido.");
      return;
    }
    setLoading(true);
    try {
      const res = await markInvoicePaid(invoiceId, {
        paidAt,
        paidAmountCents: cents,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEditing(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleUndo() {
    if (
      !confirm(
        "Desfazer o pagamento? A transação de receita correspondente também será apagada.",
      )
    )
      return;
    setLoading(true);
    try {
      await unmarkInvoicePaid(invoiceId);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const isPaid = !!paymentReceivedAt;

  return (
    <Card
      className={
        isPaid
          ? "border-[var(--color-income)]/30 bg-[var(--color-income-soft)]/30"
          : "border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)]/30"
      }
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isPaid ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-[var(--color-income)]" />
              <span>Pagamento recebido</span>
            </>
          ) : (
            <>
              <Clock className="h-5 w-5 text-[var(--color-warning)]" />
              <span>Aguardando pagamento</span>
            </>
          )}
        </CardTitle>
        <CardDescription>
          {isPaid
            ? "A nota foi paga e a receita já está no seu dashboard."
            : "A nota foi emitida — confirme aqui assim que o pagamento cair na conta."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isPaid && !editing ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-medium">
                Recebido em{" "}
                {paymentReceivedAt &&
                  new Date(paymentReceivedAt).toLocaleDateString("pt-BR")}
              </p>
              {paymentReceivedAmountCents != null && (
                <p className="num text-[var(--color-income)]">
                  +{formatBRL(paymentReceivedAmountCents)}
                </p>
              )}
              {linkedTransactionId && (
                <p className="mt-1 text-[10px] text-[var(--color-fg-subtle)]">
                  Transação:{" "}
                  <Link
                    href="/app/transacoes"
                    className="underline-offset-4 hover:underline"
                  >
                    ver no dashboard
                  </Link>
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              disabled={loading}
              className="text-[var(--color-fg-muted)]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
              Desfazer
            </Button>
          </div>
        ) : (
          <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pay-date">Data do recebimento</Label>
              <Input
                id="pay-date"
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pay-amount">Valor recebido (R$)</Label>
              <Input
                id="pay-amount"
                inputMode="decimal"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
              />
            </div>
            <Button onClick={handleConfirm} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
            {error && (
              <p className="col-span-full rounded-[var(--radius)] border border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)] px-3 py-2 text-xs text-[var(--color-expense)]">
                {error}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function parseAmountToCents(input: string): number | null {
  const cleaned = input.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}
