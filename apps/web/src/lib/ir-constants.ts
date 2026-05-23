/**
 * Constantes de IRPF — ano-calendário 2025 (declaração 2026).
 *
 * Atualize este arquivo TODO ANO em fevereiro/março, quando a Receita publica
 * o manual da declaração. Mudanças aqui se propagam pra todo o cálculo de
 * restituição estimada e pras dicas exibidas ao cliente.
 *
 * Fontes:
 *  - IN RFB nº 2.219/2024 (declaração 2025 sobre AC2024)
 *  - Manuais da Receita Federal: www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes
 *
 * IMPORTANTE: esta é uma ESTIMATIVA. Não substitui contador.
 */

export const IR_YEAR = 2025;
export const IR_DECLARATION_YEAR = 2026;

/**
 * Tabela progressiva mensal AC2024 (vigora desde maio/2024). Valores em reais.
 * Aplicada pra calcular o IR devido sobre rendimentos tributáveis anuais
 * dividindo por 12 — APROXIMAÇÃO. Pra cálculo preciso a Receita usa a tabela
 * progressiva anual.
 */
export const IR_BRACKETS_MONTHLY = [
  { upTo: 2259.2, rate: 0, deduction: 0 },
  { upTo: 2826.65, rate: 0.075, deduction: 169.44 },
  { upTo: 3751.05, rate: 0.15, deduction: 381.44 },
  { upTo: 4664.68, rate: 0.225, deduction: 662.77 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.275, deduction: 896.0 },
];

/**
 * Tabela ANUAL = mensal * 12 (parcela a deduzir também x12). Usada pra
 * calcular IR devido com base na soma anual.
 */
export const IR_BRACKETS_ANNUAL = IR_BRACKETS_MONTHLY.map((b) => ({
  upTo: b.upTo === Number.POSITIVE_INFINITY ? b.upTo : b.upTo * 12,
  rate: b.rate,
  deduction: b.deduction * 12,
}));

/** Limites de dedução AC2024 (em reais). */
export const IR_DEDUCTION_LIMITS = {
  /** Educação por dependente — limite individual. */
  educationPerDependent: 3561.5,
  /** Dependente — dedução fixa anual por dependente. */
  perDependent: 2275.08,
  /** PGBL — % máximo da renda tributável bruta dedutível. */
  pgblPctOfIncome: 0.12,
  /** Desconto simplificado (sem comprovação) — % da renda tributável até teto. */
  simpleDiscountPct: 0.2,
  simpleDiscountCap: 16754.34,
  /** Doações dedutíveis — % do imposto devido. */
  donationsPctOfTax: 0.06,
} as const;

/** Categorias DA SAF mapeadas em fichas do IRPF. */
export type IRBucket =
  | "tributable_income"
  | "exempt_income"
  | "deductible_health"
  | "deductible_education"
  | "deductible_pension"
  | "deductible_pgbl"
  | "deductible_donation"
  | "deductible_dependent"
  | "expense_other"
  | "ignore";

/**
 * Heurística por nome de categoria (case-insensitive). Categorias customizadas
 * caem em "expense_other".
 */
export const IR_CATEGORY_MAP: Array<{ match: RegExp; bucket: IRBucket }> = [
  { match: /salário|sal\.|holerite/i, bucket: "tributable_income" },
  { match: /renda extra|freelance|aut[oô]nomo/i, bucket: "tributable_income" },
  { match: /investiment/i, bucket: "exempt_income" },
  { match: /sa[uú]de|m[eé]dic|hospital|farm[aá]cia|odontol/i, bucket: "deductible_health" },
  { match: /educa[cç][aã]o|escola|faculdade|curso|mensalidade/i, bucket: "deductible_education" },
  { match: /previd[eê]ncia|pgbl/i, bucket: "deductible_pgbl" },
  { match: /pens[aã]o aliment/i, bucket: "deductible_pension" },
  { match: /doa[cç][aã]o/i, bucket: "deductible_donation" },
];

export function bucketForCategoryName(name: string | null | undefined): IRBucket {
  if (!name) return "expense_other";
  for (const r of IR_CATEGORY_MAP) {
    if (r.match.test(name)) return r.bucket;
  }
  return "expense_other";
}

export const IR_BUCKET_INFO: Record<
  IRBucket,
  {
    label: string;
    ficha: string;
    code?: string;
    deductible: boolean;
    /**
     * Quanto desse valor o usuário consegue deduzir? Função pra suportar
     * regras como "12% da renda" (PGBL) ou "limite por dependente" (Educação).
     */
    deductibleAmount?: (
      spent: number,
      ctx: { annualIncome: number; dependents: number },
    ) => number;
    description: string;
  }
> = {
  tributable_income: {
    label: "Rendimentos tributáveis",
    ficha: "Rendimentos Tributáveis Recebidos de PJ",
    code: "RT",
    deductible: false,
    description: "Salário, pró-labore, freelance pagos por PJ. Entram na base do IR.",
  },
  exempt_income: {
    label: "Rendimentos isentos",
    ficha: "Rendimentos Isentos e Não Tributáveis",
    code: "RI",
    deductible: false,
    description:
      "Dividendos de ações, rendimentos de FII, FGTS, indenizações. Não pagam IR mas precisam ser declarados.",
  },
  deductible_health: {
    label: "Saúde",
    ficha: "Pagamentos Efetuados",
    code: "10",
    deductible: true,
    deductibleAmount: (spent) => spent, // sem limite
    description:
      "Plano de saúde, médicos, hospitais, dentista e fisioterapeutas. 100% dedutível, sem teto — guarde os recibos.",
  },
  deductible_education: {
    label: "Educação",
    ficha: "Pagamentos Efetuados",
    code: "01",
    deductible: true,
    deductibleAmount: (spent, ctx) => {
      const cap = IR_DEDUCTION_LIMITS.educationPerDependent * (1 + ctx.dependents);
      return Math.min(spent, cap);
    },
    description: `Mensalidade de escola, faculdade ou pós-graduação. Limite de R$ ${IR_DEDUCTION_LIMITS.educationPerDependent
      .toFixed(2)
      .replace(".", ",")} por pessoa.`,
  },
  deductible_pension: {
    label: "Pensão alimentícia",
    ficha: "Pagamentos Efetuados",
    code: "30",
    deductible: true,
    deductibleAmount: (spent) => spent,
    description: "Pensão paga por decisão judicial. 100% dedutível.",
  },
  deductible_pgbl: {
    label: "Previdência (PGBL)",
    ficha: "Pagamentos Efetuados",
    code: "36",
    deductible: true,
    deductibleAmount: (spent, ctx) =>
      Math.min(spent, ctx.annualIncome * IR_DEDUCTION_LIMITS.pgblPctOfIncome),
    description: "PGBL é dedutível até 12% da sua renda tributável anual. VGBL NÃO é.",
  },
  deductible_donation: {
    label: "Doações",
    ficha: "Doações Efetuadas",
    code: "doacao",
    deductible: true,
    // Aprox: deduz no máximo 6% do IR devido — implementaremos depois no cálculo final.
    deductibleAmount: (spent) => spent,
    description: "Fundos do Idoso, Criança, cultura e esporte: até 6% do imposto devido.",
  },
  deductible_dependent: {
    label: "Dependentes",
    ficha: "Dependentes",
    code: "dep",
    deductible: true,
    deductibleAmount: (_spent, ctx) => ctx.dependents * IR_DEDUCTION_LIMITS.perDependent,
    description: `R$ ${IR_DEDUCTION_LIMITS.perDependent
      .toFixed(2)
      .replace(".", ",")} por dependente — filhos, cônjuge sem renda, pais idosos.`,
  },
  expense_other: {
    label: "Despesas gerais",
    ficha: "(Não aplicável)",
    deductible: false,
    description: "Despesas do dia-a-dia que não geram dedução no IR.",
  },
  ignore: {
    label: "Ignorar",
    ficha: "—",
    deductible: false,
    description: "",
  },
};

/**
 * Calcula IR devido usando a tabela anual progressiva.
 * Retorna o imposto em reais (pode ser zero ou negativo se isento).
 */
export function calculateIrDue(taxableIncome: number): number {
  for (const b of IR_BRACKETS_ANNUAL) {
    if (taxableIncome <= b.upTo) {
      return Math.max(0, taxableIncome * b.rate - b.deduction);
    }
  }
  return 0;
}

/** Alíquota MARGINAL aplicável a uma renda — usada pra estimar economia por dedução. */
export function marginalRate(taxableIncome: number): number {
  for (const b of IR_BRACKETS_ANNUAL) {
    if (taxableIncome <= b.upTo) return b.rate;
  }
  return 0.275;
}
