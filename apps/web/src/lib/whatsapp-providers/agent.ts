/**
 * Agente conversacional Claude. Recebe pergunta do usuário (texto livre),
 * decide quais tools chamar (em loop), e devolve uma resposta em texto
 * formatada pra mandar no WhatsApp.
 *
 * Loop:
 *   1. Manda system prompt + user msg + tools disponíveis
 *   2. Claude responde com tool_use blocks
 *   3. Executamos cada tool, anexamos tool_result, voltamos pro 1
 *   4. Quando Claude termina (stop_reason: end_turn), pegamos o texto final
 */
import Anthropic from "@anthropic-ai/sdk";
import { TOOLS } from "./agent-tools";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_ITERATIONS = 5;

const SYSTEM_PROMPT = `Você é o assistente financeiro do Saf Finanças, conversando via WhatsApp com um usuário da família.

Estilo:
- Português brasileiro informal mas claro
- Respostas CURTAS (máx 6 linhas no WhatsApp). Use bullets quando útil
- Sempre baseado em DADOS reais — chame as ferramentas pra buscar
- Se não tem dados pra responder, diga e sugira ação ("ainda não tem transações esse mês")
- Use emojis com moderação (1-2 por resposta, no máximo)
- Valores sempre em R$ formatado

Você NÃO inventa números. Se a pergunta exige cruzar info, chame múltiplas tools.
Se a mensagem não é uma pergunta financeira (ex: cumprimento, conversa fiada), responda curto e amigável.
`;

export async function runAgent(params: {
  text: string;
  familyId: string;
  timezone?: string;
  senderName?: string | null;
}): Promise<string> {
  const { getPlatformSetting } = await import("@/lib/platform-settings");
  const apiKey = await getPlatformSetting("ai.anthropic_api_key");
  if (!apiKey) return "Desculpe, IA não configurada.";
  const client = new Anthropic({ apiKey });
  const tz = params.timezone ?? "America/Sao_Paulo";

  const messages: Anthropic.Messages.MessageParam[] = [
    {
      role: "user",
      content: params.senderName
        ? `(${params.senderName}): ${params.text}`
        : params.text,
    },
  ];

  const tools: Anthropic.Messages.Tool[] = TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  }));

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages,
    });

    // Junta texto + tool_uses
    const toolUses = res.content.filter(
      (c: Anthropic.Messages.ContentBlock) => c.type === "tool_use",
    );

    if (res.stop_reason === "end_turn" || toolUses.length === 0) {
      const textBlock = res.content.find(
        (c: Anthropic.Messages.ContentBlock) => c.type === "text",
      );
      return textBlock && textBlock.type === "text"
        ? textBlock.text.trim() || "Não consegui entender. Tenta de novo?"
        : "Não consegui entender. Tenta de novo?";
    }

    // Adiciona resposta do assistant (necessário pro tool_use)
    messages.push({ role: "assistant", content: res.content });

    // Executa cada tool e anexa resultado
    const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const block of toolUses) {
      if (block.type !== "tool_use") continue;
      const tool = TOOLS.find((t) => t.name === block.name);
      let output: unknown;
      try {
        output = tool
          ? await tool.run(
              block.input as Record<string, unknown>,
              params.familyId,
              tz,
            )
          : { error: "tool desconhecida" };
      } catch (err) {
        output = { error: err instanceof Error ? err.message : "erro" };
      }
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(output),
      });
    }
    messages.push({ role: "user", content: toolResults });
  }

  return "Demorou demais pra processar essa. Tenta uma pergunta mais simples?";
}
