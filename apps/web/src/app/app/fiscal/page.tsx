import Link from "next/link";
import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { getProfileForFamily } from "@/lib/fiscal/profile";
import { summaryForFamily, listReceivables } from "@/lib/fiscal/invoices";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  FileText,
  Plus,
  Settings,
  Clock,
  AlertTriangle,
  Wallet,
} from "lucide-react";
import { formatBRL } from "@/lib/utils";
import { PROVIDER_LABEL } from "@/lib/fiscal/provider-meta";

export const dynamic = "force-dynamic";

export default async function FiscalPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const familyId = (session?.user as { familyId?: string | null })?.familyId;
  if (!familyId) return null;

  const profile = await getProfileForFamily(familyId);

  if (!profile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fiscal · NFSe</h1>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            Emita e gerencie notas fiscais de serviço direto da plataforma.
          </p>
        </div>
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-[var(--color-primary)]" />
              Configure seu perfil fiscal pra começar
            </CardTitle>
            <CardDescription>
              Cadastre os dados da sua empresa (CNPJ, IM, endereço, regime tributário) e
              escolha o provider de emissão. Sem isso, não conseguimos montar a NFSe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/app/fiscal/perfil">
                Cadastrar perfil fiscal <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [summary, receivables] = await Promise.all([
    summaryForFamily(familyId),
    listReceivables(familyId),
  ]);
  const receivablesTotal = receivables.reduce(
    (acc, r) => acc + Number(r.serviceValueCents),
    0,
  );

  const recent = await db
    .select({
      id: schema.nfseInvoices.id,
      nfseNumber: schema.nfseInvoices.nfseNumber,
      rpsNumber: schema.nfseInvoices.rpsNumber,
      status: schema.nfseInvoices.status,
      serviceValueCents: schema.nfseInvoices.serviceValueCents,
      serviceDescription: schema.nfseInvoices.serviceDescription,
      issuedAt: schema.nfseInvoices.issuedAt,
      competenceDate: schema.nfseInvoices.competenceDate,
      recipientName: schema.nfseRecipients.name,
    })
    .from(schema.nfseInvoices)
    .leftJoin(
      schema.nfseRecipients,
      eq(schema.nfseInvoices.recipientId, schema.nfseRecipients.id),
    )
    .where(eq(schema.nfseInvoices.familyId, familyId))
    .orderBy(desc(schema.nfseInvoices.createdAt))
    .limit(10);

  const activeSchedules = await db
    .select({ id: schema.nfseSchedules.id })
    .from(schema.nfseSchedules)
    .where(eq(schema.nfseSchedules.familyId, familyId));

  const hasFirstInvoice = recent.some((r) => r.status === "issued");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fiscal · NFSe</h1>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            {profile.legalName} · {PROVIDER_LABEL[profile.preferredProvider]} · {profile.environment === "producao" ? "Produção" : "Homologação"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/app/fiscal/emitir">
              <Plus className="h-4 w-4" /> Emitir NFSe
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/app/fiscal/notas">
              <FileText className="h-4 w-4" /> Todas as notas
            </Link>
          </Button>
        </div>
      </div>

      {profile.preferredProvider === "sim" && (
        <div className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)] p-3 text-xs text-[var(--color-warning)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Provider em modo SIMULADO</p>
            <p className="mt-0.5">
              As notas que você emitir aqui são FAKE — não vão pra Receita ou pra Prefeitura.
              Útil pra testar o fluxo. Pra emitir notas reais, vá em{" "}
              <Link href="/app/fiscal/perfil" className="underline-offset-4 hover:underline">
                Perfil fiscal
              </Link>{" "}
              e troque pra <strong>Focus NFe</strong>, <strong>PlugNotas</strong> ou{" "}
              <strong>PBH direto</strong>.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Notas no mês" value={summary.month.count} />
        <Stat label="Faturado no mês" value={formatBRL(summary.month.total)} tone="primary" />
        <Stat label="ISS no mês" value={formatBRL(summary.month.iss)} tone="expense" />
        <Stat
          label={`Faturado em ${new Date().getFullYear()}`}
          value={formatBRL(summary.year.total)}
          tone="income"
          hint={`${summary.year.count} nota(s)`}
        />
      </div>

      <Card
        className={
          receivables.length > 0
            ? "border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)]/30"
            : ""
        }
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-[var(--color-primary)]" />
              Contas a receber
            </CardTitle>
            <div className="flex items-center gap-2">
              {receivablesTotal > 0 && (
                <span className="num text-sm font-semibold text-[var(--color-warning)]">
                  {formatBRL(receivablesTotal)}
                </span>
              )}
              <Badge variant={receivables.length > 0 ? "warning" : "default"}>
                {receivables.length}
              </Badge>
            </div>
          </div>
          <CardDescription>
            Notas emitidas que ainda não foram pagas. Confirme o recebimento e a receita entra
            no dashboard automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {receivables.length === 0 ? (
            <p className="py-3 text-center text-xs text-[var(--color-fg-muted)]">
              Tudo pago. 🎉
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {receivables.slice(0, 8).map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      <Link
                        href={`/app/fiscal/notas/${r.id}`}
                        className="hover:underline"
                      >
                        {r.nfseNumber ?? `RPS ${r.rpsSerie} ${r.rpsNumber}`}
                      </Link>{" "}
                      <span className="text-[var(--color-fg-muted)]">·</span>{" "}
                      <span className="text-[var(--color-fg-muted)]">
                        {r.recipientName ?? "—"}
                      </span>
                    </p>
                    <p className="truncate text-[11px] text-[var(--color-fg-subtle)]">
                      Competência{" "}
                      {new Date(r.competenceDate).toLocaleDateString("pt-BR")}
                      {r.scheduleId && " · gerada por agendamento"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="num text-sm font-semibold text-[var(--color-warning)]">
                      {formatBRL(Number(r.serviceValueCents))}
                    </span>
                    <Link
                      href={`/app/fiscal/notas/${r.id}`}
                      className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                    >
                      confirmar
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {receivables.length > 8 && (
            <p className="mt-3 text-center text-[11px] text-[var(--color-fg-subtle)]">
              + {receivables.length - 8} outras. Veja em{" "}
              <Link href="/app/fiscal/notas" className="underline-offset-4 hover:underline">
                todas as notas
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--color-primary)]" />
                Agendamentos
              </CardTitle>
              <Badge variant={activeSchedules.length > 0 ? "income" : "default"}>
                {activeSchedules.length}
              </Badge>
            </div>
            <CardDescription>
              Emissão automática mensal (ex.: todo dia 10 emitir R$ 10.000).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasFirstInvoice ? (
              <Button asChild variant="secondary">
                <Link href="/app/fiscal/agendamentos">
                  Gerenciar agendamentos <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <p className="text-xs text-[var(--color-fg-muted)]">
                Emita pelo menos 1 nota manual antes — assim a gente sabe que seu perfil tá
                certo e validamos o tomador.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-[var(--color-primary)]" />
              Perfil + certificado
            </CardTitle>
            <CardDescription>
              Dados do prestador, regime tributário e certificado digital A1.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link href="/app/fiscal/perfil">
                Editar perfil <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimas notas</CardTitle>
          <CardDescription>10 mais recentes (todos os status).</CardDescription>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--color-fg-muted)]">
              Nenhuma nota ainda. Clique em &ldquo;Emitir NFSe&rdquo; pra começar.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
                  <th className="py-2 font-medium">Nº NFSe</th>
                  <th className="py-2 font-medium">Tomador</th>
                  <th className="py-2 font-medium">Descrição</th>
                  <th className="py-2 text-right font-medium">Valor</th>
                  <th className="py-2 font-medium">Status</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-muted)]"
                  >
                    <td className="py-2 font-medium">
                      <Link href={`/app/fiscal/notas/${r.id}`} className="hover:underline">
                        {r.nfseNumber ?? `RPS ${r.rpsNumber}`}
                      </Link>
                    </td>
                    <td className="py-2 text-xs">{r.recipientName ?? "—"}</td>
                    <td className="max-w-[260px] truncate py-2 text-xs text-[var(--color-fg-muted)]">
                      {r.serviceDescription}
                    </td>
                    <td className="num py-2 text-right font-medium">
                      {formatBRL(Number(r.serviceValueCents))}
                    </td>
                    <td className="py-2 text-xs">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-2 text-right">
                      <Link
                        href={`/app/fiscal/notas/${r.id}`}
                        className="text-xs text-[var(--color-primary)] hover:underline"
                      >
                        ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, "income" | "primary" | "warning" | "expense" | "default"> = {
    issued: "income",
    processing: "primary",
    queued: "primary",
    rejected: "expense",
    canceled: "default",
    draft: "default",
  };
  const label: Record<string, string> = {
    issued: "emitida",
    processing: "processando",
    queued: "fila",
    rejected: "rejeitada",
    canceled: "cancelada",
    draft: "rascunho",
  };
  return <Badge variant={map[status] ?? "default"}>{label[status] ?? status}</Badge>;
}

function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string | number;
  tone?: "income" | "expense" | "primary";
  hint?: string;
}) {
  const ac =
    tone === "income"
      ? "text-[var(--color-income)]"
      : tone === "expense"
        ? "text-[var(--color-expense)]"
        : tone === "primary"
          ? "text-[var(--color-primary)]"
          : "text-[var(--color-fg)]";
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-soft">
      <p className="text-xs uppercase tracking-wider text-[var(--color-fg-subtle)]">{label}</p>
      <p className={"display-serif tabular mt-2 text-2xl " + ac}>{value}</p>
      {hint && <p className="mt-1 text-[10px] text-[var(--color-fg-subtle)]">{hint}</p>}
    </div>
  );
}
