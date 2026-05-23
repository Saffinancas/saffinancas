import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { listInvoices } from "@/lib/fiscal/invoices";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Plus } from "lucide-react";
import { formatBRL } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NotasPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  const familyId = (session?.user as { familyId?: string | null })?.familyId;
  if (!familyId) return null;

  const from = sp.from ? new Date(sp.from) : undefined;
  const to = sp.to ? new Date(sp.to) : undefined;

  const invoices = await listInvoices(familyId, { from, to, limit: 500 });

  const exportUrl = `/api/fiscal/bulk-export${
    sp.from || sp.to
      ? "?" +
        new URLSearchParams({
          ...(sp.from ? { from: sp.from } : {}),
          ...(sp.to ? { to: sp.to } : {}),
        }).toString()
      : ""
  }`;

  return (
    <div className="space-y-6">
      <Link
        href="/app/fiscal"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notas emitidas</h1>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            {invoices.length} nota(s) no período. Clique numa linha pra ver detalhes, baixar
            XML ou DANFE.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/app/fiscal/emitir">
              <Plus className="h-4 w-4" /> Emitir
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <a href={exportUrl}>
              <Download className="h-4 w-4" /> Baixar período (ZIP)
            </a>
          </Button>
        </div>
      </div>

      <form
        method="get"
        className="grid items-end gap-3 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 sm:grid-cols-[1fr_1fr_auto]"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="from" className="text-xs text-[var(--color-fg-muted)]">
            De
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={sp.from ?? ""}
            className="h-10 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="to" className="text-xs text-[var(--color-fg-muted)]">
            Até
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={sp.to ?? ""}
            className="h-10 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm"
          />
        </div>
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
      </form>

      {invoices.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center">
          <p className="text-sm text-[var(--color-fg-muted)]">Nada por aqui no período.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
                <th className="px-4 py-2.5 font-medium">Competência</th>
                <th className="px-4 py-2.5 font-medium">Nº NFSe</th>
                <th className="px-4 py-2.5 font-medium">Tomador</th>
                <th className="px-4 py-2.5 font-medium">Serviço</th>
                <th className="px-4 py-2.5 text-right font-medium">Valor</th>
                <th className="px-4 py-2.5 text-right font-medium">ISS</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr
                  key={i.id}
                  className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-muted)]"
                >
                  <td className="px-4 py-2.5 text-xs">
                    {new Date(i.competenceDate).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-2.5 font-medium">
                    <Link href={`/app/fiscal/notas/${i.id}`} className="hover:underline">
                      {i.nfseNumber ?? `RPS ${i.rpsSerie} ${i.rpsNumber}`}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-xs">{i.recipientName ?? "—"}</td>
                  <td className="max-w-[260px] truncate px-4 py-2.5 text-xs text-[var(--color-fg-muted)]">
                    {i.serviceDescription}
                  </td>
                  <td className="num px-4 py-2.5 text-right font-medium">
                    {formatBRL(Number(i.serviceValueCents))}
                  </td>
                  <td className="num px-4 py-2.5 text-right text-xs text-[var(--color-fg-muted)]">
                    {formatBRL(Number(i.issValueCents))}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    <StatusBadge status={i.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
  return <Badge variant={map[status] ?? "default"}>{status}</Badge>;
}
