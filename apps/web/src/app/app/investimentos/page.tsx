import Link from "next/link";
import { headers } from "next/headers";
import { eq, and, sql } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { formatBRL } from "@/lib/utils";
import {
  ArrowRight,
  Bitcoin,
  LineChart,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { PageHeader, StatCard, Section } from "@/components/ui/page-header";
import { BentoCard, Donut } from "@/components/ui/bento";

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

  const allocationSlices = [
    {
      label: "B3",
      value: b3MarketValue,
      color: "var(--color-primary)",
    },
    {
      label: "Cripto",
      value: cryptoMarketValue,
      color: "var(--color-warning)",
    },
  ].filter((s) => s.value > 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Plataforma · Investimentos"
        title={
          <>
            Sua carteira <span className="display-serif italic">consolidada</span>
          </>
        }
        description="B3 (ações, FIIs, renda fixa) + criptomoedas no mesmo lugar. Dividendos recebidos viram receita automaticamente."
        tone="primary"
      />

      <div className="grid auto-rows-[minmax(120px,_auto)] grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <BentoCard
          span="col-span-2 lg:row-span-2"
          tone={profit >= 0 ? "primary" : "expense"}
          eyebrow="Valor de mercado"
          metric={
            <span className="num">
              <span className="text-base font-normal text-[var(--color-fg-muted)] align-top mr-1">
                R$
              </span>
              {(total / 100).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          }
          footnote={
            <span className="inline-flex items-center gap-1.5">
              {profit >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-[var(--color-income)]" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-[var(--color-expense)]" />
              )}
              <span
                className={
                  profit >= 0
                    ? "text-[var(--color-income)] font-medium"
                    : "text-[var(--color-expense)] font-medium"
                }
              >
                {profit >= 0 ? "+" : ""}
                {profitPct.toFixed(1)}%
              </span>
              <span>vs. custo médio</span>
            </span>
          }
        >
          {allocationSlices.length > 0 && (
            <div className="mt-2">
              <Donut slices={allocationSlices} size={88} />
            </div>
          )}
        </BentoCard>

        <StatCard
          tone={profit >= 0 ? "income" : "expense"}
          label="Lucro / prejuízo"
          value={
            <span className="num">
              <span className="text-sm font-normal text-[var(--color-fg-muted)] align-top mr-1">
                R$
              </span>
              {(Math.abs(profit) / 100).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          }
          icon={
            profit >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-[var(--color-income)]" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-[var(--color-expense)]" />
            )
          }
          trend={
            <span className="inline-flex items-center gap-1">
              <span
                className={
                  profit >= 0
                    ? "text-[var(--color-income)] font-medium"
                    : "text-[var(--color-expense)] font-medium"
                }
              >
                {profit >= 0 ? "+" : ""}
                {profitPct.toFixed(1)}%
              </span>
              <span>variação acumulada</span>
            </span>
          }
        />

        <StatCard
          tone="default"
          label="Custo médio total"
          value={
            <span className="num">
              <span className="text-sm font-normal text-[var(--color-fg-muted)] align-top mr-1">
                R$
              </span>
              {(totalCost / 100).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          }
          icon={<Wallet className="h-4 w-4" />}
          trend="quanto você pôs"
        />

        <StatCard
          tone="primary"
          label="Posições B3"
          value={<span className="num">{holdings.length}</span>}
          icon={<LineChart className="h-4 w-4 text-[var(--color-primary)]" />}
          trend={formatBRL(Math.round(b3MarketValue))}
        />

        <StatCard
          tone="warning"
          label="Moedas cripto"
          value={<span className="num">{cryptos.length}</span>}
          icon={<Bitcoin className="h-4 w-4 text-[var(--color-warning)]" />}
          trend={formatBRL(Math.round(cryptoMarketValue))}
        />
      </div>

      <Section eyebrow="Módulos" title="Explorar por classe">
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
      </Section>

      <Section eyebrow="Roadmap" title="Integrações automáticas">
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-soft">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <TrendingUp className="h-4 w-4 text-[var(--color-primary)]" />
            Por enquanto, dados são lançados manualmente. Em breve:
          </div>
          <ul className="mt-3 space-y-1.5 text-sm text-[var(--color-fg-muted)]">
            <li>
              · <strong className="text-[var(--color-fg)]">B3 via Pluggy Open Investment</strong> —
              conecta XP, Rico, Clear, BTG, NuInvest, Inter, Itaú, Bradesco e mais. Posições e
              proventos chegam sozinhos.
            </li>
            <li>
              · <strong className="text-[var(--color-fg)]">Cripto via API read-only</strong> —
              Binance, Mercado Bitcoin, Coinbase, Foxbit, Bitso. Saldo sincroniza automaticamente.
            </li>
            <li>
              · <strong className="text-[var(--color-fg)]">Carteiras self-custody</strong> — informa
              o endereço público (BTC/ETH/SOL), a gente consulta o blockchain.
            </li>
          </ul>
        </div>
      </Section>
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
      className="group flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-pop hover:bg-[var(--color-surface-muted)]"
    >
      <span className="grid h-10 w-10 place-items-center rounded-[var(--radius)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-xs text-[var(--color-fg-muted)]">{desc}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-[var(--color-fg-subtle)] transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
