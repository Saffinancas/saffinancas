/**
 * Categorias padrão pré-criadas para toda nova família (§4.4).
 * Importa um array literal; aplicar via job no signup ou via migration.
 */
export const DEFAULT_CATEGORIES = [
  { name: "Mercado", icon: "shopping-cart", color: "income", allowedType: "expense" },
  { name: "Alimentação fora", icon: "utensils", color: "warning", allowedType: "expense" },
  { name: "Transporte", icon: "bus", color: "primary", allowedType: "expense" },
  { name: "Combustível", icon: "fuel", color: "expense", allowedType: "expense" },
  { name: "Aluguel/Financiamento", icon: "home", color: "primary", allowedType: "expense" },
  { name: "Contas", icon: "receipt", color: "primary", allowedType: "expense" },
  { name: "Saúde", icon: "heart-pulse", color: "expense", allowedType: "expense" },
  { name: "Educação", icon: "graduation-cap", color: "primary", allowedType: "expense" },
  { name: "Lazer", icon: "popcorn", color: "warning", allowedType: "expense" },
  { name: "Vestuário", icon: "shirt", color: "primary", allowedType: "expense" },
  { name: "Pets", icon: "paw-print", color: "primary", allowedType: "expense" },
  { name: "Presentes", icon: "gift", color: "warning", allowedType: "expense" },
  { name: "Assinaturas", icon: "repeat", color: "primary", allowedType: "expense" },
  { name: "Salário", icon: "banknote", color: "income", allowedType: "income" },
  { name: "Renda extra", icon: "trending-up", color: "income", allowedType: "income" },
  { name: "Investimentos", icon: "line-chart", color: "income", allowedType: "both" },
  { name: "Outros", icon: "tag", color: "default", allowedType: "both" },
] as const;
