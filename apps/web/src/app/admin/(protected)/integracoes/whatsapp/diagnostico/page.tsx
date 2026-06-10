import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Section } from "@/components/ui/page-header";
import { BentoCard, PulseDot } from "@/components/ui/bento";
import { getSafStatus, listSafGroups } from "@/lib/saf-whatsapp";
import { PurgeLegacyButton } from "./purge-button";

export const dynamic = "force-dynamic";

const WORKER_URL = process.env.WHATSAPP_WORKER_URL ?? "";
const WORKER_SECRET = process.env.WHATSAPP_WORKER_SECRET ?? "";

async function workerHealth(): Promise<{
  ok: boolean;
  status?: number;
  body?: unknown;
  error?: string;
}> {
  if (!WORKER_URL) return { ok: false, error: "WHATSAPP_WORKER_URL não setado" };
  try {
    const r = await fetch(`${WORKER_URL.replace(/\/$/, "")}/health`, {
      cache: "no-store",
    });
    const body = await r.json().catch(() => null);
    return { ok: r.ok, status: r.status, body };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export default async function WhatsappDiagnosticoPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/admin/login");
  if ((session.user as { role?: string }).role !== "admin") redirect("/admin");

  const [health, safStatus, safGroups, sessions, links, recentMessages] = await Promise.all([
    workerHealth(),
    getSafStatus(),
    listSafGroups(),
    db
      .select()
      .from(schema.whatsappSessions)
      .orderBy(desc(schema.whatsappSessions.updatedAt))
      .limit(5),
    db
      .select()
      .from(schema.whatsappGroupLinks)
      .orderBy(desc(schema.whatsappGroupLinks.linkedAt))
      .limit(10),
    db
      .select({
        familyId: schema.whatsappMessages.familyId,
        waMessageId: schema.whatsappMessages.waMessageId,
        waChatId: schema.whatsappMessages.waChatId,
        senderPhone: schema.whatsappMessages.senderPhone,
        body: schema.whatsappMessages.body,
        receivedAt: schema.whatsappMessages.receivedAt,
        discardedReason: schema.whatsappMessages.discardedReason,
      })
      .from(schema.whatsappMessages)
      .orderBy(desc(schema.whatsappMessages.receivedAt))
      .limit(10),
  ]);

  const safIsConnected =
    safStatus && "status" in safStatus && safStatus.status === "connected";
  const workerOnline = health.ok;
  const groupsCount =
    safGroups && "groups" in safGroups ? safGroups.groups.length : null;

  return (
    <div className="space-y-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/admin/integracoes/whatsapp">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      </Button>

      <PageHeader
        eyebrow="WhatsApp · Diagnóstico"
        title={
          <>
            Estado <span className="display-serif italic">ao vivo</span>
          </>
        }
        description="Espelho do worker + DB. Útil quando uma mensagem do grupo não está virando transação."
        tone="warning"
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin/integracoes/whatsapp/diagnostico">
              <RefreshCw className="h-4 w-4" /> Atualizar
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <BentoCard
          tone={workerOnline ? "income" : "expense"}
          eyebrow={
            <span className="inline-flex items-center gap-1.5">
              {workerOnline && <PulseDot color="var(--color-income)" />}
              Worker (Fly.io)
            </span>
          }
          title={workerOnline ? "Online" : "OFFLINE"}
          metric={
            (health.body as { activeSessions?: number } | null)?.activeSessions != null
              ? `${(health.body as { activeSessions: number }).activeSessions} sessões ativas`
              : health.error ?? "—"
          }
          footnote={
            (health.body as { uptime?: number } | null)?.uptime
              ? `uptime: ${formatUptime((health.body as { uptime: number }).uptime)}`
              : `HTTP ${health.status ?? "?"}`
          }
        />

        <BentoCard
          tone={safIsConnected ? "income" : "warning"}
          eyebrow={
            <span className="inline-flex items-center gap-1.5">
              {safIsConnected && <PulseDot color="var(--color-income)" />}
              Sessão Saf
            </span>
          }
          title={
            "error" in safStatus
              ? "Erro"
              : safStatus.status === "connected"
                ? "Conectada"
                : safStatus.status === "qr_pending"
                  ? "Aguardando pareamento"
                  : safStatus.status
          }
          metric={
            "error" in safStatus
              ? null
              : safStatus.pairedPhone ?? (
                  <span className="text-base font-normal text-[var(--color-fg-muted)]">
                    Sem pareamento
                  </span>
                )
          }
          footnote={
            "error" in safStatus
              ? safStatus.error
              : "1 chip Saf operacional global"
          }
        />

        <BentoCard
          tone="primary"
          eyebrow="Grupos do Saf"
          title={
            groupsCount != null
              ? groupsCount > 0
                ? `${groupsCount} grupo${groupsCount === 1 ? "" : "s"}`
                : "Nenhum grupo ainda"
              : "—"
          }
          footnote={
            groupsCount != null && groupsCount === 0
              ? "Saf ainda não foi adicionado em nenhum grupo"
              : safGroups && "error" in safGroups
                ? safGroups.error
                : "vistos via WhatsApp Web"
          }
        >
          {safGroups && "groups" in safGroups && safGroups.groups.length > 0 && (
            <ul className="space-y-1 text-[11px]">
              {safGroups.groups.slice(0, 4).map((g) => (
                <li key={g.id} className="truncate text-[var(--color-fg-muted)]">
                  · {g.name} ({g.participants})
                </li>
              ))}
            </ul>
          )}
        </BentoCard>
      </div>

      <PurgeLegacyButton />

      <Section
        eyebrow="Banco"
        title="whatsapp_sessions (últimas 5)"
        description="Sessões por família. Note linkCode + expiresAt."
      >
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-soft">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-fg-subtle)]">
                <th className="px-3 py-2 font-medium">familyId</th>
                <th className="px-3 py-2 font-medium">provider</th>
                <th className="px-3 py-2 font-medium">status</th>
                <th className="px-3 py-2 font-medium">linkCode</th>
                <th className="px-3 py-2 font-medium">expira</th>
                <th className="px-3 py-2 font-medium">pairedPhone</th>
                <th className="px-3 py-2 font-medium">updatedAt</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-b border-[var(--color-border)] last:border-b-0">
                  <td className="px-3 py-2 font-mono text-[10px]">{s.familyId}</td>
                  <td className="px-3 py-2">{s.provider ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Badge variant={s.status === "connected" ? "income" : "default"}>
                      {s.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 font-mono">{s.linkCode ?? "—"}</td>
                  <td className="px-3 py-2">
                    {s.linkCodeExpiresAt
                      ? formatDelta(s.linkCodeExpiresAt as Date)
                      : "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px]">
                    {s.pairedPhone ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-fg-muted)]">
                    {s.updatedAt?.toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-[var(--color-fg-muted)]">
                    Sem sessões registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        eyebrow="Banco"
        title="whatsapp_group_links (últimos 10)"
        description="Cada linha = um grupo vinculado a uma família. archivedAt preenchido = link inativo."
      >
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-soft">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-fg-subtle)]">
                <th className="px-3 py-2 font-medium">familyId</th>
                <th className="px-3 py-2 font-medium">provider</th>
                <th className="px-3 py-2 font-medium">externalChatId</th>
                <th className="px-3 py-2 font-medium">grupo?</th>
                <th className="px-3 py-2 font-medium">linkedAt</th>
                <th className="px-3 py-2 font-medium">archived</th>
              </tr>
            </thead>
            <tbody>
              {links.map((l, i) => (
                <tr key={i} className="border-b border-[var(--color-border)] last:border-b-0">
                  <td className="px-3 py-2 font-mono text-[10px]">{l.familyId}</td>
                  <td className="px-3 py-2">{l.provider}</td>
                  <td className="px-3 py-2 font-mono text-[10px]">{l.externalChatId}</td>
                  <td className="px-3 py-2">{l.isGroup ? "✓" : "—"}</td>
                  <td className="px-3 py-2 text-[var(--color-fg-muted)]">
                    {l.linkedAt?.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-fg-muted)]">
                    {l.archivedAt ? l.archivedAt.toLocaleDateString("pt-BR") : "—"}
                  </td>
                </tr>
              ))}
              {links.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-[var(--color-fg-muted)]">
                    Sem links registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        eyebrow="Banco"
        title="whatsapp_messages (últimas 10)"
        description="Cada mensagem capturada pelo worker. Se o cliente mandou no grupo e nada aparece aqui, a sessão Saf NÃO recebeu."
      >
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-soft">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-fg-subtle)]">
                <th className="px-3 py-2 font-medium">familyId</th>
                <th className="px-3 py-2 font-medium">chat</th>
                <th className="px-3 py-2 font-medium">sender</th>
                <th className="px-3 py-2 font-medium">body</th>
                <th className="px-3 py-2 font-medium">descartada?</th>
                <th className="px-3 py-2 font-medium">recebida</th>
              </tr>
            </thead>
            <tbody>
              {recentMessages.map((m, i) => (
                <tr key={i} className="border-b border-[var(--color-border)] last:border-b-0">
                  <td className="px-3 py-2 font-mono text-[10px]">{m.familyId}</td>
                  <td className="px-3 py-2 font-mono text-[10px] max-w-[180px] truncate">
                    {m.waChatId}
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px]">{m.senderPhone}</td>
                  <td className="px-3 py-2 max-w-[260px] truncate">{m.body ?? "(vazio)"}</td>
                  <td className="px-3 py-2">{m.discardedReason ?? "—"}</td>
                  <td className="px-3 py-2 text-[var(--color-fg-muted)]">
                    {m.receivedAt?.toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
              {recentMessages.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-[var(--color-fg-muted)]">
                    Nenhuma mensagem ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function formatDelta(d: Date): string {
  const ms = d.getTime() - Date.now();
  if (ms < 0) return `expirado há ${Math.abs(Math.round(ms / 60000))}min`;
  return `em ${Math.round(ms / 60000)}min`;
}

function formatUptime(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}min`;
  return `${(sec / 3600).toFixed(1)}h`;
}
