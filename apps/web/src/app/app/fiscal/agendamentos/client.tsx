"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Pause, Play, Square, Mail, X, Zap } from "lucide-react";
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
  createSchedule,
  pauseSchedule,
  resumeSchedule,
  endSchedule,
  runScheduleNow,
} from "@/lib/fiscal/schedules";

type Schedule = {
  id: string;
  label: string;
  dayOfMonth: number;
  serviceValueCents: number;
  serviceDescription: string;
  status: "active" | "paused" | "ended";
  nextRunAt: string | null;
  lastRunAt: string | null;
  invoicesIssued: number;
  emailRecipients: string[];
  recipientName: string;
  recipientId: string;
};

type Recipient = {
  id: string;
  name: string;
  documentNumber: string;
  email: string | null;
};

export function SchedulesClient({
  schedules,
  recipients,
}: {
  schedules: Schedule[];
  recipients: Recipient[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)} disabled={recipients.length === 0}>
          <Plus className="h-4 w-4" /> Novo agendamento
        </Button>
      </div>

      {recipients.length === 0 && (
        <div className="rounded-[var(--radius)] border border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)] p-3 text-xs text-[var(--color-warning)]">
          Cadastre um tomador (emitindo uma nota manual primeiro) antes de criar agendamento.
        </div>
      )}

      {schedules.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-[var(--color-fg-muted)]">
              Nenhum agendamento. Clique em &ldquo;Novo agendamento&rdquo; pra criar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {schedules.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{s.label}</CardTitle>
                    <CardDescription>
                      Todo dia <strong>{s.dayOfMonth}</strong> · pra{" "}
                      <strong>{s.recipientName}</strong> ·{" "}
                      <strong>{formatBRL(s.serviceValueCents)}</strong>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={s.status} />
                    {s.status !== "ended" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          if (
                            !confirm(
                              "Emitir agora uma nota com os dados deste agendamento? Conta a próxima cobrança do mês.",
                            )
                          )
                            return;
                          const res = await runScheduleNow(s.id);
                          if (!res.ok) alert(res.error);
                          router.refresh();
                        }}
                        className="text-[var(--color-primary)]"
                        aria-label="Executar agora"
                        title="Emitir nota agora (testa o agendamento sem esperar o cron)"
                      >
                        <Zap className="h-4 w-4" /> Executar agora
                      </Button>
                    )}
                    {s.status === "active" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await pauseSchedule(s.id);
                          router.refresh();
                        }}
                        aria-label="Pausar"
                      >
                        <Pause className="h-4 w-4" /> Pausar
                      </Button>
                    )}
                    {s.status === "paused" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await resumeSchedule(s.id);
                          router.refresh();
                        }}
                        aria-label="Retomar"
                      >
                        <Play className="h-4 w-4" /> Retomar
                      </Button>
                    )}
                    {s.status !== "ended" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          if (!confirm("Encerrar este agendamento?")) return;
                          await endSchedule(s.id);
                          router.refresh();
                        }}
                        className="text-[var(--color-expense)]"
                      >
                        <Square className="h-4 w-4" /> Encerrar
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--color-fg-muted)]">{s.serviceDescription}</p>
                <dl className="mt-3 grid gap-3 text-xs text-[var(--color-fg-muted)] sm:grid-cols-3">
                  <Field
                    label="Próxima emissão"
                    value={
                      s.nextRunAt
                        ? new Date(s.nextRunAt).toLocaleDateString("pt-BR")
                        : "—"
                    }
                  />
                  <Field
                    label="Última emissão"
                    value={
                      s.lastRunAt
                        ? new Date(s.lastRunAt).toLocaleDateString("pt-BR")
                        : "nunca"
                    }
                  />
                  <Field label="Notas emitidas" value={String(s.invoicesIssued)} />
                </dl>
                {s.emailRecipients.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--color-fg-muted)]">
                    <Mail className="h-3 w-3" />
                    <span>Envia XML+DANFE para:</span>
                    {s.emailRecipients.map((e) => (
                      <Badge key={e} variant="default">
                        {e}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ScheduleDialog open={open} onOpenChange={setOpen} recipients={recipients} />
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-medium text-[var(--color-fg)]">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") return <Badge variant="income">ativo</Badge>;
  if (status === "paused") return <Badge variant="warning">pausado</Badge>;
  return <Badge variant="default">encerrado</Badge>;
}

function ScheduleDialog({
  open,
  onOpenChange,
  recipients,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  recipients: Recipient[];
}) {
  const router = useRouter();
  const [label, setLabel] = React.useState("");
  const [recipientId, setRecipientId] = React.useState(recipients[0]?.id ?? "");
  const [dayOfMonth, setDayOfMonth] = React.useState(10);
  const [value, setValue] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [serviceCode, setServiceCode] = React.useState("1.05");
  const [issRate, setIssRate] = React.useState("2.00");
  const [issWithheld, setIssWithheld] = React.useState(false);
  const [emailInput, setEmailInput] = React.useState("");
  const [emails, setEmails] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setLabel("");
      setDayOfMonth(10);
      setValue("");
      setDesc("");
      setEmails([]);
      setEmailInput("");
      setError(null);
    }
  }, [open]);

  function addEmail() {
    const e = emailInput.trim();
    if (!e || !e.includes("@")) return;
    if (emails.includes(e)) return;
    setEmails([...emails, e]);
    setEmailInput("");
  }

  function removeEmail(e: string) {
    setEmails(emails.filter((x) => x !== e));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const valueCents = parseAmountToCents(value);
    if (!valueCents) {
      setError("Valor inválido.");
      return;
    }
    if (!recipientId) {
      setError("Selecione um tomador.");
      return;
    }
    setLoading(true);
    try {
      await createSchedule({
        recipientId,
        label: label || `Mensalidade ${dayOfMonth}`,
        dayOfMonth,
        serviceValueCents: valueCents,
        serviceDescription: desc,
        serviceCode,
        issRateBps: Math.round(parseFloat(issRate.replace(",", ".")) * 100),
        issWithheld,
        emailRecipients: emails,
      });
      onOpenChange(false);
      router.refresh();
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
          <DialogTitle>Novo agendamento mensal</DialogTitle>
          <DialogDescription>
            Toda mês, no dia escolhido, emitimos a nota automaticamente e enviamos XML + DANFE
            pros emails informados.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sch-label">Apelido</Label>
            <Input
              id="sch-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Mensalidade Acme"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sch-recipient">Tomador</Label>
              <select
                id="sch-recipient"
                aria-label="Tomador"
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                className="h-10 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm"
              >
                {recipients.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sch-day">Dia do mês</Label>
              <Input
                id="sch-day"
                type="number"
                min={1}
                max={28}
                required
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(parseInt(e.target.value || "10", 10))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sch-value">Valor (R$)</Label>
              <Input
                id="sch-value"
                inputMode="decimal"
                required
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="10.000,00"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sch-iss">Alíquota ISS (%)</Label>
              <Input
                id="sch-iss"
                inputMode="decimal"
                value={issRate}
                onChange={(e) => setIssRate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sch-code">Código LC 116</Label>
            <Input id="sch-code" value={serviceCode} onChange={(e) => setServiceCode(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sch-desc">Discriminação</Label>
            <textarea
              id="sch-desc"
              required
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Prestação de serviços de consultoria conforme contrato vigente."
              className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={issWithheld}
              onChange={(e) => setIssWithheld(e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span>ISS retido pelo tomador</span>
          </label>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sch-email">Emails que recebem XML + DANFE</Label>
            <div className="flex gap-2">
              <Input
                id="sch-email"
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
                      onClick={() => removeEmail(e)}
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
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar
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
