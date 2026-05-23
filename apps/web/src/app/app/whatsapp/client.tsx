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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  // Polling enquanto está pareando ou no modo real (worker pode mudar estado fora do nosso request).
  React.useEffect(() => {
    if (view.mode !== "real") return;
    if (view.status !== "qr_pending" && view.status !== "connected") return;
    const interval = setInterval(async () => {
      try {
        const next = await getSessionView();
        setView(next);
      } catch {
        /* ignore */
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [view.mode, view.status]);

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
    if (!confirm("Despareia a sessão do WhatsApp?")) return;
    setLoading("unpair");
    try {
      const next = await unpair();
      setView(next);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">WhatsApp</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Pareie o grupo da família e cada mensagem com gasto vira transação.
        </p>
      </div>

      {view.mode === "sim" && (
        <div className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)] p-3 text-xs text-[var(--color-warning)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Modo simulado</p>
            <p className="mt-0.5">
              O worker do whatsapp-web.js ainda não está rodando. Você consegue pareiar um grupo
              fake para ver o fluxo. Defina{" "}
              <code>WHATSAPP_MODE=real</code> + <code>WHATSAPP_WORKER_URL</code> +{" "}
              <code>WHATSAPP_WORKER_SECRET</code> pra ligar o worker.
            </p>
          </div>
        </div>
      )}

      {view.status === "unpaired" || view.status === "disconnected" ? (
        <UnpairedCard onStart={start} loading={loading === "start"} />
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
            <CardDescription>
              Algo está fora do comum. Tente parear de novo.
            </CardDescription>
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

function UnpairedCard({ onStart, loading }: { onStart: () => void; loading: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Conectar o grupo da família</CardTitle>
        <CardDescription>
          O fluxo é igual ao do WhatsApp Web: a gente gera um QR, você lê com o celular
          de quem está no grupo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button size="lg" onClick={onStart} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
          {loading ? "Preparando..." : "Gerar QR Code"}
        </Button>
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
          {view.mode === "sim"
            ? "Modo demo: preencha os campos abaixo e clique em 'Simular pareamento'."
            : "Abra o WhatsApp no celular → Aparelhos conectados → Conectar um aparelho → Escaneie o QR."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid place-items-center rounded-[var(--radius)] border border-[var(--color-border)] bg-white p-4">
          {view.qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={view.qrDataUrl}
              alt="QR code do WhatsApp"
              className="h-56 w-56"
            />
          ) : (
            <QrPlaceholder payload={view.qrPayload ?? "—"} />
          )}
          <p className="mt-3 text-xs text-[var(--color-fg-subtle)]">
            {view.mode === "real"
              ? "QR válido por ~60s — atualiza sozinho se expirar."
              : "QR ilustrativo — modo simulado."}
          </p>
        </div>

        {view.mode === "sim" && (
          <div className="space-y-3 rounded-[var(--radius)] border border-dashed border-[var(--color-border)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-fg-subtle)]">
              Simular pareamento
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="wa-phone">Telefone que pareou</Label>
                <Input
                  id="wa-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+55 11 99999-9999"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="wa-group-name">Nome do grupo no WhatsApp</Label>
                <Input
                  id="wa-group-name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Família 🏠"
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
            <Users className="h-5 w-5 text-[var(--color-primary)]" />
            Escolha o grupo da família
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCcw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} />
            Recarregar
          </Button>
        </div>
        <CardDescription>
          Selecione qual grupo a gente deve monitorar — só mensagens desse grupo viram transação.
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
            Nenhum grupo encontrado. Você está em algum grupo no número que pareou? Crie um
            grupo no celular e clique em &ldquo;Recarregar&rdquo;.
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
                <Button
                  size="sm"
                  onClick={() => pick(g)}
                  disabled={picking !== null}
                >
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
          A partir de agora, mensagens com gasto/recebimento viram transação automaticamente.
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
              Grupo monitorado
            </dt>
            <dd className="mt-0.5 font-medium">{view.monitoredGroupName ?? "—"}</dd>
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
            className={
              "rounded-[1px] " + (seed < 50 ? "bg-neutral-900" : "bg-transparent")
            }
          />
        );
      })}
    </div>
  );
}
