"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { issueInvoice } from "@/lib/fiscal/invoices";
import { upsertRecipient } from "@/lib/fiscal/recipients";

type Recipient = {
  id: string;
  name: string;
  documentNumber: string;
  documentType: "PF" | "PJ";
  email: string | null;
};

const COMMON_SERVICE_CODES = [
  { code: "1.05", label: "1.05 — Análise/Desenvolvimento de sistemas" },
  { code: "1.06", label: "1.06 — Assessoria/Consultoria em informática" },
  { code: "1.07", label: "1.07 — Suporte técnico em informática" },
  { code: "1.08", label: "1.08 — Planejamento/Confecção de programas" },
  { code: "1.04", label: "1.04 — Elaboração de programas (software)" },
  { code: "17.01", label: "17.01 — Assessoria/consultoria de qualquer natureza" },
  { code: "17.05", label: "17.05 — Cessão de mão-de-obra" },
  { code: "17.06", label: "17.06 — Propaganda/publicidade" },
  { code: "10.02", label: "10.02 — Agenciamento/representação" },
  { code: "9.01", label: "9.01 — Hospedagem" },
  { code: "7.02", label: "7.02 — Execução de obras" },
];

export function EmitForm({ recipients }: { recipients: Recipient[] }) {
  const router = useRouter();
  const [recipientId, setRecipientId] = React.useState<string>(recipients[0]?.id ?? "");
  const [showNewRecipient, setShowNewRecipient] = React.useState(recipients.length === 0);

  // Novo tomador
  const [newDocType, setNewDocType] = React.useState<"PF" | "PJ">("PJ");
  const [newDoc, setNewDoc] = React.useState("");
  const [newName, setNewName] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");

  // Serviço
  const [serviceCode, setServiceCode] = React.useState(COMMON_SERVICE_CODES[0]!.code);
  const [serviceDescription, setServiceDescription] = React.useState("");
  const [value, setValue] = React.useState("");
  const [issRate, setIssRate] = React.useState("2.00");
  const [issWithheld, setIssWithheld] = React.useState(false);
  const [competence, setCompetence] = React.useState(new Date().toISOString().slice(0, 10));

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const valueCents = parseAmountToCents(value);
    if (!valueCents) {
      setError("Valor do serviço inválido.");
      return;
    }
    if (!serviceDescription.trim()) {
      setError("Descrição obrigatória.");
      return;
    }

    let usedRecipientId = recipientId;
    if (showNewRecipient) {
      if (!newDoc || !newName) {
        setError("Informe documento e nome do tomador.");
        return;
      }
      try {
        const res = await upsertRecipient({
          documentType: newDocType,
          documentNumber: newDoc,
          name: newName,
          email: newEmail || null,
        });
        usedRecipientId = res.id;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao salvar tomador.");
        return;
      }
    }

    if (!usedRecipientId) {
      setError("Selecione um tomador.");
      return;
    }

    setLoading(true);
    try {
      const rate = parseFloat(issRate.replace(",", ".")) || 0;
      const res = await issueInvoice({
        recipientId: usedRecipientId,
        serviceCode,
        serviceDescription,
        serviceValueCents: valueCents,
        issRateBps: Math.round(rate * 100),
        issWithheld,
        competenceDate: competence,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/app/fiscal/notas/${res.invoiceId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao emitir.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <fieldset className="rounded-[var(--radius)] border border-[var(--color-border)] p-4">
        <legend className="px-1 text-xs font-medium text-[var(--color-fg-muted)]">
          Tomador do serviço
        </legend>

        {recipients.length > 0 && !showNewRecipient && (
          <div className="flex items-end gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="r-select">Selecione</Label>
              <select
                id="r-select"
                aria-label="Tomador"
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                className="h-10 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm"
              >
                {recipients.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.documentNumber})
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowNewRecipient(true)}
            >
              <UserPlus className="h-4 w-4" /> Novo tomador
            </Button>
          </div>
        )}

        {showNewRecipient && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nr-type">Tipo</Label>
                <select
                  id="nr-type"
                  aria-label="Tipo do tomador"
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value as "PF" | "PJ")}
                  className="h-10 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm"
                >
                  <option value="PJ">CNPJ</option>
                  <option value="PF">CPF</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nr-doc">{newDocType === "PJ" ? "CNPJ" : "CPF"}</Label>
                <Input id="nr-doc" value={newDoc} onChange={(e) => setNewDoc(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nr-name">Nome / Razão social</Label>
                <Input id="nr-name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nr-email">E-mail</Label>
                <Input
                  id="nr-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
            </div>
            {recipients.length > 0 && (
              <button
                type="button"
                onClick={() => setShowNewRecipient(false)}
                className="text-xs text-[var(--color-fg-muted)] hover:underline"
              >
                ← Usar tomador existente
              </button>
            )}
          </div>
        )}
      </fieldset>

      <fieldset className="rounded-[var(--radius)] border border-[var(--color-border)] p-4">
        <legend className="px-1 text-xs font-medium text-[var(--color-fg-muted)]">Serviço</legend>
        <div className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-code">Código LC 116/03</Label>
            <select
              id="s-code"
              aria-label="Código de serviço"
              value={serviceCode}
              onChange={(e) => setServiceCode(e.target.value)}
              className="h-10 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm"
            >
              {COMMON_SERVICE_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-desc">Discriminação do serviço</Label>
            <textarea
              id="s-desc"
              required
              rows={3}
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
              placeholder="Prestação de serviços de consultoria em TI, conforme contrato 2026/01."
              className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="s-value">Valor (R$)</Label>
              <Input
                id="s-value"
                inputMode="decimal"
                required
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="10.000,00"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="s-iss">Alíquota ISS (%)</Label>
              <Input
                id="s-iss"
                inputMode="decimal"
                value={issRate}
                onChange={(e) => setIssRate(e.target.value)}
                placeholder="2.00"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="s-comp">Competência</Label>
              <Input
                id="s-comp"
                type="date"
                required
                value={competence}
                onChange={(e) => setCompetence(e.target.value)}
              />
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={issWithheld}
              onChange={(e) => setIssWithheld(e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              ISS retido na fonte pelo tomador
              <br />
              <span className="text-xs text-[var(--color-fg-subtle)]">
                Marque quando o tomador for substituto tributário e fizer o recolhimento.
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      {error && (
        <p className="rounded-[var(--radius)] border border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)] px-3 py-2 text-xs text-[var(--color-expense)]">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Emitir NFSe
      </Button>
    </form>
  );
}

function parseAmountToCents(input: string): number | null {
  const cleaned = input.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}
