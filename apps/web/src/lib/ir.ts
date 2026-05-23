"use server";

import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import {
  bucketForCategoryName,
  calculateIrDue,
  IR_BUCKET_INFO,
  IR_DEDUCTION_LIMITS,
  type IRBucket,
} from "@/lib/ir-constants";

/**
 * Aplica o cap de doações: dedutível ≤ 6% do imposto devido (antes da doação).
 * O IRPF aplica isso após o cálculo, então fazemos em 2 passos.
 */
function applyDonationCap(
  donationDeductibleCents: number,
  preDonationTaxDueReais: number,
): number {
  const cap = preDonationTaxDueReais * IR_DEDUCTION_LIMITS.donationsPctOfTax;
  return Math.min(donationDeductibleCents, Math.round(cap * 100));
}

/**
 * Constrói um sumário consolidado para o ano-calendário (year), com:
 *  - Rendimentos tributáveis (somatório de income classificadas como salário etc)
 *  - Rendimentos isentos (dividendos + FII + rendimentos similares)
 *  - Pagamentos efetuados agrupados por bucket dedutível
 *  - Bens e direitos (patrimony_assets + holdings + crypto)
 *  - Estimativa de imposto devido vs retido (heurística simples)
 *
 * **Limites**:
 *  - Renda retida na fonte (IRRF) ainda não é coletada automaticamente —
 *    o usuário pode informar manualmente (em fase futura). Por enquanto
 *    assumimos retenção = imposto devido sobre 80% da renda tributável (heurística
 *    grosseira pra ter algum número).
 *  - Não substitui contador. Aviso explícito na UI.
 */

export type IRReport = {
  year: number;
  income: {
    tributable: number;
    exempt: number;
  };
  deductions: Record<IRBucket, { total: number; deductible: number }>;
  bensEDireitos: {
    patrimony: Array<{ id: string; name: string; type: string; valueCents: number }>;
    holdings: Array<{ id: string; ticker: string; name: string; valueCents: number; assetClass: string }>;
    crypto: Array<{ id: string; symbol: string; name: string; valueCents: number }>;
    total: number;
  };
  dependents: number;
  estimatedTaxDue: number;
  estimatedTaxWithheld: number;
  estimatedRefund: number;
};

function startOfYear(y: number) {
  return new Date(y, 0, 1);
}
function startOfNextYear(y: number) {
  return new Date(y + 1, 0, 1);
}

export async function buildIRReport(opts: {
  familyId: string;
  year: number;
  dependents?: number;
  /** IRRF retido na fonte informado pelo usuário (centavos). Substitui a heurística. */
  withheldOverrideCents?: number | null;
}): Promise<IRReport> {
  const yStart = startOfYear(opts.year);
  const yEnd = startOfNextYear(opts.year);
  const dependents = opts.dependents ?? 0;

  // Rendimentos: somar transactions tipo income por categoria.
  const incomeRows = await db
    .select({
      categoryName: schema.categories.name,
      total: sql<number>`coalesce(sum(${schema.transactions.amountCents}), 0)`.as("total"),
    })
    .from(schema.transactions)
    .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
    .where(
      and(
        eq(schema.transactions.familyId, opts.familyId),
        eq(schema.transactions.type, "income"),
        gte(schema.transactions.occurredAt, yStart),
        lt(schema.transactions.occurredAt, yEnd),
        sql`${schema.transactions.status} != 'deleted'`,
      ),
    )
    .groupBy(schema.categories.name);

  // Dividendos isentos somados separadamente (origin tabela dividends).
  const [exemptDividendsRow] = await db
    .select({
      total: sql<number>`coalesce(sum(${schema.dividends.amountCents}), 0)`.as("total"),
    })
    .from(schema.dividends)
    .where(
      and(
        eq(schema.dividends.familyId, opts.familyId),
        eq(schema.dividends.status, "received"),
        gte(schema.dividends.payableAt, yStart),
        lt(schema.dividends.payableAt, yEnd),
      ),
    );

  let tributable = 0;
  let exempt = Number(exemptDividendsRow?.total ?? 0);
  for (const r of incomeRows) {
    const bucket = bucketForCategoryName(r.categoryName);
    if (bucket === "tributable_income") tributable += Number(r.total);
    else if (bucket === "exempt_income") exempt += Number(r.total);
    else tributable += Number(r.total); // padrão conservador
  }

  // Despesas por bucket dedutível.
  const expenseRows = await db
    .select({
      categoryName: schema.categories.name,
      total: sql<number>`coalesce(sum(${schema.transactions.amountCents}), 0)`.as("total"),
    })
    .from(schema.transactions)
    .leftJoin(schema.categories, eq(schema.transactions.categoryId, schema.categories.id))
    .where(
      and(
        eq(schema.transactions.familyId, opts.familyId),
        eq(schema.transactions.type, "expense"),
        gte(schema.transactions.occurredAt, yStart),
        lt(schema.transactions.occurredAt, yEnd),
        sql`${schema.transactions.status} != 'deleted'`,
      ),
    )
    .groupBy(schema.categories.name);

  const deductions: IRReport["deductions"] = {
    tributable_income: { total: 0, deductible: 0 },
    exempt_income: { total: 0, deductible: 0 },
    deductible_health: { total: 0, deductible: 0 },
    deductible_education: { total: 0, deductible: 0 },
    deductible_pension: { total: 0, deductible: 0 },
    deductible_pgbl: { total: 0, deductible: 0 },
    deductible_donation: { total: 0, deductible: 0 },
    deductible_dependent: {
      total: 0,
      deductible: dependents * IR_DEDUCTION_LIMITS.perDependent * 100,
    },
    expense_other: { total: 0, deductible: 0 },
    ignore: { total: 0, deductible: 0 },
  };

  for (const r of expenseRows) {
    const bucket = bucketForCategoryName(r.categoryName);
    const total = Number(r.total);
    deductions[bucket]!.total += total;
    const info = IR_BUCKET_INFO[bucket];
    if (info.deductible && info.deductibleAmount) {
      const spentReais = total / 100;
      const allowedReais = info.deductibleAmount(spentReais, {
        annualIncome: tributable / 100,
        dependents,
      });
      deductions[bucket]!.deductible += Math.round(allowedReais * 100);
    }
  }

  // Bens e direitos
  const patrimony = await db
    .select({
      id: schema.patrimonyAssets.id,
      name: schema.patrimonyAssets.name,
      type: schema.patrimonyAssets.type,
      valueCents: schema.patrimonyAssets.currentValueCents,
    })
    .from(schema.patrimonyAssets)
    .where(
      and(
        eq(schema.patrimonyAssets.familyId, opts.familyId),
        sql`${schema.patrimonyAssets.deletedAt} is null`,
      ),
    );

  const holdingsList = await db
    .select({
      id: schema.holdings.id,
      ticker: schema.holdings.ticker,
      name: schema.holdings.name,
      quantity: schema.holdings.quantity,
      avgCostCents: schema.holdings.avgCostCents,
      currentPriceCents: schema.holdings.currentPriceCents,
      assetClass: schema.holdings.assetClass,
    })
    .from(schema.holdings)
    .where(
      and(
        eq(schema.holdings.familyId, opts.familyId),
        sql`${schema.holdings.deletedAt} is null`,
      ),
    );

  const cryptoList = await db
    .select({
      id: schema.cryptoHoldings.id,
      symbol: schema.cryptoHoldings.symbol,
      name: schema.cryptoHoldings.name,
      quantity: schema.cryptoHoldings.quantity,
      avgCostCents: schema.cryptoHoldings.avgCostCents,
      currentPriceCents: schema.cryptoHoldings.currentPriceCents,
    })
    .from(schema.cryptoHoldings)
    .where(
      and(
        eq(schema.cryptoHoldings.familyId, opts.familyId),
        sql`${schema.cryptoHoldings.deletedAt} is null`,
      ),
    );

  const patrimonyTotal = patrimony.reduce((acc, p) => acc + Number(p.valueCents ?? 0), 0);
  const holdingsTotal = holdingsList.reduce((acc, h) => {
    const qty = Number(h.quantity);
    const price = h.currentPriceCents ?? h.avgCostCents;
    return acc + qty * Number(price);
  }, 0);
  const cryptoTotal = cryptoList.reduce((acc, h) => {
    const qty = Number(h.quantity);
    const price = h.currentPriceCents ?? h.avgCostCents;
    return acc + qty * Number(price);
  }, 0);

  // ETAPA 1: cálculo do IR devido SEM o desconto de doação (que tem cap de 6%)
  const donationCents = deductions.deductible_donation.deductible;
  const nonDonationDeductibleCents = Object.entries(deductions)
    .filter(([k]) => k !== "deductible_donation")
    .reduce((acc, [, d]) => acc + d.deductible, 0);

  const preDonationBaseReais = Math.max(
    0,
    (tributable - nonDonationDeductibleCents) / 100,
  );
  const preDonationTaxDue = calculateIrDue(preDonationBaseReais);

  // ETAPA 2: aplica cap de 6% sobre o IR devido pré-doação
  const cappedDonationCents = applyDonationCap(donationCents, preDonationTaxDue);
  deductions.deductible_donation.deductible = cappedDonationCents;

  const totalDeductibleCents = nonDonationDeductibleCents + cappedDonationCents;
  const taxableBaseReais = Math.max(0, (tributable - totalDeductibleCents) / 100);
  const taxDueReais = calculateIrDue(taxableBaseReais);

  // IRRF retido: usa override do usuário se informado; senão, heurística.
  let taxWithheldReais: number;
  if (opts.withheldOverrideCents != null && opts.withheldOverrideCents >= 0) {
    taxWithheldReais = opts.withheldOverrideCents / 100;
  } else {
    const grossMonthly = tributable / 12 / 100;
    const monthlyTax = calculateIrDue(grossMonthly * 12) / 12;
    taxWithheldReais = Math.max(0, monthlyTax * 12);
  }

  const estimatedTaxDue = Math.round(taxDueReais * 100);
  const estimatedTaxWithheld = Math.round(taxWithheldReais * 100);

  return {
    year: opts.year,
    income: { tributable, exempt },
    deductions,
    bensEDireitos: {
      patrimony: patrimony.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        valueCents: Number(p.valueCents),
      })),
      holdings: holdingsList.map((h) => ({
        id: h.id,
        ticker: h.ticker,
        name: h.name,
        assetClass: h.assetClass,
        valueCents: Math.round(Number(h.quantity) * Number(h.currentPriceCents ?? h.avgCostCents)),
      })),
      crypto: cryptoList.map((h) => ({
        id: h.id,
        symbol: h.symbol,
        name: h.name,
        valueCents: Math.round(Number(h.quantity) * Number(h.currentPriceCents ?? h.avgCostCents)),
      })),
      total: patrimonyTotal + holdingsTotal + cryptoTotal,
    },
    dependents,
    estimatedTaxDue,
    estimatedTaxWithheld,
    estimatedRefund: estimatedTaxWithheld - estimatedTaxDue,
  };
}
