import Anthropic from "@anthropic-ai/sdk";
import {
  type AIClassifier,
  type ClassifyContext,
  type TransactionDraft,
  transactionDraftSchema,
} from "../types";
import { SYSTEM_PROMPT_PT_BR, buildUserPrompt } from "../prompt";

const TOOL_NAME = "register_transaction_draft";

const TOOL_INPUT_SCHEMA = {
  type: "object" as const,
  properties: {
    is_transaction: { type: "boolean" },
    type: { type: "string", enum: ["expense", "income"] },
    amount_cents: { type: "integer", minimum: 0 },
    currency: { type: "string", default: "BRL" },
    description: { type: "string" },
    category_suggestion: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    occurred_at: { type: "string", format: "date-time" },
    payer_hint: { type: "string" },
    raw_text: { type: "string" },
  },
  required: ["is_transaction", "confidence", "raw_text"],
  additionalProperties: false,
};

export class AnthropicClassifier implements AIClassifier {
  readonly providerName = "claude" as const;

  constructor(
    private readonly client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    }),
    private readonly model = "claude-haiku-4-5-20251001",
  ) {}

  async classify(ctx: ClassifyContext): Promise<TransactionDraft> {
    const userPrompt = buildUserPrompt(ctx);

    // Quando tem imagem, envia como content multi-modal pra Claude Vision.
    // Haiku 4.5 suporta vision nativamente.
    const userContent = ctx.image
      ? [
          {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: ctx.image.mimeType,
              data: ctx.image.base64,
            },
          },
          {
            type: "text" as const,
            text:
              userPrompt +
              "\n\nA imagem acima é um comprovante/recibo/nota. Extraia o valor total, " +
              "descrição (estabelecimento/produto/serviço) e categoria. Se a legenda " +
              "fornecer detalhes extras, combine com o que está na imagem.",
          },
        ]
      : userPrompt;

    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 512,
      system: SYSTEM_PROMPT_PT_BR,
      tools: [
        {
          name: TOOL_NAME,
          description: "Registra a transação extraída da mensagem.",
          input_schema: TOOL_INPUT_SCHEMA,
        },
      ],
      tool_choice: { type: "tool", name: TOOL_NAME },
      messages: [{ role: "user", content: userContent }],
    });

    const tool = res.content.find((c) => c.type === "tool_use");
    if (!tool || tool.type !== "tool_use") {
      throw new Error("Claude classifier: no tool_use block returned");
    }
    const input = (tool.input ?? {}) as Record<string, unknown>;
    return transactionDraftSchema.parse({ ...input, raw_text: ctx.text });
  }
}
