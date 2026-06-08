"use client";

import * as React from "react";
import { Loader2, Phone, Power, Copy, Check, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BentoCard, PulseDot } from "@/components/ui/bento";
import { safPairAction, safStartAction, safUnpairAction, safStatusAction } from "./actions";

type Status = {
  status:
    | "disconnected"
    | "qr_pending"
    | "connected"
    | "auth_failure"
    | "initializing"
    | "unpaired";
  pairedPhone: string | null;
  qrDataUrl: string | null;
  qrExpiresAt: string | null;
};

type Props = {
  initial: Status | { error: string };
};

const STATUS_LABEL: Record<Status["status"], { label: string; tone: "income" | "warning" | "expense" | "default" }> = {
  connected: { label: "Conectado", tone: "income" },
  qr_pending: { label: "Aguardando pareamento", tone: "warning" },
  initializing: { label: "Iniciando…", tone: "warning" },
  unpaired: { label: "Sem pareamento", tone: "default" },
  disconnected: { label: "Desconectado", tone: "default" },
  auth_failure: { label: "Banido / falha de auth", tone: "expense" },
};

export function SafSessionClient({ initial }: Props) {
  const [status, setStatus] = React.useState<Status | { error: string }>(initial);
  const [phone, setPhone] = React.useState("");
  const [pairing, setPairing] = React.useState<{
    code: string;
    expiresInSeconds: number;
    instructions: string;
  } | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Polling do status enquanto qr_pending OU sem dados ainda
  React.useEffect(() => {
    if ("error" in status) return;
    if (status.status === "connected" || status.status === "auth_failure") return;
    const t = setInterval(async () => {
      const r = await safStatusAction();
      setStatus(r);
      if (!("error" in r) && r.status === "connected") {
        setPairing(null);
      }
    }, 4000);
    return () => clearInterval(t);
  }, [status]);

  function onPair() {
    setError(null);
    if (!phone) {
      setError("Digite o telefone do número Saf no formato +55DDXXXXXXXXX.");
      return;
    }
    startTransition(async () => {
      // Garante sessão iniciada
      await safStartAction();
      const r = await safPairAction(phone);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setPairing({
        code: r.pairingCode,
        expiresInSeconds: r.expiresInSeconds,
        instructions: r.instructions,
      });
      const s = await safStatusAction();
      setStatus(s);
    });
  }

  function onRefresh() {
    startTransition(async () => {
      const s = await safStatusAction();
      setStatus(s);
    });
  }

  function onUnpair() {
    if (!confirm("Desconectar o número Saf? Todos os grupos perdem o bot até parear de novo.")) {
      return;
    }
    startTransition(async () => {
      const r = await safUnpairAction();
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setPairing(null);
      const s = await safStatusAction();
      setStatus(s);
    });
  }

  function copyCode() {
    if (!pairing) return;
    navigator.clipboard.writeText(pairing.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const isWorkerError = "error" in status;
  const live = !isWorkerError ? status : null;
  const meta = live ? STATUS_LABEL[live.status] : null;

  return (
    <div className="space-y-6">
      {/* Status atual */}
      <BentoCard
        tone={
          meta?.tone === "income"
            ? "income"
            : meta?.tone === "expense"
              ? "expense"
              : meta?.tone === "warning"
                ? "warning"
                : "default"
        }
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            {live?.status === "connected" && <PulseDot color="var(--color-income)" />}
            Sessão Saf · status
          </span>
        }
        title={isWorkerError ? "Worker offline" : meta?.label ?? "—"}
        metric={
          live?.pairedPhone ? (
            <span className="num">{live.pairedPhone}</span>
          ) : (
            <span className="text-base font-normal text-[var(--color-fg-muted)]">
              Nenhum número pareado
            </span>
          )
        }
        footnote={
          isWorkerError
            ? (status as { error: string }).error
            : "Esse é o número operacional Saf que entra em todos os grupos das famílias clientes."
        }
      />

      {isWorkerError && (
        <div className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)] p-3 text-xs text-[var(--color-warning)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Worker não está acessível.</p>
            <p className="mt-0.5">
              Suba o worker no Fly.io (ver TRADEOFFS.md) e defina{" "}
              <code>WHATSAPP_WORKER_URL</code> + <code>WHATSAPP_WORKER_SECRET</code> na
              Vercel.
            </p>
          </div>
        </div>
      )}

      {/* Pairing form / Pairing code exibido */}
      {!isWorkerError && live?.status !== "connected" && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-soft">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
            Passo 1 · Vincular chip Saf
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">
            Parear via{" "}
            <span className="display-serif italic">código de 8 dígitos</span>
          </h3>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            Mais simples do que QR. Você digita o código no app WhatsApp do celular Saf novo.
          </p>

          {!pairing && (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label htmlFor="saf-phone" className="text-xs">
                  Telefone do chip Saf (E.164)
                </Label>
                <div className="relative mt-1">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-fg-subtle)]" />
                  <Input
                    id="saf-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+5531999999999"
                    autoComplete="off"
                    className="pl-9"
                  />
                </div>
              </div>
              <Button onClick={onPair} disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Gerar código
              </Button>
            </div>
          )}

          {pairing && (
            <div className="mt-5 space-y-4">
              <div className="rounded-[var(--radius)] border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]/50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
                  Código de pareamento
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <p className="num font-mono text-3xl tracking-[0.4em] text-[var(--color-fg)]">
                    {pairing.code}
                  </p>
                  <Button variant="ghost" size="sm" onClick={copyCode}>
                    {copied ? (
                      <Check className="h-4 w-4 text-[var(--color-income)]" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                </div>
                <p className="mt-2 text-[11px] text-[var(--color-fg-muted)]">
                  Expira em ~{pairing.expiresInSeconds}s. Se passar, clique em Gerar código de
                  novo.
                </p>
              </div>

              <ol className="space-y-2 text-sm">
                <li className="flex gap-3">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[10px] font-semibold text-[var(--color-primary)]">
                    1
                  </span>
                  <span className="text-[var(--color-fg)]">
                    No celular Saf, abra o WhatsApp e vá em{" "}
                    <strong>Configurações → Aparelhos conectados</strong>.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[10px] font-semibold text-[var(--color-primary)]">
                    2
                  </span>
                  <span className="text-[var(--color-fg)]">
                    Toque em <strong>Conectar um aparelho</strong> →{" "}
                    <strong>Vincular com número de telefone</strong>.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[10px] font-semibold text-[var(--color-primary)]">
                    3
                  </span>
                  <span className="text-[var(--color-fg)]">
                    Digite o código acima. Se conectar, esta tela atualiza pra{" "}
                    <strong>Conectado</strong> em alguns segundos.
                  </span>
                </li>
              </ol>

              <Button variant="ghost" size="sm" onClick={onRefresh}>
                <RefreshCw className={"h-4 w-4 " + (pending ? "animate-spin" : "")} /> Atualizar
                status
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Quando connected */}
      {!isWorkerError && live?.status === "connected" && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-income)]/30 bg-[var(--color-income-soft)]/40 p-6 shadow-soft">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-income)]">
            Saf conectado
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">
            Pronto pra entrar em grupos.
          </h3>
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
            O número <strong className="text-[var(--color-fg)]">{live.pairedPhone}</strong>{" "}
            está online no worker. Famílias podem agora adicioná-lo nos grupos delas e mandar{" "}
            <code>vincular CÓDIGO</code> pra vincular o grupo à conta.
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" size="sm" onClick={onRefresh}>
              <RefreshCw className={"h-4 w-4 " + (pending ? "animate-spin" : "")} /> Atualizar
              status
            </Button>
            <Button variant="ghost" size="sm" onClick={onUnpair}>
              <Power className="h-4 w-4" /> Desconectar
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)] p-3 text-xs text-[var(--color-expense)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <Badge variant="default" className="inline-flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-fg-subtle)]" />
        Modelo: 1 número Saf compartilhado entre todas as famílias
      </Badge>
    </div>
  );
}
