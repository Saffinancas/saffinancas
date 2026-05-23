/**
 * Tabela de preços dos provedores de IA + função de estimativa.
 *
 * Valores em USD por 1 milhão de tokens (rate cards públicos em 2026-05).
 * Convertidos pra centavos de BRL na hora de gravar em ai_usage_events.
 *
 * Atualizar este arquivo quando:
 *   - Algum provedor mudar preço
 *   - A taxa USD/BRL mudar bastante
 *   - Você quiser migrar pra modelo mais caro/barato
 */

export type AIProvider = "claude" | "openai" | "gemini";

type PriceRow = {
  /** USD por 1M tokens de input */
  inputPerM: number;
  /** USD por 1M tokens de output */
  outputPerM: number;
  /** Modelo default usado pelo classifier */
  model: string;
};

export const AI_PRICES: Record<AIProvider, PriceRow> = {
  claude: { inputPerM: 1.0, outputPerM: 5.0, model: "claude-haiku-4-5" },
  openai: { inputPerM: 0.15, outputPerM: 0.6, model: "gpt-4o-mini" },
  gemini: { inputPerM: 0.075, outputPerM: 0.3, model: "gemini-1.5-flash" },
};

/** Taxa de câmbio USD → BRL (admin atualiza aqui ou move pra config em prod). */
export const USD_TO_BRL = 5.0;

/** Tokens médios estimados por classificação (mensagem curta + resposta JSON). */
export const AVG_INPUT_TOKENS = 480;
export const AVG_OUTPUT_TOKENS = 130;

/** Custo em centavos de BRL para uma chamada com N tokens de input/output. */
export function estimateCostCents(
  provider: AIProvider,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = AI_PRICES[provider];
  if (!p) return 0;
  const usd =
    (inputTokens / 1_000_000) * p.inputPerM + (outputTokens / 1_000_000) * p.outputPerM;
  return Math.round(usd * USD_TO_BRL * 100);
}

/** Custo médio em centavos de BRL para UMA mensagem classificada. */
export function avgCostPerCallCents(provider: AIProvider): number {
  return estimateCostCents(provider, AVG_INPUT_TOKENS, AVG_OUTPUT_TOKENS);
}

/** Tabela legível pro relatório admin. */
export function pricingTable() {
  return (Object.entries(AI_PRICES) as Array<[AIProvider, PriceRow]>).map(
    ([id, p]) => ({
      provider: id,
      model: p.model,
      inputPerM: p.inputPerM,
      outputPerM: p.outputPerM,
      avgPerCallCents: avgCostPerCallCents(id),
    }),
  );
}
