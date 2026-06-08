import Link from "next/link";
import { and, count, desc, eq, gte, sum, sql } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AI_PRICES, avgCostPerCallCents, pricingTable, USD_TO_BRL } from "@/lib/ai-pricing";
import { formatBRL } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import { GenerateDemoData } from "./demo-button";
import { Sparkles, TrendingDown, KeyRound, Wallet } from "lucide-react";
import { PageHeader, StatCard, Section } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default async function UsoIaPage() {
  const monthStart = startOfMonth(new Date());

  const byProvider = await db
    .select({
      provider: schema.aiUsageEvents.provider,
      calls: count(),
      tokensIn: sum(schema.aiUsageEvents.inputTokens).as("tokens_in"),
      tokensOut: sum(schema.aiUsageEvents.outputTokens).as("tokens_out"),
      costCents: sum(schema.aiUsageEvents.costCents).as("cost_cents"),
    })
    .from(schema.aiUsageEvents)
    .where(
      and(
        gte(schema.aiUsageEvents.createdAt, monthStart),
        eq(schema.aiUsageEvents.paidByCustomer, false),
      ),
    )
    .groupBy(schema.aiUsageEvents.provider);

  const [byokTotals] = await db
    .select({
      calls: count(),
      cost: sum(schema.aiUsageEvents.costCents).as("cost"),
    })
    .from(schema.aiUsageEvents)
    .where(
      and(
        gte(schema.aiUsageEvents.createdAt, monthStart),
        eq(schema.aiUsageEvents.paidByCustomer, true),
      ),
    );

  const byFamily = await db
    .select({
      familyId: schema.families.id,
      familyName: schema.families.name,
      provider: schema.families.aiProvider,
      byokEnabled: schema.families.byokEnabled,
      byokActive: sql<boolean>`(${schema.families.byokEnabled} and ${schema.families.byokApiKeyEnc} is not null)`.as("byok_active"),
      calls: count(schema.aiUsageEvents.id),
      costCents: sum(schema.aiUsageEvents.costCents).as("cost"),
      txCount: sql<number>`(
        select count(*) from ${schema.transactions} t
        where t.family_id = ${schema.families.id}
          and t.occurred_at >= ${monthStart.toISOString()}
          and t.status != 'deleted'
      )`.as("tx_count"),
    })
    .from(schema.families)
    .leftJoin(
      schema.aiUsageEvents,
      and(
        eq(schema.aiUsageEvents.familyId, schema.families.id),
        gte(schema.aiUsageEvents.createdAt, monthStart),
      ),
    )
    .groupBy(
      schema.families.id,
      schema.families.name,
      schema.families.aiProvider,
      schema.families.byokEnabled,
      schema.families.byokApiKeyEnc,
    )
    .orderBy(desc(sql`cost`))
    .limit(50);

  const totalCost = byProvider.reduce((acc, r) => acc + Number(r.costCents ?? 0), 0);
  const totalCalls = byProvider.reduce((acc, r) => acc + Number(r.calls ?? 0), 0);
  const byokCalls = Number(byokTotals?.calls ?? 0);
  const byokCost = Number(byokTotals?.cost ?? 0);
  const totalActiveFamilies = byFamily.length;
  const byokFamilies = byFamily.filter((f) => Boolean(f.byokActive)).length;

  const subscriptionRevenueCents = Math.round(BRAND.pricing.monthlyBRL * 100);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Painel · Uso de IA"
        title={
          <>
            Custo da <span className="display-serif italic">inteligência</span>
          </>
        }
        description={`Use estes números pra calibrar o preço da assinatura. Tudo deste mês corrente. Câmbio fixado em USD/BRL = ${USD_TO_BRL.toFixed(2)}.`}
        tone="primary"
        actions={<GenerateDemoData />}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          tone="default"
          label="Chamadas IA (Saf paga)"
          value={<span className="num tabular">{totalCalls.toLocaleString("pt-BR")}</span>}
          icon={<Sparkles className="h-4 w-4" />}
          trend="exclui BYOK"
        />
        <StatCard
          tone="expense"
          label="Custo Saf neste mês"
          value={<span className="num tabular">{formatBRL(totalCost)}</span>}
          icon={<TrendingDown className="h-4 w-4 text-[var(--color-expense)]" />}
          trend="o que sai do seu bolso"
        />
        <StatCard
          tone="primary"
          label="Chamadas BYOK"
          value={<span className="num tabular">{byokCalls.toLocaleString("pt-BR")}</span>}
          icon={<KeyRound className="h-4 w-4" />}
          trend={`${byokFamilies} família(s) · ${formatBRL(byokCost)} pelo cliente`}
        />
        <StatCard
          tone="income"
          label="Receita p/ família ativa"
          value={
            <span className="num tabular">
              <span className="text-sm font-normal text-[var(--color-fg-muted)] align-top mr-1">
                R$
              </span>
              {BRAND.pricing.monthlyBRL.toFixed(2).replace(".", ",")}
            </span>
          }
          icon={<Wallet className="h-4 w-4 text-[var(--color-income)]" />}
          trend="preço base"
        />
      </div>

      <Section
        eyebrow="Provedores"
        title="Custo por provedor neste mês"
        description="Some o que cada motor consumiu de chamada e tokens."
      >
        <Card>
          <CardContent className="pt-6">
            {byProvider.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--color-fg-muted)]">
                Sem chamadas registradas neste mês. Quando o pipeline de IA estiver vivo, os
                números aparecem aqui em tempo real.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
                    <th className="py-2 font-medium">Provedor</th>
                    <th className="py-2 text-right font-medium">Chamadas</th>
                    <th className="py-2 text-right font-medium">Tokens in</th>
                    <th className="py-2 text-right font-medium">Tokens out</th>
                    <th className="py-2 text-right font-medium">Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {byProvider.map((r) => (
                    <tr key={r.provider} className="border-b border-[var(--color-border)] last:border-b-0">
                      <td className="py-2 font-medium">{labelForProvider(r.provider)}</td>
                      <td className="num tabular py-2 text-right">{Number(r.calls).toLocaleString("pt-BR")}</td>
                      <td className="num tabular py-2 text-right text-xs text-[var(--color-fg-muted)]">
                        {Number(r.tokensIn ?? 0).toLocaleString("pt-BR")}
                      </td>
                      <td className="num tabular py-2 text-right text-xs text-[var(--color-fg-muted)]">
                        {Number(r.tokensOut ?? 0).toLocaleString("pt-BR")}
                      </td>
                      <td className="num tabular py-2 text-right font-semibold text-[var(--color-expense)]">
                        {formatBRL(Number(r.costCents ?? 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </Section>

      <Section
        eyebrow="Famílias"
        title="Custo por família no mês"
        description={`Top ${byFamily.length} famílias. Quando não há chamadas reais ainda, projetamos pelo número de transações multiplicado pelo custo médio do provedor da família.`}
      >
        <Card>
          <CardContent className="pt-6">
            {byFamily.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--color-fg-muted)]">
                Nenhuma família cadastrada ainda.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
                    <th className="py-2 font-medium">Família</th>
                    <th className="py-2 font-medium">Provedor</th>
                    <th className="py-2 text-right font-medium">Tx no mês</th>
                    <th className="py-2 text-right font-medium">Chamadas IA</th>
                    <th className="py-2 text-right font-medium">Custo IA (mês)</th>
                    <th className="py-2 text-right font-medium">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {byFamily.map((r) => {
                    const calls = Number(r.calls ?? 0);
                    const realCost = Number(r.costCents ?? 0);
                    const txInMonth = Number(r.txCount ?? 0);
                    const isByok = Boolean(r.byokActive);
                    const provider =
                      r.provider === "auto" ? "claude" : (r.provider as keyof typeof AI_PRICES);
                    const safCost = isByok
                      ? 0
                      : realCost > 0
                        ? realCost
                        : txInMonth * avgCostPerCallCents(provider);
                    const margin = subscriptionRevenueCents - safCost;
                    const marginPct =
                      subscriptionRevenueCents > 0
                        ? Math.round((margin / subscriptionRevenueCents) * 100)
                        : 0;
                    return (
                      <tr
                        key={r.familyId}
                        className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-muted)]"
                      >
                        <td className="py-2">
                          <Link
                            href={`/admin/clientes/${r.familyId}`}
                            className="font-medium hover:underline"
                          >
                            {r.familyName}
                          </Link>
                        </td>
                        <td className="py-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="default">{r.provider}</Badge>
                            {isByok && <Badge variant="primary">BYOK</Badge>}
                          </div>
                        </td>
                        <td className="num tabular py-2 text-right text-xs text-[var(--color-fg-muted)]">
                          {txInMonth.toLocaleString("pt-BR")}
                        </td>
                        <td className="num tabular py-2 text-right text-xs">
                          {realCost > 0
                            ? calls.toLocaleString("pt-BR")
                            : `~${txInMonth}`}
                        </td>
                        <td
                          className={
                            "num tabular py-2 text-right font-medium " +
                            (isByok
                              ? "text-[var(--color-fg-subtle)]"
                              : "text-[var(--color-expense)]")
                          }
                        >
                          {isByok ? "—" : formatBRL(safCost)}
                        </td>
                        <td
                          className={
                            "num tabular py-2 text-right text-xs font-medium " +
                            (margin > 0
                              ? "text-[var(--color-income)]"
                              : "text-[var(--color-expense)]")
                          }
                        >
                          {marginPct}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </Section>

      <Section
        eyebrow="Referência"
        title="Tabela de preços"
        description="Atualize apps/web/src/lib/ai-pricing.ts quando os provedores mudarem o rate card."
      >
        <Card>
          <CardContent className="pt-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
                  <th className="py-2 font-medium">Provedor</th>
                  <th className="py-2 font-medium">Modelo</th>
                  <th className="py-2 text-right font-medium">USD/M in</th>
                  <th className="py-2 text-right font-medium">USD/M out</th>
                  <th className="py-2 text-right font-medium">Custo médio/chamada</th>
                </tr>
              </thead>
              <tbody>
                {pricingTable().map((p) => (
                  <tr key={p.provider} className="border-b border-[var(--color-border)] last:border-b-0">
                    <td className="py-2 font-medium">{labelForProvider(p.provider)}</td>
                    <td className="py-2 text-xs text-[var(--color-fg-muted)]">{p.model}</td>
                    <td className="num tabular py-2 text-right text-xs">${p.inputPerM.toFixed(3)}</td>
                    <td className="num tabular py-2 text-right text-xs">${p.outputPerM.toFixed(3)}</td>
                    <td className="num tabular py-2 text-right text-xs font-medium">
                      {formatBRL(p.avgPerCallCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[11px] text-[var(--color-fg-subtle)]">
              Custo médio estimado por chamada: ~480 tokens de entrada + ~130 de saída.
              Famílias ativas tendem a ter 50–300 chamadas/mês — multiplique para projetar.
            </p>
          </CardContent>
        </Card>
      </Section>

      <div className="text-xs text-[var(--color-fg-subtle)]">
        Total de {totalActiveFamilies} famílias listadas · receita potencial mensal: R${" "}
        {((totalActiveFamilies * subscriptionRevenueCents) / 100).toFixed(2).replace(".", ",")}{" "}
        · custo IA mensal: {formatBRL(totalCost)} · margem bruta:{" "}
        {totalActiveFamilies > 0
          ? `${Math.round(
              ((totalActiveFamilies * subscriptionRevenueCents - totalCost) /
                (totalActiveFamilies * subscriptionRevenueCents)) *
                100,
            )}%`
          : "—"}
      </div>
    </div>
  );
}

function labelForProvider(p: string): string {
  return (
    {
      claude: "Claude (Haiku)",
      openai: "GPT (4o-mini)",
      gemini: "Gemini (1.5 Flash)",
      auto: "Automático",
    }[p] ?? p
  );
}
