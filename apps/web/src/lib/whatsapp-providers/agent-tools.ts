/**
 * Tools que o agente conversacional Claude pode chamar pra responder perguntas
 * do usuário. Cada tool recebe `familyId` (injetado pelo runner) + input do LLM,
 * e retorna JSON serializável que volta como tool_result.
 */
import { and, eq, gte, lt, sql, desc, isNull } from "drizzle-orm";
import { db, schema } from "@cofre/db";

export type ToolDef = {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, { type: string; description?: string; enum?: string[] }>;
    required?: string[];
  };
  run: (input: Record<string, unknown>, familyId: string, tz: string) => Promise<unknown>;
};

function monthRange(monthIso: string | undefined, tz: string): { start: Date; end: Date; label: string } {
  void tz; // futuro: TZ-aware
  const now = new Date();
  const d = monthIso ? new Date(monthIso + "-01") : new Date(now.getFullYear(), now.getMonth(), 1);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const label = start.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return { start, end, label };
}

function brl(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export const TOOLS: ToolDef[] = [
  {
    name: "summary_month",
    description:
      "Resumo financeiro de um mês: total gasto, total recebido, saldo, número de transações. Use quando o usuário pede 'como está esse mês?', 'quanto gastei em outubro?', etc.",
    input_schema: {
      type: "object",
      properties: {
        month: {
          type: "string",
          description: "Mês no formato YYYY-MM. Omitir = mês corrente.",
        },
      },
    },
    async run(input, familyId, tz) {
      const { start, end, label } = monthRange(input.month as string | undefined, tz);
      const rows = await db
        .select({
          type: schema.transactions.type,
          total: sql<number>`coalesce(sum(${schema.transactions.amountCents}), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(schema.transactions)
        .where(
          and(
            eq(schema.transactions.familyId, familyId),
            gte(schema.transactions.occurredAt, start),
            lt(schema.transactions.occurredAt, end),
            isNull(schema.transactions.deletedAt),
          ),
        )
        .groupBy(schema.transactions.type);
      const expense = rows.find((r) => r.type === "expense");
      const income = rows.find((r) => r.type === "income");
      const expCents = Number(expense?.total ?? 0);
      const incCents = Number(income?.total ?? 0);
      return {
        month: label,
        income: brl(incCents),
        expense: brl(expCents),
        balance: brl(incCents - expCents),
        expense_count: Number(expense?.count ?? 0),
        income_count: Number(income?.count ?? 0),
      };
    },
  },
  {
    name: "spending_by_category",
    description:
      "Agrega despesas por categoria num mês. Use pra 'quanto gastei com alimentação?', 'maiores categorias do mês', etc.",
    input_schema: {
      type: "object",
      properties: {
        month: { type: "string", description: "YYYY-MM. Omitir = mês corrente." },
        category_name: {
          type: "string",
          description:
            "Filtro por nome exato ou substring da categoria. Omitir pra ver todas.",
        },
      },
    },
    async run(input, familyId, tz) {
      const { start, end, label } = monthRange(input.month as string | undefined, tz);
      const filterName = (input.category_name as string | undefined)?.toLowerCase();

      const rows = await db
        .select({
          categoryId: schema.transactions.categoryId,
          categoryName: schema.categories.name,
          aiSuggestion: schema.transactions.aiCategorySuggestion,
          total: sql<number>`coalesce(sum(${schema.transactions.amountCents}), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(schema.transactions)
        .leftJoin(schema.categories, eq(schema.categories.id, schema.transactions.categoryId))
        .where(
          and(
            eq(schema.transactions.familyId, familyId),
            eq(schema.transactions.type, "expense"),
            gte(schema.transactions.occurredAt, start),
            lt(schema.transactions.occurredAt, end),
            isNull(schema.transactions.deletedAt),
          ),
        )
        .groupBy(schema.transactions.categoryId, schema.categories.name, schema.transactions.aiCategorySuggestion);

      const grouped = new Map<string, { total: number; count: number }>();
      for (const r of rows) {
        const name = r.categoryName ?? r.aiSuggestion ?? "Sem categoria";
        if (filterName && !name.toLowerCase().includes(filterName)) continue;
        const cur = grouped.get(name) ?? { total: 0, count: 0 };
        cur.total += Number(r.total);
        cur.count += Number(r.count);
        grouped.set(name, cur);
      }
      const list = Array.from(grouped.entries())
        .map(([category, v]) => ({
          category,
          total: brl(v.total),
          total_cents: v.total,
          count: v.count,
        }))
        .sort((a, b) => b.total_cents - a.total_cents);

      return { month: label, categories: list, total: brl(list.reduce((s, x) => s + x.total_cents, 0)) };
    },
  },
  {
    name: "top_expenses",
    description: "Lista as N maiores despesas individuais do período.",
    input_schema: {
      type: "object",
      properties: {
        month: { type: "string" },
        limit: { type: "number", description: "Default 10" },
      },
    },
    async run(input, familyId, tz) {
      const { start, end, label } = monthRange(input.month as string | undefined, tz);
      const limit = Math.min(50, Math.max(1, Number(input.limit ?? 10)));
      const rows = await db
        .select({
          description: schema.transactions.description,
          amount: schema.transactions.amountCents,
          occurredAt: schema.transactions.occurredAt,
          category: schema.categories.name,
        })
        .from(schema.transactions)
        .leftJoin(schema.categories, eq(schema.categories.id, schema.transactions.categoryId))
        .where(
          and(
            eq(schema.transactions.familyId, familyId),
            eq(schema.transactions.type, "expense"),
            gte(schema.transactions.occurredAt, start),
            lt(schema.transactions.occurredAt, end),
            isNull(schema.transactions.deletedAt),
          ),
        )
        .orderBy(desc(schema.transactions.amountCents))
        .limit(limit);
      return {
        month: label,
        top: rows.map((r) => ({
          description: r.description,
          amount: brl(Number(r.amount)),
          date: r.occurredAt.toLocaleDateString("pt-BR"),
          category: r.category ?? "sem categoria",
        })),
      };
    },
  },
  {
    name: "compare_months",
    description:
      "Compara despesas/receitas de 2 meses. Use pra 'gastei mais ou menos que mês passado?', 'comparar abril vs maio'.",
    input_schema: {
      type: "object",
      properties: {
        month_a: { type: "string", description: "YYYY-MM (base)" },
        month_b: { type: "string", description: "YYYY-MM (comparação). Omitir = mês corrente." },
      },
      required: ["month_a"],
    },
    async run(input, familyId, tz) {
      const r1 = await (TOOLS[0]!.run({ month: input.month_a }, familyId, tz)) as {
        month: string;
        income: string;
        expense: string;
        balance: string;
      };
      const r2 = await (TOOLS[0]!.run({ month: input.month_b }, familyId, tz)) as {
        month: string;
        income: string;
        expense: string;
        balance: string;
      };
      return { a: r1, b: r2 };
    },
  },
  {
    name: "goal_progress",
    description:
      "Progresso de uma meta da família. Quando o usuário pergunta 'quanto falta pra viagem?', 'meta do carro tá em quanto?'.",
    input_schema: {
      type: "object",
      properties: {
        name_query: { type: "string", description: "Nome ou substring da meta." },
      },
    },
    async run(input, familyId) {
      const filter = (input.name_query as string | undefined)?.toLowerCase();
      const rows = await db
        .select()
        .from(schema.goals)
        .where(and(eq(schema.goals.familyId, familyId), isNull(schema.goals.archivedAt)));
      const list = rows
        .filter((g) => !filter || g.name.toLowerCase().includes(filter))
        .map((g) => {
          const target = Number(g.targetCents);
          const saved = Number(g.savedCents);
          const pct = target > 0 ? Math.round((saved / target) * 100) : 0;
          return {
            name: g.name,
            saved: brl(saved),
            target: brl(target),
            percent: pct,
            missing: brl(Math.max(0, target - saved)),
            deadline: g.deadline?.toISOString().slice(0, 10) ?? null,
          };
        });
      return { goals: list };
    },
  },
  {
    name: "forecast_balance",
    description:
      "Saldo previsto pros próximos N meses combinando previsto (a pagar) + receitas futuras.",
    input_schema: {
      type: "object",
      properties: {
        months: { type: "number", description: "Quantos meses olhar. Default 6, max 24." },
      },
    },
    async run(input, familyId) {
      const months = Math.min(24, Math.max(1, Number(input.months ?? 6)));
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setMonth(end.getMonth() + months);

      const [plans, incomes, installments] = await Promise.all([
        db
          .select()
          .from(schema.plannedExpenses)
          .where(
            and(
              eq(schema.plannedExpenses.familyId, familyId),
              gte(schema.plannedExpenses.periodMonth, start),
              lt(schema.plannedExpenses.periodMonth, end),
            ),
          ),
        db.select().from(schema.futureIncomes).where(eq(schema.futureIncomes.familyId, familyId)),
        db.select().from(schema.futureIncomeInstallments),
      ]);

      const buckets = new Map<string, { income: number; expense: number; net: number; cumulative: number }>();
      for (let i = 0; i < months; i++) {
        const d = new Date(start);
        d.setMonth(d.getMonth() + i);
        buckets.set(d.toISOString().slice(0, 7), { income: 0, expense: 0, net: 0, cumulative: 0 });
      }
      for (const p of plans) {
        if (p.status === "skipped" || p.status === "paid") continue;
        const key = new Date(p.periodMonth).toISOString().slice(0, 7);
        const b = buckets.get(key);
        if (!b) continue;
        if (p.type === "expense") b.expense += Number(p.amountCents);
        else b.income += Number(p.amountCents);
      }
      for (const fi of incomes) {
        if (fi.receivedTransactionId) continue;
        const insts = installments.filter((x) => x.futureIncomeId === fi.id);
        if (insts.length > 0) {
          for (const inst of insts) {
            if (inst.receivedTransactionId) continue;
            const k = new Date(inst.expectedAt).toISOString().slice(0, 7);
            const b = buckets.get(k);
            if (b) b.income += Number(inst.amountCents);
          }
        } else if (fi.expectedAt) {
          const k = new Date(fi.expectedAt).toISOString().slice(0, 7);
          const b = buckets.get(k);
          if (b) b.income += Number(fi.totalCents);
        }
      }
      let cum = 0;
      const result: Array<{ month: string; income: string; expense: string; net: string; cumulative: string }> = [];
      for (const [k, v] of buckets) {
        v.net = v.income - v.expense;
        cum += v.net;
        v.cumulative = cum;
        result.push({
          month: k,
          income: brl(v.income),
          expense: brl(v.expense),
          net: brl(v.net),
          cumulative: brl(v.cumulative),
        });
      }
      return { months: result };
    },
  },
  {
    name: "search_transactions",
    description:
      "Busca transações por descrição (substring) ou intervalo de datas. Use pra 'quanto gastei no mercado?', 'transações com uber'.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Substring da descrição." },
        from: { type: "string", description: "YYYY-MM-DD." },
        to: { type: "string", description: "YYYY-MM-DD." },
        type: { type: "string", enum: ["expense", "income"], description: "Filtro tipo." },
        limit: { type: "number" },
      },
    },
    async run(input, familyId) {
      const q = (input.query as string | undefined)?.toLowerCase();
      const from = input.from ? new Date(String(input.from)) : new Date(Date.now() - 90 * 24 * 3600 * 1000);
      const to = input.to ? new Date(String(input.to)) : new Date();
      const limit = Math.min(50, Math.max(1, Number(input.limit ?? 20)));
      const type = input.type as "expense" | "income" | undefined;

      const whereParts = [
        eq(schema.transactions.familyId, familyId),
        gte(schema.transactions.occurredAt, from),
        lt(schema.transactions.occurredAt, to),
        isNull(schema.transactions.deletedAt),
      ];
      if (type) whereParts.push(eq(schema.transactions.type, type));
      if (q) {
        whereParts.push(sql`lower(${schema.transactions.description}) like ${"%" + q + "%"}`);
      }

      const rows = await db
        .select({
          description: schema.transactions.description,
          amount: schema.transactions.amountCents,
          type: schema.transactions.type,
          occurredAt: schema.transactions.occurredAt,
          category: schema.categories.name,
        })
        .from(schema.transactions)
        .leftJoin(schema.categories, eq(schema.categories.id, schema.transactions.categoryId))
        .where(and(...whereParts))
        .orderBy(desc(schema.transactions.occurredAt))
        .limit(limit);

      const total = rows.reduce((s, r) => s + (r.type === "expense" ? Number(r.amount) : -Number(r.amount)), 0);
      return {
        count: rows.length,
        sum_expense_minus_income: brl(total),
        results: rows.map((r) => ({
          date: r.occurredAt.toLocaleDateString("pt-BR"),
          description: r.description,
          type: r.type,
          amount: brl(Number(r.amount)),
          category: r.category ?? "sem categoria",
        })),
      };
    },
  },
];
