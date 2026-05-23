# Trade-off de captura: WhatsApp Web (não-oficial) vs Cloud API (oficial)

> Este documento existe porque o prompt-mestre (§12.3) exige decisão explícita
> antes de implementar a captura. **Leia antes de codar a Fase 1.**

## Resumo da escolha

| Eixo | `whatsapp-web.js` (web não-oficial) | WhatsApp Cloud API (Meta) |
|------|--------------------------------------|----------------------------|
| Oficial? | Não (engenharia reversa do WhatsApp Web) | Sim |
| Custódia do número | O número da família é quem pareia (cliente final) | Você precisa de um número WhatsApp Business dedicado |
| Conformidade com ToS | **Viola ToS do WhatsApp** | Compatível |
| Risco de ban | Médio-alto se houver volume ou padrões automatizados | Baixo, se respeitada a política |
| Captura de grupos | Sim, sessão consegue ler grupos onde o número pareado está | **Bots em grupos têm restrições severas**: a Cloud API foca em conversas 1:1 cliente↔negócio. Suporte a grupos é limitado e ainda evoluindo. |
| Custo | Hosting da sessão (RAM + storage) | $0.005–0.05 por conversa, gratuito até 1k conversas/mês |
| Estabilidade | Frágil: a sessão cai quando o WhatsApp atualiza o web protocol | Estável; mas pode requerer aprovação de uso por Meta |
| Captura imediata sem fricção pro cliente? | **Sim** — pareia QR e funciona | **Não** — o cliente precisaria adicionar nosso bot ao grupo, e a feature de grupos da Cloud API ainda é restrita |

## A realidade do produto

O diferencial do produto é **"o grupo que a família já tem no WhatsApp"**. Migrar
isso pra Cloud API exigiria:

1. **Adicionar um número de negócio (nosso) ao grupo deles** — o que muda a
   composição do grupo e quebra a promessa de "zero fricção".
2. **Esperar a Meta liberar bem grupos** — hoje a feature `Groups` da Cloud API
   é experimental e limitada. Ela não vai te dar `on_message` para qualquer
   conversa do grupo de forma confiável.

Sem grupos, a Cloud API só pega DMs cliente↔nosso-número, o que destrói a
proposta de valor (família inteira mandando no mesmo lugar).

## Recomendação para Fase 1

**Usar `whatsapp-web.js`** com a seguinte mitigação de riscos:

- Hospedar o worker em container isolado (Fly.io ou Railway), persistindo a
  sessão num volume EBS-like.
- Limitar uso a **leitura** do grupo + envio opcional de uma única mensagem de
  confirmação (a "✅ R$ 320,00 registrado em Mercado") com rate limit por
  família, pra não parecer automação massiva.
- **Termo de uso explícito**: o cliente autoriza a leitura, sabe que é via
  WhatsApp Web não-oficial e aceita que sessões podem cair.
- Monitorar updates do `whatsapp-web.js` semanalmente; ter um plano de hotfix.
- **Comunicar honestamente** na FAQ e na política de privacidade: "usamos um
  cliente do WhatsApp Web; sessões podem requerer re-pareamento ocasional".

## Caminho de migração — Fase 4

Quando a Cloud API maturar suporte a grupos, ou se a Meta liberar uma "Reader
API" via Open Finance-like (parceria de fato), migrar. Reescrever o adapter
de captura por trás da mesma interface de fila — o pipeline de classificação
(`@cofre/ai`) continua intocado.

## Alternativas avaliadas e descartadas

- **WAHA / Baileys**: mesmo barco do whatsapp-web.js (engenharia reversa). Trocar
  de biblioteca não resolve o problema legal.
- **Twilio WhatsApp Business**: igual à Cloud API quanto à limitação de grupos.
- **Pedir pro cliente encaminhar mensagens manualmente pra nosso número**:
  fricção alta, mata o produto.

## Sinalize ao usuário

Antes de codar a integração: postar no chat um resumo de uma linha desta
decisão e pedir "ok" explícito. O prompt-mestre §12.3 é literal sobre isso.
