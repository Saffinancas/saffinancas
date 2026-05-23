"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Gift, RefreshCcw, Loader2, BrainCircuit, Check, Key, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  setFamilyFreePlan,
  revertFreeToNormal,
  setFamilyAiProvider,
  setFamilyByokEnabled,
  clearFamilyByokKey,
} from "./actions";

type Provider = "claude" | "openai" | "gemini" | "auto";

const PROVIDERS: Array<{ id: Provider; label: string; vendor: string }> = [
  { id: "claude", label: "Claude", vendor: "Anthropic · Haiku 4.5" },
  { id: "openai", label: "GPT", vendor: "OpenAI · 4o-mini" },
  { id: "gemini", label: "Gemini", vendor: "Google · 1.5 Flash" },
  { id: "auto", label: "Automático", vendor: "balanceado por custo" },
];

export function FamilyDetailActions({
  familyId,
  currentStatus,
  currentProvider,
  byokEnabled,
  byokProvider,
  byokKeyPresent,
}: {
  familyId: string;
  currentStatus: string;
  currentProvider: Provider;
  byokEnabled: boolean;
  byokProvider: Provider | null;
  byokKeyPresent: boolean;
}) {
  const router = useRouter();
  const [provider, setProvider] = React.useState<Provider>(currentProvider);
  const [byokOn, setByokOn] = React.useState(byokEnabled);
  const [loadingPlan, setLoadingPlan] = React.useState(false);
  const [loadingProv, setLoadingProv] = React.useState<Provider | null>(null);
  const [loadingByok, setLoadingByok] = React.useState(false);

  const isFree = currentStatus === "free";

  async function toFree() {
    if (
      !confirm(
        "Tornar esta família plano gratuito vitalício? O trial e cobrança são suspensos.",
      )
    )
      return;
    setLoadingPlan(true);
    try {
      await setFamilyFreePlan(familyId);
      router.refresh();
    } finally {
      setLoadingPlan(false);
    }
  }

  async function backToNormal() {
    if (!confirm("Reverter para o ciclo normal? O cliente vai precisar adicionar cartão."))
      return;
    setLoadingPlan(true);
    try {
      await revertFreeToNormal(familyId);
      router.refresh();
    } finally {
      setLoadingPlan(false);
    }
  }

  async function pickProvider(p: Provider) {
    if (p === provider) return;
    setLoadingProv(p);
    setProvider(p);
    try {
      await setFamilyAiProvider(familyId, p);
      router.refresh();
    } finally {
      setLoadingProv(null);
    }
  }

  async function toggleByok() {
    const next = !byokOn;
    if (
      byokOn &&
      !confirm(
        "Desabilitar BYOK? A chave do cliente (se houver) será apagada e ele para de ver qual IA está sendo usada.",
      )
    )
      return;
    setLoadingByok(true);
    setByokOn(next);
    try {
      await setFamilyByokEnabled(familyId, next);
      router.refresh();
    } finally {
      setLoadingByok(false);
    }
  }

  async function removeKey() {
    if (!confirm("Apagar a chave do cliente? BYOK continua habilitado pra ele cadastrar outra."))
      return;
    setLoadingByok(true);
    try {
      await clearFamilyByokKey(familyId);
      router.refresh();
    } finally {
      setLoadingByok(false);
    }
  }

  return (
    <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-[var(--color-primary)]" /> Plano
          </CardTitle>
          <CardDescription>
            Conceder plano gratuito vitalício ou reverter ao ciclo normal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isFree ? (
            <>
              <p className="mb-4 text-sm text-[var(--color-income)]">
                Família está no plano gratuito vitalício.
              </p>
              <Button variant="secondary" onClick={backToNormal} disabled={loadingPlan}>
                {loadingPlan ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                Reverter pra ciclo normal
              </Button>
            </>
          ) : (
            <>
              <p className="mb-4 text-sm text-[var(--color-fg-muted)]">
                Status atual: <strong>{currentStatus}</strong>. Promover para gratuito remove
                trial, cobrança e bloqueio.
              </p>
              <Button onClick={toFree} disabled={loadingPlan}>
                {loadingPlan ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Gift className="h-4 w-4" />
                )}
                Tornar plano gratuito
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-[var(--color-primary)]" /> Provedor de IA
          </CardTitle>
          <CardDescription>
            Você define qual motor é usado nas mensagens desta família. O cliente não vê esta
            opção — só o resultado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {PROVIDERS.map((p) => {
              const active = provider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pickProvider(p.id)}
                  disabled={loadingProv !== null}
                  className={
                    "flex items-start justify-between gap-2 rounded-[var(--radius)] border p-3 text-left transition-colors " +
                    (active
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)]")
                  }
                >
                  <div>
                    <p
                      className={
                        "text-sm font-semibold " +
                        (active ? "text-[var(--color-primary)]" : "")
                      }
                    >
                      {p.label}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[var(--color-fg-muted)]">{p.vendor}</p>
                  </div>
                  {active && (
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)]">
                      {loadingProv === p.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-[var(--color-primary)]" />
            <CardTitle>BYOK — cliente usa chave própria</CardTitle>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={byokOn ? "true" : "false"}
            aria-label={byokOn ? "Desativar BYOK" : "Ativar BYOK"}
            onClick={toggleByok}
            disabled={loadingByok}
            className={
              "relative h-6 w-11 rounded-full transition-colors " +
              (byokOn
                ? "bg-[var(--color-primary)]"
                : "bg-[var(--color-border-strong)]")
            }
          >
            <span
              className={
                "absolute top-0.5 inline-block h-5 w-5 rounded-full bg-white shadow-soft transition-transform " +
                (byokOn ? "translate-x-5" : "translate-x-0.5")
              }
            />
          </button>
        </div>
        <CardDescription className="mt-2">
          Quando <strong>ligado</strong>, o cliente passa a ver a aba de IA e pode colar a
          chave de API dele. As chamadas dessa família passam a ser pagas por ele — não
          entram no seu custo no relatório.
          <br />
          Quando <strong>desligado</strong>, o cliente nem sabe qual IA é usada — é tudo
          processado com a sua chave.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!byokOn ? (
          <p className="text-xs text-[var(--color-fg-muted)]">
            BYOK desligado. A família é processada silenciosamente pela{" "}
            <strong>{currentProvider}</strong> com a chave da Saf.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[var(--color-fg-muted)]">Status da chave do cliente:</span>
              {byokKeyPresent ? (
                <Badge variant="income">
                  ativa — provedor {byokProvider ?? "?"}
                </Badge>
              ) : (
                <Badge variant="warning">aguardando cliente cadastrar</Badge>
              )}
            </div>
            {byokKeyPresent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={removeKey}
                disabled={loadingByok}
                className="text-[var(--color-expense)] hover:bg-[var(--color-expense-soft)]"
              >
                {loadingByok ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Apagar chave do cliente
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
}
