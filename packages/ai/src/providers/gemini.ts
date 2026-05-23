import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import {
  type AIClassifier,
  type ClassifyContext,
  type TransactionDraft,
  transactionDraftSchema,
} from "../types";
import { SYSTEM_PROMPT_PT_BR, buildUserPrompt } from "../prompt";

export class GeminiClassifier implements AIClassifier {
  readonly providerName = "gemini" as const;

  private readonly genAI = new GoogleGenerativeAI(
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "",
  );

  constructor(private readonly model = "gemini-1.5-flash") {}

  async classify(ctx: ClassifyContext): Promise<TransactionDraft> {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: SYSTEM_PROMPT_PT_BR,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            is_transaction: { type: SchemaType.BOOLEAN },
            type: { type: SchemaType.STRING, enum: ["expense", "income"] },
            amount_cents: { type: SchemaType.INTEGER },
            currency: { type: SchemaType.STRING },
            description: { type: SchemaType.STRING },
            category_suggestion: { type: SchemaType.STRING },
            confidence: { type: SchemaType.NUMBER },
            occurred_at: { type: SchemaType.STRING },
            payer_hint: { type: SchemaType.STRING },
            raw_text: { type: SchemaType.STRING },
          },
          required: ["is_transaction", "confidence", "raw_text"],
        },
      },
    });

    const res = await model.generateContent(buildUserPrompt(ctx));
    const text = res.response.text();
    const parsed = JSON.parse(text);
    return transactionDraftSchema.parse({ ...parsed, raw_text: ctx.text });
  }
}
