import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getInvoiceById } from "@/lib/fiscal/invoices";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import { CancelButton } from "./cancel-button";
import { PaymentSection } from "./payment-section";
import { ScheduleFromInvoice } from "./schedule-from-invoice";
import { db, schema } from "@cofre/db";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function NotaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const familyId = (session?.user as { familyId?: string | null })?.familyId;
  if (!familyId) return null;

  const data = await getInvoiceById(id, familyId);
  if (!data?.invoice) notFound();
  const { invoice, recipient, profile } = data;

  const valorTotal = Number(invoice.serviceValueCents);
  const valorIss = Number(invoice.issValueCents);
  const valorLiquido = valorTotal - (invoice.issWithheld ? valorIss : 0);

  // Já existe agendamento ativo pra esse tomador?
  const existingSchedule = invoice.recipientId
    ? (
        await db
          .select({ id: schema.nfseSchedules.id, label: schema.nfseSchedules.label })
          .from(schema.nfseSchedules)
          .where(
            and(
              eq(schema.nfseSchedules.familyId, familyId),
              eq(schema.nfseSchedules.recipientId, invoice.recipientId),
              eq(schema.nfseSchedules.status, "active"),
            ),
          )
          .limit(1)
      )[0] ?? null
    : null;

  return (
    <div className="space-y-6">
      <Link
        href="/app/fiscal/notas"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            NFSe Nº {invoice.nfseNumber ?? "(pendente)"}
          </h1>
          <p className="mt-1 text-xs text-[var(--color-fg-subtle)]">
            RPS {invoice.rpsSerie} {invoice.rpsNumber} ·{" "}
            {invoice.verificationCode
              ? `Cód. verificação ${invoice.verificationCode}`
              : "sem código de verificação"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={invoice.status} />
          {invoice.status === "issued" && (
            <>
              <Button asChild variant="secondary" size="sm">
                <a href={`/api/fiscal/invoices/${invoice.id}/xml`}>
                  <Download className="h-4 w-4" /> XML
                </a>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <a
                  href={`/api/fiscal/invoices/${invoice.id}/danfe`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileText className="h-4 w-4" /> DANFE
                </a>
              </Button>
              <CancelButton invoiceId={invoice.id} />
            </>
          )}
        </div>
      </div>

      {invoice.status === "rejected" && invoice.errorMessage && (
        <div className="rounded-[var(--radius)] border border-[var(--color-expense)]/40 bg-[var(--color-expense-soft)] p-3 text-xs text-[var(--color-expense)]">
          <p className="font-medium">Emissão rejeitada</p>
          <p className="mt-0.5">{invoice.errorMessage}</p>
        </div>
      )}

      {invoice.status === "canceled" && (
        <div className="rounded-[var(--radius)] border border-[var(--color-fg-subtle)]/40 bg-[var(--color-surface-muted)] p-3 text-xs">
          <p className="font-medium">
            Cancelada em {invoice.canceledAt && new Date(invoice.canceledAt).toLocaleString("pt-BR")}
          </p>
          {invoice.cancelReason && <p className="mt-0.5">Motivo: {invoice.cancelReason}</p>}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prestador</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{profile?.legalName}</p>
            <p className="text-xs text-[var(--color-fg-muted)]">
              {profile?.documentType === "PJ" ? "CNPJ" : "CPF"}: {profile?.documentNumber}
            </p>
            {profile?.municipalInscription && (
              <p className="text-xs text-[var(--color-fg-muted)]">
                IM: {profile.municipalInscription}
              </p>
            )}
            <p className="text-xs text-[var(--color-fg-muted)]">
              {profile?.cityName}/{profile?.stateCode}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tomador</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-medium">{recipient?.name ?? "—"}</p>
            {recipient && (
              <p className="text-xs text-[var(--color-fg-muted)]">
                {recipient.documentType === "PJ" ? "CNPJ" : "CPF"}: {recipient.documentNumber}
              </p>
            )}
            {recipient?.email && (
              <p className="text-xs text-[var(--color-fg-muted)]">{recipient.email}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Discriminação</CardTitle>
          <CardDescription>
            Código LC 116/03: <strong>{invoice.serviceCode}</strong>
            {invoice.cnae && (
              <>
                {" "}
                · CNAE: <strong>{invoice.cnae}</strong>
              </>
            )}
            {" "}
            · Competência:{" "}
            <strong>{new Date(invoice.competenceDate).toLocaleDateString("pt-BR")}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{invoice.serviceDescription}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Valores</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Field label="Valor do serviço" value={formatBRL(valorTotal)} />
            <Field
              label={`ISS (${(invoice.issRateBps / 100).toFixed(2)}%)`}
              value={formatBRL(valorIss)}
            />
            <Field label="ISS retido" value={invoice.issWithheld ? "Sim" : "Não"} />
            <Field
              label="Valor líquido"
              value={formatBRL(valorLiquido)}
              accent="primary"
            />
          </dl>
        </CardContent>
      </Card>

      {invoice.status === "issued" && (
        <>
          <PaymentSection
            invoiceId={invoice.id}
            valorTotal={valorTotal}
            paymentReceivedAt={invoice.paymentReceivedAt?.toISOString() ?? null}
            paymentReceivedAmountCents={
              invoice.paymentReceivedAmountCents != null
                ? Number(invoice.paymentReceivedAmountCents)
                : null
            }
            linkedTransactionId={invoice.linkedTransactionId}
          />

          <ScheduleFromInvoice
            invoiceId={invoice.id}
            existingScheduleId={existingSchedule?.id ?? null}
            existingScheduleLabel={existingSchedule?.label ?? null}
            prefill={{
              recipientId: invoice.recipientId ?? "",
              recipientName: recipient?.name ?? "",
              serviceCode: invoice.serviceCode,
              serviceDescription: invoice.serviceDescription,
              serviceValueCents: valorTotal,
              issRateBps: invoice.issRateBps,
              issWithheld: invoice.issWithheld,
              suggestedEmail: recipient?.email ?? null,
            }}
          />
        </>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "primary";
}) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
        {label}
      </dt>
      <dd
        className={
          "num mt-0.5 font-medium " + (accent === "primary" ? "text-[var(--color-primary)]" : "")
        }
      >
        {value}
      </dd>
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
    issued: "Emitida",
    processing: "Processando",
    queued: "Em fila",
    rejected: "Rejeitada",
    canceled: "Cancelada",
    draft: "Rascunho",
  };
  return <Badge variant={map[status] ?? "default"}>{label[status] ?? status}</Badge>;
}
