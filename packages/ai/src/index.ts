import type { AIClassifier, AIProvider } from "./types";
import { AnthropicClassifier } from "./providers/anthropic";
import { OpenAIClassifier } from "./providers/openai";
import { GeminiClassifier } from "./providers/gemini";

export * from "./types";
export { AnthropicClassifier, OpenAIClassifier, GeminiClassifier };
export { SYSTEM_PROMPT_PT_BR, buildUserPrompt } from "./prompt";

/**
 * Factory que escolhe o classificador de acordo com o provider configurado pela
 * família. Para "auto", começamos retornando Claude (mais barato com Haiku 4.5
 * + boa confiabilidade pt-BR); o roteamento real fica para uma Fase 2 que
 * meça custo/latência por mensagem.
 */
export function createClassifier(provider: AIProvider): AIClassifier {
  switch (provider) {
    case "claude":
      return new AnthropicClassifier();
    case "openai":
      return new OpenAIClassifier();
    case "gemini":
      return new GeminiClassifier();
    case "auto":
      return new AnthropicClassifier();
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Unknown AI provider: ${String(_exhaustive)}`);
    }
  }
}
