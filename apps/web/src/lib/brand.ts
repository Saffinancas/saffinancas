/**
 * Configuração de marca centralizada.
 *
 * O nome final da marca ainda não foi definido. "Cofre" é placeholder —
 * trocar aqui e todo o produto reflete sem caçar string por todo lado.
 */
export const BRAND = {
  name: "Saf Finanças",
  shortName: "Saf",
  legalName: "Saf Finanças Tecnologia Ltda.",
  tagline: "Finanças da família, no piloto automático.",
  oneLiner:
    "O grupo da sua família no WhatsApp já fala sobre dinheiro. A gente transforma isso em controle financeiro — automaticamente.",
  domain: "saffinancas.com.br",
  email: {
    support: "ajuda@saffinancas.com.br",
    dpo: "dpo@saffinancas.com.br",
    noReply: "no-reply@saffinancas.com.br",
  },
  social: {
    instagram: "@saffinancas",
    twitter: "@saffinancas",
  },
  pricing: {
    // Fallback apenas — fonte de verdade é o admin (platform_settings via getPricing()).
    monthlyBRL: 39.9,
    annualBRL: 430.92, // 39,90 × 12 × 0,9 (10% de desconto anual)
    trialDays: 7,
    /** Dias após o fim do trial em que mostramos banner persistente (past_due). */
    pastDueBannerDay: 1,
    /** Dias após o fim do trial em que o acesso é suspenso. */
    blockAfterDay: 3,
  },
} as const;

export type Brand = typeof BRAND;
