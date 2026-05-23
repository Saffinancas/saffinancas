import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAssetWithHistory, listRentalPayments } from "@/lib/patrimony";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import { AssetDetailActions } from "./detail-actions";

export const dynamic = "force-dynamic";

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const familyId = (session?.user as { familyId?: string | null })?.familyId;
  if (!familyId) return null;

  const data = await getAssetWithHistory(assetId, familyId);
  if (!data) notFound();
  const { asset, valuations, rentals } = data;

  // Payments do contrato ativo
  const activeRental = rentals.find((r) => r.status === "active") ?? rentals[0];
  const payments = activeRental
    ? await listRentalPayments(activeRental.id, familyId)
    : [];

  // Calcula variação anualizada
  const acqValueCents = Number(asset.acquisitionCostCents);
  const curValueCents = Number(asset.currentValueCents);
  const variationCents = curValueCents - acqValueCents;
  const yearsHeld = Math.max(
    1 / 12,
    (Date.now() - new Date(asset.acquisitionDate).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000),
  );
  const annualizedReturn =
    acqValueCents > 0
      ? (Math.pow(curValueCents / acqValueCents, 1 / yearsHeld) - 1) * 100
      : 0;

  const totalRentReceived = payments
    .filter((p) => p.paidAt)
    .reduce((acc, p) => acc + Number(p.paidAmountCents ?? 0), 0);

  return (
    <div className="space-y-6">
      <Link
        href="/app/patrimonio"
        className="inline-flex items-center gap-1.5 text-xs text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{asset.name}</h1>
        <p className="mt-1 text-xs text-[var(--color-fg-subtle)]">
          {labelType(asset.type)} · adquirido em{" "}
          {new Date(asset.acquisitionDate).toLocaleDateString("pt-BR")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Valor atual" value={formatBRL(curValueCents)} tone="primary" />
        <Stat
          label="Variação total"
          value={`${variationCents >= 0 ? "+" : ""}${formatBRL(variationCents)}`}
          tone={variationCents >= 0 ? "income" : "expense"}
          hint={`${annualizedReturn >= 0 ? "+" : ""}${annualizedReturn.toFixed(2)}% a.a.`}
        />
        <Stat
          label="Aluguéis recebidos"
          value={formatBRL(totalRentReceived)}
          tone={totalRentReceived > 0 ? "income" : undefined}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de valorização</CardTitle>
          <CardDescription>
            Cada vez que você atualiza o valor, fica registrado aqui.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {valuations.length === 0 ? (
            <p className="text-sm text-[var(--color-fg-muted)]">Sem histórico.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
                  <th className="py-2 font-medium">Data</th>
                  <th className="py-2 font-medium">Origem</th>
                  <th className="py-2 text-right font-medium">Valor</th>
                  <th className="py-2 font-medium">Variação</th>
                </tr>
              </thead>
              <tbody>
                {valuations.map((v, i) => {
                  const prev = i > 0 ? Number(valuations[i - 1]?.valueCents ?? 0) : null;
                  const current = Number(v.valueCents);
                  const delta = prev != null ? current - prev : 0;
                  const deltaPct = prev != null && prev > 0 ? (delta / prev) * 100 : null;
                  return (
                    <tr key={v.id} className="border-b border-[var(--color-border)] last:border-b-0">
                      <td className="py-2 text-xs">
                        {new Date(v.valuedAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-2 text-xs">
                        <Badge variant="default">{labelSource(v.source)}</Badge>
                      </td>
                      <td className="num py-2 text-right font-medium">{formatBRL(current)}</td>
                      <td className="num py-2 text-xs">
                        {deltaPct != null ? (
                          <span
                            className={
                              delta >= 0
                                ? "text-[var(--color-income)]"
                                : "text-[var(--color-expense)]"
                            }
                          >
                            {delta >= 0 ? "+" : ""}
                            {formatBRL(delta)} ({deltaPct.toFixed(1)}%)
                          </span>
                        ) : (
                          <span className="text-[var(--color-fg-subtle)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <AssetDetailActions
        assetId={asset.id}
        currentValueCents={curValueCents}
        rentals={rentals.map((r) => ({
          id: r.id,
          tenantName: r.tenantName,
          monthlyRentCents: Number(r.monthlyRentCents),
          status: r.status,
          contractStart: r.contractStart.toISOString(),
        }))}
        payments={payments.map((p) => ({
          id: p.id,
          periodMonth: p.periodMonth.toISOString(),
          dueDate: p.dueDate.toISOString(),
          paidAt: p.paidAt?.toISOString() ?? null,
          expectedAmountCents: Number(p.expectedAmountCents),
          paidAmountCents: p.paidAmountCents != null ? Number(p.paidAmountCents) : null,
        }))}
      />
    </div>
  );
}

function labelType(t: string): string {
  return (
    {
      real_estate: "Imóvel",
      vehicle: "Veículo",
      artwork: "Obra de arte",
      equipment: "Equipamento",
      other: "Outro",
    }[t] ?? t
  );
}

function labelSource(s: string): string {
  return (
    { manual: "Manual", market: "Mercado", appraisal: "Avaliação", tax_table: "Tabela" }[s] ??
    s
  );
}

function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
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
