import { z } from "zod";

/**
 * Schema do payload que o AIClassifier devolve. Mesmo formato declarado
 * no §4.2 do prompt-mestre. Aplicar via structured output / function calling
 * em cada provider.
 */
export const transactionDraftSchema = z.object({
  is_transaction: z.boolean(),
  type: z.enum(["expense", "income"]).optional(),
  amount_cents: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).default("BRL"),
  description: z.string().min(1).optional(),
  category_suggestion: z.string().optional(),
  confidence: z.number().min(0).max(1),
  occurred_at: z.string().datetime({ offset: true }).optional(),
  payer_hint: z.string().optional(),
  raw_text: z.string(),
});

export type TransactionDraft = z.infer<typeof transactionDraftSchema>;

export type AIProvider = "claude" | "openai" | "gemini" | "auto";

export interface ClassifyContext {
  /** ISO timestamp da chegada da mensagem; default = now() */
  receivedAt?: string;
  /** Timezone IANA da família (ex.: America/Sao_Paulo) */
  timezone?: string;
  /** Mensagem bruta (texto, transcript de áudio, caption de imagem). */
  text: string;
  /** Nome de quem mandou no grupo. */
  senderName?: string;
  /** Categorias conhecidas da família — IA escolhe entre elas se possível. */
  knownCategories?: string[];
  /** Idioma esperado para a saída. */
  locale?: "pt-BR";
  /**
   * Imagem anexa (comprovante, recibo, nota). Quando presente, o classifier
   * vê o conteúdo visual e extrai valor + descrição direto da imagem.
   */
  image?: {
    /** Base64 puro (sem o data: URI). */
    base64: string;
    /** MIME ex.: "image/jpeg", "image/png". */
    mimeType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  };
}

export interface AIClassifier {
  readonly providerName: AIProvider;
  classify(ctx: ClassifyContext): Promise<TransactionDraft>;
}
