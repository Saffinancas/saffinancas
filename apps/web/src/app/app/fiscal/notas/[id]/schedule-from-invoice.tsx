"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Repeat, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBRL } from "@/lib/utils";
import { createSchedule } from "@/lib/fiscal/schedules";

type Prefill = {
  recipientId: string;
  recipientName: string;
  serviceCode: string;
  serviceDescription: string;
  serviceValueCents: number;
  issRateBps: number;
  issWithheld: boolean;
  suggestedEmail: string | null;
};

export function ScheduleFromInvoice({
  invoiceId: _invoiceId,
  existingScheduleId,
  existingScheduleLabel,
  prefill,
}: {
  invoiceId: string;
  existingScheduleId: string | null;
  existingScheduleLabel: string | null;
  prefill: Prefill;
}) {
  const [open, setOpen] = React.useState(false);

  if (existingScheduleId) {
    return (
      <Card className="border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-[var(--color-primary)]" />
            Esta nota já tem agendamento mensal
          </CardTitle>
          <CardDescription>
            <strong>{existingScheduleLabel}</strong> — emissão automática pra{" "}
            <strong>{prefill.recipientName}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/app/fiscal/agendamentos"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            Ver agendamentos <ArrowRight className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-[var(--color-primary)]" />
            Repetir esta nota todo mês
          </CardTitle>
          <CardDescription>
            Você emite uma vez e a gente cuida do resto. A cada mês, no dia escolhido,
            emitimos uma nova NFSe com os mesmos dados desta nota — e enviamos XML + DANFE
            pros emails configurados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setOpen(true)}>
            <Repeat className="h-4 w-4" /> Agendar emissão mensal
          </Button>
        </CardContent>
      </Card>

      <ScheduleDialog open={open} onOpenChange={setOpen} prefill={prefill} />
    </>
  );
}

function ScheduleDialog({
  open,
  onOpenChange,
  prefill,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  prefill: Prefill;
}) {
  const router = useRouter();
  const [label, setLabel] = React.useState(`Mensalidade ${prefill.recipientName}`);
  const [dayOfMonth, setDayOfMonth] = React.useState(10);
  const [emailInput, setEmailInput] = React.useState("");
  const [emails, setEmails] = React.useState<string[]>(
    prefill.suggestedEmail ? [prefill.suggestedEmail] : [],
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setLabel(`Mensalidade ${prefill.recipientName}`);
      setDayOfMonth(10);
      setEmails(prefill.suggestedEmail ? [prefill.suggestedEmail] : []);
      setEmailInput("");
      setError(null);
    }
  }, [open, prefill.recipientName, prefill.suggestedEmail]);

  function addEmail() {
    const e = emailInput.trim();
    if (!e || !e.includes("@")) return;
    if (emails.includes(e)) return;
    setEmails([...emails, e]);
    setEmailInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await createSchedule({
        recipientId: prefill.recipientId,
        label,
        dayOfMonth,
        serviceValueCents: prefill.serviceValueCents,
        serviceDescription: prefill.serviceDescription,
        serviceCode: prefill.serviceCode,
        issRateBps: prefill.issRateBps,
        issWithheld: prefill.issWithheld,
        emailRecipients: emails,
      });
      onOpenChange(false);
      router.push("/app/fiscal/agendamentos");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar agendamento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agendar emissão mensal</DialogTitle>
          <DialogDescription>
            Os dados desta nota viraram o modelo. Você só escolhe o dia e os emails que
            recebem o XML+DANFE cada vez que emitirmos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-xs">
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
              Modelo
            </p>
            <p className="mt-1 font-medium">
              {prefill.recipientName} · {formatBRL(prefill.serviceValueCents)} ·{" "}
              <Badge variant="default">{prefill.serviceCode}</Badge>
            </p>
            <p className="mt-1 line-clamp-2 text-[var(--color-fg-muted)]">
              {prefill.serviceDescription}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sfi-label">Apelido</Label>
            <Input id="sfi-label" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sfi-day">Dia do mês</Label>
            <Input
              id="sfi-day"
              type="number"
              min={1}
              max={28}
              required
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(parseInt(e.target.value || "10", 10))}
            />
            <p className="text-[10px] text-[var(--color-fg-subtle)]">
              Entre 1 e 28 — pra evitar problemas em fevereiro.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sfi-email">Emails que recebem XML + DANFE</Label>
            <div className="flex gap-2">
              <Input
                id="sfi-email"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addEmail();
                  }
                }}
                placeholder="contador@empresa.com.br"
              />
              <Button type="button" variant="secondary" onClick={addEmail}>
                Adicionar
              </Button>
            </div>
            {emails.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {emails.map((e) => (
                  <span
                    key={e}
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] text-[var(--color-primary)]"
                  >
                    {e}
                    <button
                      type="button"
                      onClick={() => setEmails(emails.filter((x) => x !== e))}
                      aria-label="Remover"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="rounded-[var(--radius)] border border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)] px-3 py-2 text-xs text-[var(--color-expense)]">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar agendamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
