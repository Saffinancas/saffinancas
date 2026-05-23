import Link from "next/link";
import { headers } from "next/headers";
import { eq, and, gte, lt, desc, sum, sql } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { formatBRL } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, MessageSquare, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

async function getFamilyId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return ((session?.user as { familyId?: string | null })?.familyId) ?? null;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfNextMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

async function loadDashboard(familyId: string) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = startOfNextMonth(now);

  const totals = await db
    .select({
      type: schema.transactions.type,
      total: sum(schema.transactions.amountCents).as("total"),
    })
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.familyId, familyId),
        gte(schema.transactions.occurredAt, monthStart),
        lt(schema.transactions.occurredAt, monthEnd),
        sql`${schema.transactions.status} != 'deleted'`,
      ),
    )
    .groupBy(schema.transactions.type);

  let income = 0;
  let expense = 0;
  for (const t of totals) {
    if (t.type === "income") income = Number(t.total ?? 0);
    if (t.type === "expense") expense = Number(t.total ?? 0);
  }

  const recent = await db
    .select({
      id: schema.transactions.id,
      type: schema.transactions.type,
      amountCents: schema.transactions.amountCents,
      description: schema.transactions.description,
      occurredAt: schema.transactions.occurredAt,
      origin: schema.transactions.origin,
      categoryName: schema.categories.name,
      categoryIcon: schema.categories.icon,
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

  return { income, expense, result: income - expense, recent };
}

export default async function DashboardPage() {
  const familyId = await getFamilyId();
  if (!familyId) return null;
  const data = await loadDashboard(familyId);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            O que está rolando no mês corrente. Atualiza em tempo real à medida que a família
            mexe.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/transacoes?new=1">
            <Plus className="h-4 w-4" /> Lançar
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Receita" value={data.income} tone="income" arrow="up" />
        <Kpi label="Despesa" value={data.expense} tone="expense" arrow="down" />
        <Kpi label="Resultado" value={data.result} tone={data.result >= 0 ? "primary" : "expense"} />
      </div>

      {data.recent.length === 0 ? (
        <EmptyState />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Últimas transações</CardTitle>
            <CardDescription>10 mais recentes. Veja todas em Transações.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {data.recent.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-[var(--radius)] px-2 py-2 hover:bg-[var(--color-surface-muted)]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--color-surface-muted)] text-base"
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
                    "num shrink-0 text-sm font-semibold " +
                    (t.type === "income"
                      ? "text-[var(--color-income)]"
                      : "text-[var(--color-expense)]")
                  }
                >
                  {t.type === "income" ? "+" : "−"}
                  {formatBRL(t.amountCents)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
  arrow,
}: {
  label: string;
  value: number;
  tone: "income" | "expense" | "primary";
  arrow?: "up" | "down";
}) {
  const tc =
    tone === "income"
      ? "text-[var(--color-income)]"
      : tone === "expense"
        ? "text-[var(--color-expense)]"
        : "text-[var(--color-primary)]";
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-soft">
      <div className="flex items-center justify-between text-[var(--color-fg-subtle)]">
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
        {arrow ? (
          arrow === "up" ? (
            <ArrowUpRight className="h-4 w-4" />
          ) : (
            <ArrowDownRight className="h-4 w-4" />
          )
        ) : null}
      </div>
      <p className={"display-serif tabular mt-2 text-3xl " + tc}>
        <span className="text-sm align-top mr-0.5 not-italic">R$</span>
        {(value / 100)
          .toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <Sparkles className="h-5 w-5" />
        </span>
        <h3 className="text-base font-semibold">Vazio por enquanto.</h3>
        <p className="max-w-sm text-sm text-[var(--color-fg-muted)]">
          Conecte o WhatsApp da família ou lance uma transação manualmente. A IA categoriza o
          resto.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          <Button asChild size="sm">
            <Link href="/app/whatsapp">
              <MessageSquare className="h-4 w-4" /> Conectar WhatsApp
            </Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href="/app/transacoes?new=1">
              <Plus className="h-4 w-4" /> Lançar manual
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
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
