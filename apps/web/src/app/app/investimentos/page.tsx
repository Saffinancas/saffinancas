import Link from "next/link";
import { headers } from "next/headers";
import { eq, and, sql } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { formatBRL } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Bitcoin, LineChart, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InvestimentosPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const familyId = (session?.user as { familyId?: string | null })?.familyId;
  if (!familyId) return null;

  const holdings = await db
    .select({
      quantity: schema.holdings.quantity,
      avgCostCents: schema.holdings.avgCostCents,
      currentPriceCents: schema.holdings.currentPriceCents,
    })
    .from(schema.holdings)
    .where(
      and(eq(schema.holdings.familyId, familyId), sql`${schema.holdings.deletedAt} is null`),
    );

  const cryptos = await db
    .select({
      quantity: schema.cryptoHoldings.quantity,
      avgCostCents: schema.cryptoHoldings.avgCostCents,
      currentPriceCents: schema.cryptoHoldings.currentPriceCents,
    })
    .from(schema.cryptoHoldings)
    .where(
      and(
        eq(schema.cryptoHoldings.familyId, familyId),
        sql`${schema.cryptoHoldings.deletedAt} is null`,
      ),
    );

  const b3MarketValue = holdings.reduce((acc, h) => {
    const q = Number(h.quantity);
    const p = Number(h.currentPriceCents ?? h.avgCostCents);
    return acc + q * p;
  }, 0);
  const b3Cost = holdings.reduce(
    (acc, h) => acc + Number(h.quantity) * Number(h.avgCostCents),
    0,
  );
  const cryptoMarketValue = cryptos.reduce((acc, h) => {
    const q = Number(h.quantity);
    const p = Number(h.currentPriceCents ?? h.avgCostCents);
    return acc + q * p;
  }, 0);
  const cryptoCost = cryptos.reduce(
    (acc, h) => acc + Number(h.quantity) * Number(h.avgCostCents),
    0,
  );

  const total = b3MarketValue + cryptoMarketValue;
  const totalCost = b3Cost + cryptoCost;
  const profit = total - totalCost;
  const profitPct = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Investimentos</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Carteira consolidada: B3 (ações, FIIs, renda fixa) + criptomoedas. Dividendos
          recebidos viram receita automaticamente.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Valor de mercado" value={formatBRL(Math.round(total))} tone="primary" />
        <Stat label="Custo médio total" value={formatBRL(Math.round(totalCost))} />
        <Stat
          label="Lucro / prejuízo"
          value={`${formatBRL(Math.round(profit))} (${profitPct >= 0 ? "+" : ""}${profitPct.toFixed(1)}%)`}
          tone={profit >= 0 ? "income" : "expense"}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ModuleLink
          href="/app/investimentos/b3"
          icon={LineChart}
          title="B3 — ações, FIIs, renda fixa"
          desc={`${holdings.length} posição(ões) · ${formatBRL(Math.round(b3MarketValue))}`}
        />
        <ModuleLink
          href="/app/investimentos/cripto"
          icon={Bitcoin}
          title="Criptomoedas"
          desc={`${cryptos.length} moeda(s) · ${formatBRL(Math.round(cryptoMarketValue))}`}
        />
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[var(--color-primary)]" />
            Integrações automáticas
          </CardTitle>
          <CardDescription>
            Por enquanto, os dados são lançados manualmente. Em breve:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5 text-sm text-[var(--color-fg-muted)]">
            <li>• <strong>B3 via Pluggy Open Investment</strong> — conecta XP, Rico, Clear, BTG, NuInvest, Inter, Itaú, Bradesco e mais. Posições e proventos chegam sozinhos.</li>
            <li>• <strong>Cripto via API read-only</strong> — Binance, Mercado Bitcoin, Coinbase, Foxbit, Bitso. Saldo sincroniza automaticamente.</li>
            <li>• <strong>Carteiras self-custody</strong> — informa o endereço público (BTC/ETH/SOL), a gente consulta o blockchain.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function ModuleLink({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-soft transition-colors hover:bg-[var(--color-surface-muted)]"
    >
      <span className="grid h-10 w-10 place-items-center rounded-[var(--radius)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-xs text-[var(--color-fg-muted)]">{desc}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-[var(--color-fg-subtle)] group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "income" | "expense" | "primary";
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
    </div>
  );
}
