import Link from "next/link";
import { headers } from "next/headers";
import { eq, and, gte, lt, desc, sum, sql, count } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { formatBRL } from "@/lib/utils";
import {
  ArrowDownRight,
  ArrowUpRight,
  Equal,
  MessageSquare,
  Plus,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, StatCard, Section } from "@/components/ui/page-header";
import { BentoCard, Sparkline, Donut } from "@/components/ui/bento";

export const dynamic = "force-dynamic";

async function getFamilyId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return ((session?.user as { familyId?: string | null })?.familyId) ?? null;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

const PALETTE = [
  "var(--color-primary)",
  "var(--color-income)",
  "var(--color-warning)",
  "var(--color-expense)",
  "var(--color-fg-subtle)",
];

async function loadDashboard(familyId: string) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = startOfMonth(new Date(now.getFullYear(), now.getMonth() + 1, 1));
  const prevMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  // Totais agregados por mês — pra mês atual, anterior e 6 meses pro sparkline.
  const sixMonthsAgo = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 5, 1));
  const monthlySeries = await db
    .select({
      bucket: sql<string>`to_char(${schema.transactions.occurredAt}, 'YYYY-MM')`.as("bucket"),
      type: schema.transactions.type,
      total: sum(schema.transactions.amountCents).as("total"),
    })
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.familyId, familyId),
        gte(schema.transactions.occurredAt, sixMonthsAgo),
        lt(schema.transactions.occurredAt, monthEnd),
        sql`${schema.transactions.status} != 'deleted'`,
      ),
    )
    .groupBy(sql`bucket`, schema.transactions.type);

  // Mapeia série mensal em saldo (income - expense) por mês.
  const buckets = new Map<string, { income: number; expense: number }>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.set(key, { income: 0, expense: 0 });
  }
  for (const r of monthlySeries) {
    const b = buckets.get(r.bucket);
    if (!b) continue;
    if (r.type === "income") b.income = Number(r.total ?? 0);
    if (r.type === "expense") b.expense = Number(r.total ?? 0);
  }
  const seriesArr = Array.from(buckets.values());
  const sparkSeries = seriesArr.map((s) => (s.income - s.expense) / 100);

  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevKey = `${prevMonthStart.getFullYear()}-${String(prevMonthStart.getMonth() + 1).padStart(2, "0")}`;
  const cur = buckets.get(currentKey) ?? { income: 0, expense: 0 };
  const prev = buckets.get(prevKey) ?? { income: 0, expense: 0 };

  // Top categorias do mês.
  const topCategories = await db
    .select({
      name: schema.categories.name,
      total: sum(schema.transactions.amountCents).as("total"),
    })
    .from(schema.transactions)
    .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
    .where(
      and(
        eq(schema.transactions.familyId, familyId),
        eq(schema.transactions.type, "expense"),
        gte(schema.transactions.occurredAt, monthStart),
        lt(schema.transactions.occurredAt, monthEnd),
        sql`${schema.transactions.status} != 'deleted'`,
      ),
    )
    .groupBy(schema.categories.name)
    .orderBy(desc(sql`total`))
    .limit(5);

  // 10 transações mais recentes.
  const recent = await db
    .select({
      id: schema.transactions.id,
      type: schema.transactions.type,
      amountCents: schema.transactions.amountCents,
      description: schema.transactions.description,
      occurredAt: schema.transactions.occurredAt,
      origin: schema.transactions.origin,
      categoryName: schema.categories.name,
    })
    .from(schema.transactions)
    .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
    .where(
      and(
        eq(schema.transactions.familyId, familyId),
        sql`${schema.transactions.status} != 'deleted'`,
      ),
    )
    .orderBy(desc(schema.transactions.occurredAt))
    .limit(10);

  const [{ total: txCount = 0 } = { total: 0 }] = await db
    .select({ total: count() })
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.familyId, familyId),
        gte(schema.transactions.occurredAt, monthStart),
        lt(schema.transactions.occurredAt, monthEnd),
        sql`${schema.transactions.status} != 'deleted'`,
      ),
    );

  return {
    income: cur.income,
    expense: cur.expense,
    result: cur.income - cur.expense,
    prev,
    sparkSeries,
    topCategories,
    recent,
    txCount,
  };
}

function pctChange(curr: number, prev: number): number | null {
  if (!prev) return null;
  return ((curr - prev) / prev) * 100;
}

function formatPct(n: number | null): string {
  if (n == null) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export default async function DashboardPage() {
  const familyId = await getFamilyId();
  if (!familyId) return null;
  const data = await loadDashboard(familyId);

  const incomeDelta = pctChange(data.income, data.prev.income);
  const expenseDelta = pctChange(data.expense, data.prev.expense);
  const prevResult = data.prev.income - data.prev.expense;
  const resultDelta = pctChange(data.result, prevResult);

  const donutSlices = data.topCategories
    .filter((c) => c.name)
    .map((c, i) => ({
      label: c.name ?? "Outros",
      value: Number(c.total ?? 0),
      color: PALETTE[i % PALETTE.length] ?? "var(--color-primary)",
    }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Plataforma · Dashboard"
        title={
          <>
            O que rolou{" "}
            <span className="display-serif italic">esse mês</span>
          </>
        }
        description="Atualiza em tempo real à medida que a família mexe."
        actions={
          <Button asChild>
            <Link href="/app/transacoes?new=1">
              <Plus className="h-4 w-4" /> Lançar
            </Link>
          </Button>
        }
      />

      {/* Bento grid de KPIs + dataviz */}
      <div className="grid auto-rows-[minmax(120px,_auto)] grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Saldo do mês — span 2 colunas + 2 linhas */}
        <BentoCard
          span="col-span-2 lg:row-span-2"
          tone={data.result >= 0 ? "primary" : "expense"}
          eyebrow="Saldo do mês"
          metric={
            <span className="num">
              <span className="text-base font-normal text-[var(--color-fg-muted)] align-top mr-1">
                R$
              </span>
              {(Math.abs(data.result) / 100).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
              {data.result < 0 && <span className="text-[var(--color-expense)]"> ▼</span>}
            </span>
          }
          footnote={
            <span className="inline-flex items-center gap-1.5">
              {resultDelta != null && resultDelta >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-[var(--color-income)]" />
              ) : resultDelta != null ? (
                <ArrowDownRight className="h-3 w-3 text-[var(--color-expense)]" />
              ) : (
                <Equal className="h-3 w-3" />
              )}
              <span
                className={
                  resultDelta == null
                    ? ""
                    : resultDelta >= 0
                      ? "text-[var(--color-income)] font-medium"
                      : "text-[var(--color-expense)] font-medium"
                }
              >
                {formatPct(resultDelta)}
              </span>
              <span>vs. mês passado</span>
            </span>
          }
        >
          <div className="-mx-1 mt-2">
            <Sparkline
              values={data.sparkSeries.length ? data.sparkSeries : [0, 0, 0, 0, 0, 0]}
              height={80}
              stroke={
                data.result >= 0 ? "var(--color-primary)" : "var(--color-expense)"
              }
            />
          </div>
        </BentoCard>

        <StatCard
          tone="income"
          label="Receita"
          value={
            <span className="num">
              <span className="text-sm font-normal text-[var(--color-fg-muted)] align-top mr-1">
                R$
              </span>
              {(data.income / 100).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          }
          icon={<ArrowUpRight className="h-4 w-4 text-[var(--color-income)]" />}
          trend={
            <span className="inline-flex items-center gap-1">
              <span
                className={
                  incomeDelta == null
                    ? ""
                    : incomeDelta >= 0
                      ? "text-[var(--color-income)] font-medium"
                      : "text-[var(--color-expense)] font-medium"
                }
              >
                {formatPct(incomeDelta)}
              </span>
              <span>vs. mês passado</span>
            </span>
          }
        />

        <StatCard
          tone="expense"
          label="Despesa"
          value={
            <span className="num">
              <span className="text-sm font-normal text-[var(--color-fg-muted)] align-top mr-1">
                R$
              </span>
              {(data.expense / 100).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          }
          icon={<ArrowDownRight className="h-4 w-4 text-[var(--color-expense)]" />}
          trend={
            <span className="inline-flex items-center gap-1">
              <span
                className={
                  expenseDelta == null
                    ? ""
                    : expenseDelta <= 0
                      ? "text-[var(--color-income)] font-medium"
                      : "text-[var(--color-expense)] font-medium"
                }
              >
                {formatPct(expenseDelta)}
              </span>
              <span>vs. mês passado</span>
            </span>
          }
        />

        <StatCard
          tone="warning"
          label="Transações"
          value={<span className="num">{Number(data.txCount)}</span>}
          icon={<Wallet className="h-4 w-4" />}
          trend="lançadas este mês"
        />

        {donutSlices.length > 0 && (
          <BentoCard
            span="col-span-2"
            eyebrow="Categorias"
            title="Onde foi o dinheiro do mês"
          >
            <Donut slices={donutSlices} size={92} />
          </BentoCard>
        )}
      </div>

      {/* Últimas transações */}
      {data.recent.length === 0 ? (
        <EmptyState />
      ) : (
        <Section
          eyebrow="Movimento"
          title="Últimas transações"
          description="10 mais recentes. Veja todas em Transações."
          actions={
            <Button asChild variant="ghost" size="sm">
              <Link href="/app/transacoes">Ver todas →</Link>
            </Button>
          }
        >
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-soft">
            <ul className="divide-y divide-[var(--color-border)]">
              {data.recent.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-surface-muted)]/60"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-surface-muted)] text-base"
                    >
                      {iconForCategory(t.categoryName)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.description}</p>
                      <p className="truncate text-[11px] text-[var(--color-fg-subtle)]">
                        {t.categoryName ?? "Sem categoria"} · {labelForOrigin(t.origin)} ·{" "}
                        {t.occurredAt.toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </div>
                  <span
                    className={
                      "num shrink-0 text-sm font-semibold tabular " +
                      (t.type === "income"
                        ? "text-[var(--color-income)]"
                        : "text-[var(--color-expense)]")
                    }
                  >
                    {t.type === "income" ? "+" : "−"}
                    {formatBRL(t.amountCents)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-12 text-center shadow-soft">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
        <Sparkles className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-lg font-semibold tracking-tight">Vazio por enquanto.</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-fg-muted)]">
        Conecte o WhatsApp da família ou lance uma transação manualmente. A IA categoriza o
        resto.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button asChild>
          <Link href="/app/whatsapp">
            <MessageSquare className="h-4 w-4" /> Conectar WhatsApp
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/app/transacoes?new=1">
            <Plus className="h-4 w-4" /> Lançar manual
          </Link>
        </Button>
      </div>
    </div>
  );
}

function iconForCategory(name: string | null | undefined): string {
  if (!name) return "💸";
  const map: Record<string, string> = {
    Mercado: "🛒",
    "Alimentação fora": "🍔",
    Transporte: "🚌",
    Combustível: "⛽",
    "Aluguel/Financiamento": "🏠",
    Contas: "🧾",
    Saúde: "💊",
    Educação: "📚",
    Lazer: "🎬",
    Vestuário: "👕",
    Pets: "🐾",
    Presentes: "🎁",
    Assinaturas: "🔁",
    Salário: "💼",
    "Renda extra": "💸",
    Investimentos: "📈",
    Outros: "🏷️",
  };
  return map[name] ?? "🏷️";
}

function labelForOrigin(o: string): string {
  switch (o) {
    case "whatsapp":
      return "WhatsApp";
    case "bank":
      return "Banco";
    case "manual":
      return "Manual";
    case "planned":
      return "Previsto pago";
    default:
      return o;
  }
}
