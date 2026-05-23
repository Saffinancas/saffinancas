import OpenAI from "openai";
import {
  type AIClassifier,
  type ClassifyContext,
  type TransactionDraft,
  transactionDraftSchema,
} from "../types";
import { SYSTEM_PROMPT_PT_BR, buildUserPrompt } from "../prompt";

export class OpenAIClassifier implements AIClassifier {
  readonly providerName = "openai" as const;

  constructor(
    private readonly client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
    private readonly model = "gpt-4o-mini",
  ) {}

  async classify(ctx: ClassifyContext): Promise<TransactionDraft> {
    const res = await this.client.chat.completions.create({
      model: this.model,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "transaction_draft",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              is_transaction: { type: "boolean" },
              type: { type: ["string", "null"], enum: ["expense", "income", null] },
              amount_cents: { type: ["integer", "null"], minimum: 0 },
              currency: { type: "string" },
              description: { type: ["string", "null"] },
              category_suggestion: { type: ["string", "null"] },
              confidence: { type: "number", minimum: 0, maximum: 1 },
              occurred_at: { type: ["string", "null"] },
              payer_hint: { type: ["string", "null"] },
              raw_text: { type: "string" },
            },
            required: [
              "is_transaction",
              "type",
              "amount_cents",
              "currency",
              "description",
              "category_suggestion",
              "confidence",
              "occurred_at",
              "payer_hint",
              "raw_text",
            ],
          },
        },
      },
      messages: [
        { role: "system", content: SYSTEM_PROMPT_PT_BR },
        { role: "user", content: buildUserPrompt(ctx) },
      ],
    });

    const content = res.choices[0]?.message?.content;
    if (!content) throw new Error("OpenAI classifier: empty response");
    const parsed = JSON.parse(content);
    return transactionDraftSchema.parse({ ...parsed, raw_text: ctx.text });
  }
}
