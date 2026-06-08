"use client";

import * as React from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  RefreshCcw,
  Unlink,
  Wallet,
  AlertCircle,
  CreditCard,
  Landmark,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, StatCard, Section } from "@/components/ui/page-header";
import { BentoCard } from "@/components/ui/bento";
import { syncBankConnection, disconnectBank, type BankView } from "@/lib/pluggy";
import { formatBRL } from "@/lib/utils";

// Type bridge pro script global do Pluggy
declare global {
  interface Window {
    PluggyConnect?: new (config: {
      connectToken: string;
      includeSandbox?: boolean;
      onSuccess: (item: { item: { id: string } }) => void;
      onError?: (err: unknown) => void;
      onClose?: () => void;
    }) => { init: () => void };
  }
}

export function ContasClient({
  initial,
  pluggyEnabled,
}: {
  initial: BankView[];
  pluggyEnabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [openingWidget, setOpeningWidget] = React.useState(false);
  const [globalError, setGlobalError] = React.useState<string | null>(null);
  const [pluggyReady, setPluggyReady] = React.useState(
    typeof window !== "undefined" && Boolean(window.PluggyConnect),
  );

  async function waitForPluggySdk(timeoutMs = 8000): Promise<void> {
    if (window.PluggyConnect) return;
    return new Promise<void>((resolve, reject) => {
      const start = Date.now();
      const tick = () => {
        if (window.PluggyConnect) {
          setPluggyReady(true);
          resolve();
          return;
        }
        if (Date.now() - start > timeoutMs) {
          reject(
            new Error(
              "SDK Pluggy não carregou. Verifique sua conexão ou bloqueadores de script.",
            ),
          );
          return;
        }
        setTimeout(tick, 100);
      };
      tick();
    });
  }

  async function openPluggyWidget() {
    setOpeningWidget(true);
    setGlobalError(null);
    try {
      await waitForPluggySdk();
      // 1. Pede token ao server
      const tokenRes = await fetch("/api/pluggy/connect-token", { method: "POST" });
      if (!tokenRes.ok) {
        const j = (await tokenRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Falha ao obter token");
      }
      const { token } = (await tokenRes.json()) as { token: string };

      // 2. Abre o widget
      const PluggyConnect = window.PluggyConnect!;
      const connect = new PluggyConnect({
        connectToken: token,
        includeSandbox: false,
        onSuccess: async ({ item }) => {
          setBusy("register");
          try {
            const reg = await fetch("/api/pluggy/register-item", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ itemId: item.id }),
            });
            if (!reg.ok) {
              const j = (await reg.json().catch(() => ({}))) as { error?: string };
              throw new Error(j.error ?? "Falha ao registrar");
            }
            router.refresh();
          } catch (err) {
            setGlobalError(err instanceof Error ? err.message : "Erro");
          } finally {
            setBusy(null);
          }
        },
        onError: (err) => {
          setGlobalError(String(err));
        },
        onClose: () => {
          setOpeningWidget(false);
        },
      });
      connect.init();
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Erro");
      setOpeningWidget(false);
    }
  }

  async function handleSync(connId: string) {
    setBusy(connId);
    const r = await syncBankConnection(connId);
    setBusy(null);
    if (!r.ok) setGlobalError(r.error);
    else router.refresh();
  }

  async function handleDisconnect(connId: string, name: string) {
    if (!confirm(`Desconectar "${name}"? As transações já importadas continuam.`)) return;
    setBusy(connId);
    const r = await disconnectBank(connId);
    setBusy(null);
    if (!r.ok) setGlobalError(r.error);
    else router.refresh();
  }

  const totalBalance = initial.reduce(
    (acc, b) => acc + b.accounts.reduce((s, a) => s + (a.balanceCents ?? 0), 0),
    0,
  );
  const accountCount = initial.reduce((acc, b) => acc + b.accounts.length, 0);
  const activeCount = initial.filter((b) => b.status === "active").length;
  const errorCount = initial.filter((b) => b.status === "error").length;

  return (
    <div className="space-y-8">
      {/* Carrega o script do Pluggy só uma vez */}
      <Script
        src="https://cdn.pluggy.ai/pluggy-connect/latest/pluggy-connect.js"
        strategy="afterInteractive"
        onReady={() => setPluggyReady(true)}
        onLoad={() => setPluggyReady(true)}
        onError={() =>
          setGlobalError("Falha ao baixar o SDK do Pluggy. Verifique conexão/bloqueadores.")
        }
      />

      <PageHeader
        eyebrow="Plataforma · Contas"
        title={
          <>
            Bancos no <span className="display-serif italic">piloto automático</span>
          </>
        }
        description="Conecte via Open Finance pra ver saldo e extrato em tempo real. Sync dos últimos 90 dias é automático."
        actions={
          <Button
            onClick={openPluggyWidget}
            disabled={!pluggyEnabled || openingWidget || !pluggyReady}
            title={!pluggyReady ? "Aguarde — SDK do Pluggy carregando" : undefined}
          >
            {openingWidget || !pluggyReady ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {!pluggyReady ? "Carregando..." : "Conectar banco"}
          </Button>
        }
        tone="primary"
      />

      {!pluggyEnabled && (
        <div className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)] p-3 text-xs text-[var(--color-warning)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Pluggy não configurado. Admin precisa adicionar Client ID e Secret em{" "}
            <strong>Admin → Integrações</strong>.
          </p>
        </div>
      )}

      {globalError && (
        <div className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)] p-3 text-xs text-[var(--color-expense)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{globalError}</p>
        </div>
      )}

      {initial.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center shadow-soft">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            <Wallet className="h-6 w-6" />
          </span>
          <h3 className="mt-4 text-lg font-semibold tracking-tight">Nenhum banco conectado</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-fg-muted)]">
            Clique em &ldquo;Conectar banco&rdquo; e escolha Nubank, Itaú, Inter, BB ou outro. Sync
            dos últimos 90 dias automático.
          </p>
        </div>
      ) : (
        <>
          <div className="grid auto-rows-[minmax(120px,_auto)] grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <BentoCard
              span="col-span-2 lg:row-span-2"
              tone={totalBalance >= 0 ? "income" : "expense"}
              eyebrow="Saldo total"
              metric={
                <span className="num">
                  <span className="text-base font-normal text-[var(--color-fg-muted)] align-top mr-1">
                    R$
                  </span>
                  {(Math.abs(totalBalance) / 100).toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              }
              footnote={
                <span className="inline-flex items-center gap-1.5">
                  {totalBalance >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-[var(--color-income)]" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-[var(--color-expense)]" />
                  )}
                  <span>
                    consolidado em {initial.length}{" "}
                    {initial.length === 1 ? "banco" : "bancos"}
                  </span>
                </span>
              }
            >
              <p className="mt-2 text-[11px] text-[var(--color-fg-subtle)]">
                {accountCount} {accountCount === 1 ? "conta" : "contas"} sincronizadas
              </p>
            </BentoCard>

            <StatCard
              tone="primary"
              label="Bancos conectados"
              value={<span className="num">{initial.length}</span>}
              icon={<Landmark className="h-4 w-4 text-[var(--color-primary)]" />}
              trend={`${activeCount} ${activeCount === 1 ? "ativo" : "ativos"}`}
            />

            <StatCard
              tone={errorCount > 0 ? "expense" : "default"}
              label="Status"
              value={
                <span className="num">
                  {errorCount > 0 ? errorCount : activeCount}
                  <span className="ml-1 text-sm font-normal text-[var(--color-fg-muted)]">
                    {errorCount > 0 ? "com erro" : "ok"}
                  </span>
                </span>
              }
              icon={
                errorCount > 0 ? (
                  <AlertCircle className="h-4 w-4 text-[var(--color-expense)]" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )
              }
              trend={
                errorCount > 0
                  ? "verifique os bancos abaixo"
                  : "todos sincronizando"
              }
            />
          </div>

          <Section eyebrow="Conexões" title="Bancos sincronizados">
            <div className="space-y-4">
              {initial.map((b) => (
                <BankCard
                  key={b.id}
                  bank={b}
                  busy={busy === b.id || busy === "register"}
                  onSync={() => handleSync(b.id)}
                  onDisconnect={() => handleDisconnect(b.id, b.institutionName)}
                />
              ))}
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

function BankCard({
  bank,
  busy,
  onSync,
  onDisconnect,
}: {
  bank: BankView;
  busy: boolean;
  onSync: () => void;
  onDisconnect: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {bank.institutionLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bank.institutionLogoUrl}
                alt={bank.institutionName}
                className="h-10 w-10 rounded-md object-contain"
              />
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded-md bg-[var(--color-primary-soft)]">
                <CreditCard className="h-5 w-5 text-[var(--color-primary)]" />
              </div>
            )}
            <div>
              <CardTitle className="text-base">{bank.institutionName}</CardTitle>
              <CardDescription>
                {bank.status === "active" ? (
                  <Badge variant="income">conectado</Badge>
                ) : bank.status === "error" ? (
                  <Badge variant="expense">erro</Badge>
                ) : (
                  <Badge variant="warning">{bank.status}</Badge>
                )}{" "}
                {bank.lastSyncedAt && (
                  <span className="text-[10px]">
                    · sync {new Date(bank.lastSyncedAt).toLocaleString("pt-BR")}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onSync} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={onDisconnect} disabled={busy}>
              <Unlink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {bank.accounts.length === 0 ? (
          <p className="text-sm text-[var(--color-fg-muted)]">Sem contas.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--color-border)]">
            {bank.accounts.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium">{a.nickname ?? a.type}</p>
                  <p className="text-[10px] text-[var(--color-fg-subtle)]">
                    {a.type}
                    {a.lastFour && ` · ····${a.lastFour}`}
                    {a.creditLimitCents != null &&
                      ` · limite ${formatBRL(a.creditLimitCents)}`}
                  </p>
                </div>
                <span
                  className={
                    "num text-sm font-medium " +
                    (a.balanceCents == null
                      ? "text-[var(--color-fg-muted)]"
                      : a.balanceCents >= 0
                        ? "text-[var(--color-income)]"
                        : "text-[var(--color-expense)]")
                  }
                >
                  {a.balanceCents != null ? formatBRL(a.balanceCents) : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
        {bank.lastError && (
          <p className="mt-3 rounded-[var(--radius)] border border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)] px-3 py-2 text-xs text-[var(--color-expense)]">
            {bank.lastError}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
