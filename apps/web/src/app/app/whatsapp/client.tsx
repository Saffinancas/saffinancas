"use client";

import * as React from "react";
import {
  Loader2,
  QrCode,
  CheckCircle2,
  RefreshCcw,
  Unlink,
  AlertCircle,
  Users,
  Copy,
  PhoneCall,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PulseDot } from "@/components/ui/bento";
import {
  getSessionView,
  requestPairing,
  simulateConnect,
  unpair,
  listGroups,
  selectGroup,
  type WaSessionView,
  type WaGroup,
} from "@/lib/whatsapp";

export function WhatsappClient({ initial }: { initial: WaSessionView }) {
  const [view, setView] = React.useState(initial);
  const [loading, setLoading] = React.useState<string | null>(null);

  // Polling: 3s pra web_js (QR), 5s pra webhook providers (aguarda vincular)
  React.useEffect(() => {
    const isWebhook = view.provider === "twilio_sandbox" || view.provider === "twilio_production" || view.provider === "meta_cloud";
    const shouldPoll =
      (view.provider === "web_js" && (view.status === "qr_pending" || view.status === "connected")) ||
      (isWebhook && view.status === "qr_pending");
    if (!shouldPoll) return;
    const interval = setInterval(async () => {
      try {
        const next = await getSessionView();
        setView(next);
      } catch {
        /* ignore */
      }
    }, isWebhook ? 5000 : 3000);
    return () => clearInterval(interval);
  }, [view.provider, view.status]);

  async function start() {
    setLoading("start");
    try {
      const next = await requestPairing();
      setView(next);
    } finally {
      setLoading(null);
    }
  }

  async function disconnect() {
    if (!confirm("Despareiar a sessão do WhatsApp?")) return;
    setLoading("unpair");
    try {
      const next = await unpair();
      setView(next);
    } finally {
      setLoading(null);
    }
  }

  const isWebhook =
    view.provider === "twilio_sandbox" || view.provider === "twilio_production" || view.provider === "meta_cloud";

  const connected = view.status === "connected" && Boolean(view.monitoredGroupId);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Plataforma · WhatsApp"
        title={
          <>
            Captura via <span className="display-serif italic">WhatsApp</span>
          </>
        }
        description={view.pairingInstructions}
        tone="income"
        actions={
          connected ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-income)]/30 bg-[var(--color-income-soft)] px-3 py-1.5 text-xs font-medium text-[var(--color-income)]">
              <PulseDot color="var(--color-income)" /> ativo
            </span>
          ) : null
        }
      />

      {view.provider === "sim" && (
        <div className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)] p-3 text-xs text-[var(--color-warning)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Modo simulado. Admin pode trocar o provedor em <code>Admin → WhatsApp</code>.
          </p>
        </div>
      )}

      {view.status === "unpaired" || view.status === "disconnected" ? (
        <UnpairedCard view={view} onStart={start} loading={loading === "start"} />
      ) : isWebhook ? (
        view.linkCode ? (
          <LinkCodeCard view={view} onRefresh={start} />
        ) : view.monitoredGroupId ? (
          <ConnectedCard view={view} onUnpair={disconnect} loading={loading === "unpair"} />
        ) : (
          <UnpairedCard view={view} onStart={start} loading={loading === "start"} />
        )
      ) : view.status === "qr_pending" ? (
        <QrPendingCard view={view} onUpdate={setView} />
      ) : view.status === "connected" ? (
        view.monitoredGroupId ? (
          <ConnectedCard view={view} onUnpair={disconnect} loading={loading === "unpair"} />
        ) : (
          <GroupPickerCard onPicked={setView} />
        )
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Status: {view.status}</CardTitle>
            <CardDescription>Tente novamente.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={start}>
              <RefreshCcw className="h-4 w-4" /> Tentar de novo
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function UnpairedCard({
  view,
  onStart,
  loading,
}: {
  view: WaSessionView;
  onStart: () => void;
  loading: boolean;
}) {
  const isWebhook =
    view.provider === "twilio_sandbox" || view.provider === "twilio_production" || view.provider === "meta_cloud";
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {view.needsQrPairing ? "Conectar o grupo da família" : "Vincular o WhatsApp"}
        </CardTitle>
        <CardDescription>
          {view.needsQrPairing
            ? "A gente gera um QR — você lê com o WhatsApp do celular."
            : "Geramos um código curto. Você manda no WhatsApp pro nosso bot, e pronto."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button size="lg" onClick={onStart} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : view.needsQrPairing ? (
            <QrCode className="h-4 w-4" />
          ) : (
            <MessageCircle className="h-4 w-4" />
          )}
          {loading
            ? "Preparando..."
            : view.needsQrPairing
              ? "Gerar QR Code"
              : isWebhook
                ? "Gerar código de vinculação"
                : "Conectar"}
        </Button>
      </CardContent>
    </Card>
  );
}

function LinkCodeCard({
  view,
  onRefresh,
}: {
  view: WaSessionView;
  onRefresh: () => void;
}) {
  const sandbox = view.provider === "twilio_sandbox";

  async function copyCode() {
    if (!view.linkCode) return;
    await navigator.clipboard.writeText(view.linkCode).catch(() => {});
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PhoneCall className="h-5 w-5 text-[var(--color-primary)]" />
          Vincule seu WhatsApp
        </CardTitle>
        <CardDescription>
          Siga os passos no celular. Quando o bot receber o código, este cartão atualiza sozinho.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="ml-5 list-decimal space-y-3 text-sm">
          <li>
            <strong>Salve este número no seu celular:</strong>
            <div className="mt-1 flex items-center gap-2">
              <code className="rounded-[var(--radius)] bg-[var(--color-surface-muted)] px-2 py-1 text-sm">
                {view.botIdentifier ?? "(número não configurado pelo admin)"}
              </code>
            </div>
          </li>
          {sandbox && (
            <li>
              <strong>Ative o sandbox Twilio</strong> (única vez): mande esta mensagem
              pro número acima:
              {view.sandboxJoinCode ? (
                <div className="mt-2 flex items-center gap-2 rounded-[var(--radius)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-2">
                  <code className="font-bold tracking-wider">{view.sandboxJoinCode}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      navigator.clipboard.writeText(view.sandboxJoinCode ?? "")
                    }
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <span className="text-[var(--color-fg-muted)]">
                  {" "}
                  (admin ainda não configurou o &ldquo;join code&rdquo;)
                </span>
              )}
            </li>
          )}
          <li>
            <strong>Mande esta mensagem</strong> pro bot:
            <div className="mt-2 flex items-center gap-2 rounded-[var(--radius)] border-2 border-dashed border-[var(--color-primary)]/40 bg-[var(--color-primary-soft)]/30 p-3">
              <code className="text-lg font-bold tracking-wider">vincular {view.linkCode}</code>
              <Button variant="ghost" size="sm" onClick={copyCode}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="mt-1 text-[10px] text-[var(--color-fg-subtle)]">
              Válido até{" "}
              {view.linkCodeExpiresAt &&
                new Date(view.linkCodeExpiresAt).toLocaleString("pt-BR")}
            </p>
          </li>
          <li>
            Pronto. O bot responde &ldquo;✓ Vinculado&rdquo; e esta tela atualiza.
          </li>
        </ol>

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCcw className="h-3.5 w-3.5" /> Gerar novo código
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function QrPendingCard({
  view,
  onUpdate,
}: {
  view: WaSessionView;
  onUpdate: (v: WaSessionView) => void;
}) {
  const [phone, setPhone] = React.useState("+5511999999999");
  const [groupName, setGroupName] = React.useState("Família 🏠");
  const [loading, setLoading] = React.useState(false);

  async function fakeConnect() {
    setLoading(true);
    try {
      const next = await simulateConnect({ phone, groupName });
      onUpdate(next);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aguardando pareamento</CardTitle>
        <CardDescription>
          {view.provider === "sim"
            ? "Modo demo: preencha abaixo e clique em 'Simular pareamento'."
            : "Abra o WhatsApp no celular → Aparelhos conectados → Conectar um aparelho → escaneie."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid place-items-center rounded-[var(--radius)] border border-[var(--color-border)] bg-white p-4">
          {view.qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={view.qrDataUrl} alt="QR code do WhatsApp" className="h-56 w-56" />
          ) : (
            <QrPlaceholder payload={view.qrPayload ?? "—"} />
          )}
          <p className="mt-3 text-xs text-[var(--color-fg-subtle)]">
            {view.provider === "web_js"
              ? "QR válido ~60s — regenera sozinho."
              : "QR ilustrativo (modo simulado)."}
          </p>
        </div>

        {view.provider === "sim" && (
          <div className="space-y-3 rounded-[var(--radius)] border border-dashed border-[var(--color-border)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">
              Simular pareamento
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="wa-phone">Telefone que pareou</Label>
                <Input id="wa-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="wa-group-name">Nome do grupo</Label>
                <Input
                  id="wa-group-name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={fakeConnect} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Simular pareamento
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GroupPickerCard({ onPicked }: { onPicked: (v: WaSessionView) => void }) {
  const [groups, setGroups] = React.useState<WaGroup[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [picking, setPicking] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listGroups();
      setGroups(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao listar grupos.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function pick(group: WaGroup) {
    setPicking(group.id);
    try {
      const next = await selectGroup(group.id, group.name);
      onPicked(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao selecionar grupo.");
    } finally {
      setPicking(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[var(--color-primary)]" /> Escolha o grupo da família
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCcw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} /> Recarregar
          </Button>
        </div>
        <CardDescription>
          Só mensagens desse grupo viram transação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <p className="mb-3 rounded-[var(--radius)] border border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)] px-3 py-2 text-xs text-[var(--color-expense)]">
            {error}
          </p>
        )}
        {loading && !groups ? (
          <div className="flex items-center gap-2 text-sm text-[var(--color-fg-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando grupos...
          </div>
        ) : groups && groups.length === 0 ? (
          <p className="text-sm text-[var(--color-fg-muted)]">
            Nenhum grupo. Crie um grupo no celular e clique &ldquo;Recarregar&rdquo;.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--color-border)]">
            {(groups ?? []).map((g) => (
              <li key={g.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium">{g.name}</p>
                  <p className="text-[10px] text-[var(--color-fg-subtle)]">
                    {g.participants} participantes
                  </p>
                </div>
                <Button size="sm" onClick={() => pick(g)} disabled={picking !== null}>
                  {picking === g.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  Usar este
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ConnectedCard({
  view,
  onUnpair,
  loading,
}: {
  view: WaSessionView;
  onUnpair: () => void;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Conectado</CardTitle>
          <Badge variant="income">
            <CheckCircle2 className="h-3 w-3" /> ativo
          </Badge>
        </div>
        <CardDescription>
          Cada mensagem com gasto/recebimento vira transação automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
              Telefone pareado
            </dt>
            <dd className="mt-0.5 font-medium">{view.pairedPhone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
              {view.supportsGroups ? "Grupo monitorado" : "Chat"}
            </dt>
            <dd className="mt-0.5 font-medium">{view.monitoredGroupName ?? "DM com o bot"}</dd>
          </div>
        </dl>

        <Button variant="ghost" size="sm" onClick={onUnpair} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4" />}
          Despareiar
        </Button>
      </CardContent>
    </Card>
  );
}

function QrPlaceholder({ payload }: { payload: string }) {
  return (
    <div className="grid h-48 w-48 grid-cols-12 grid-rows-12 gap-0.5 rounded-[var(--radius)] bg-white p-3">
      {Array.from({ length: 144 }).map((_, i) => {
        const seed = (i * 137 + payload.charCodeAt(i % payload.length || 0)) % 100;
        return (
          <span
            key={i}
            className={"rounded-[1px] " + (seed < 50 ? "bg-neutral-900" : "bg-transparent")}
          />
        );
      })}
    </div>
  );
}
