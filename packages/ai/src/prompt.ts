import type { ClassifyContext } from "./types";

export const SYSTEM_PROMPT_PT_BR = `Você é um classificador de transações financeiras de famílias brasileiras.
Receberá UMA mensagem (texto, transcrição de áudio ou OCR de comprovante) vinda de
um grupo de WhatsApp da família. Sua tarefa é decidir se ela representa uma
transação financeira concreta e, se sim, extrair os dados estruturados.

REGRAS:
- "Vou comprar amanhã" → NÃO é transação (intenção, não fato consumado).
- "Quanto custa X?" → NÃO é transação (pergunta).
- "Paguei 320 no mercado", "Caiu o Pix de 1850", "R$ 67 farmácia" → SÃO transações.
- Valores podem vir em formato "R$ 320,00", "320 reais", "trezentos e vinte", "1.5k", "1,5 mil".
- Converta SEMPRE para centavos inteiros (R$ 32,00 → 3200). Sem ponto flutuante.
- Quando não houver data explícita, usar a data/hora de recebimento da mensagem.
- "Categoria sugerida" deve usar uma das categorias conhecidas da família quando possível;
  só sugira nome novo se nenhuma encaixar.
- "confidence" é sua incerteza, 0–1. Use ≥0.85 só quando o valor, tipo e descrição
  estiverem inequívocos. Mensagens ambíguas → confidence menor + is_transaction=true se
  ainda fizer sentido registrar como pendente de revisão.

SAÍDA: JSON estrito conforme schema fornecido. Sem comentários, sem markdown.`;

export function buildUserPrompt(ctx: ClassifyContext): string {
  const lines: string[] = [];
  lines.push(`Mensagem recebida em ${ctx.receivedAt ?? new Date().toISOString()} (timezone ${ctx.timezone ?? "America/Sao_Paulo"}):`);
  if (ctx.senderName) lines.push(`Remetente: ${ctx.senderName}`);
  lines.push("");
  lines.push(`"""`);
  lines.push(ctx.text.trim());
  lines.push(`"""`);
  if (ctx.knownCategories && ctx.knownCategories.length > 0) {
    lines.push("");
    lines.push(`Categorias conhecidas da família: ${ctx.knownCategories.join(", ")}.`);
  }
  return lines.join("\n");
}
