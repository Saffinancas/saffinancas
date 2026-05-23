# Design System

> "Sério como banco, leve como app de mensagem." (§7 do prompt-mestre)

## Inspirações

Linear, Vercel Dashboard, Stripe Dashboard, Mercury, Revolut.
**Não copiar Nubank** — referência over-explorada, e a paleta roxa briga com a
seriedade que queremos.

## Não-fazeres

- Sem ilustrações infantis.
- Sem gradientes neon.
- Sem ícones flat genéricos (uso de `lucide-react` apenas).
- Sem paleta arco-íris — uma cor primária forte e dois tons funcionais.

## Tokens

Todos em `apps/web/src/app/globals.css`, expressos em OKLCH (melhor preservação
perceptual entre light/dark).

### Cor

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--color-primary` | `oklch(42% .08 160)` (#0A5C42-ish) | `oklch(72% .13 158)` | Botões primários, links, foco |
| `--color-income` | `oklch(52% .09 155)` | `oklch(75% .13 155)` | Receitas (dessaturado, **não verde-neon**) |
| `--color-expense` | `oklch(54% .13 28)` | `oklch(72% .14 28)` | Despesas (dessaturado, **não vermelho-de-erro**) |
| `--color-warning` | `oklch(70% .13 75)` | `oklch(80% .13 75)` | Atrasos, avisos |
| `--color-danger` | `oklch(55% .18 25)` | `oklch(70% .17 25)` | Erro crítico, exclusão |
| `--color-bg` | `oklch(99.2% .003 110)` | `oklch(15% .008 260)` | Fundo neutro — **não branco puro, não preto puro** |

### Tipografia

- **UI:** Inter (variável). Pesos 400/500/600/700.
- **Display (números grandes, hero):** Instrument Serif 400, normal + italic.
- `font-variant-numeric: tabular-nums` em **todo lugar** que mostra dinheiro.
  Há classe `.num` / `.tabular` pra forçar isso onde precisar.
- Hierarquia padrão: `text-3xl/4xl tracking-tight` em h2, mantra é "letterspace
  apertado em títulos grandes, normal em corpo".

### Espaço e raio

- Raios: 6/10/16/22 (sm/base/lg/xl).
- Cards de conteúdo: `radius-lg` (16px).
- Botões e inputs: `radius` (10px).
- Pills: full.

### Sombras

Duas: `--shadow-soft` para cards em repouso e `--shadow-pop` para overlays e
estados elevados. Nada de "drop shadow chamativa".

## Componentes-âncora (do prompt §7)

### 1. KPI card (Receita / Despesa / Resultado)

O "rosto" do produto. **Número grande em serif itálico** (`.display-serif`),
prefixo "R$" pequeno, sublinha discreta de comparação. Ver
[`apps/web/src/components/landing/dashboard-preview.tsx#Kpi`](../apps/web/src/components/landing/dashboard-preview.tsx).

### 2. Linha de transação na listagem

Vai aparecer milhares de vezes. Já tem versão usada na preview do dashboard.
Estrutura: `[ícone categoria] [descrição / autor·canal]   [valor tabular colorido]`.
Altura compacta (40–48px no mobile, 56px no desktop). Hover sutil. Tap = abre
slide-over no desktop / bottom sheet no mobile.

### 3. Modal/painel de detalhe de transação

Slide-over (desktop) ou bottom sheet (mobile). Campos editáveis inline.
Histórico de edição. Botão "Aprender com isso" → cria `category_rule`.

### 4. Empty states

Toda lista vazia tem ilustração leve (não infantil — pode ser SVG geométrico
com a cor primária) + CTA contextual. "Sua família ainda não mandou nada no
grupo. Manda lá: 'paguei 30 no café' — a gente faz o resto."

### 5. Estado "esperando primeira mensagem"

Momento crítico. Tela com:
- Status da sessão WhatsApp em pulso ("Conectado", animação verde).
- Última transação capturada (se houver) ou skeleton animado.
- CTA secundário: "Lançar uma manual agora".

## Microinterações

- Nova transação chegando: animar entrada (slide + fade, 280ms ease-out) +
  pulse de 1.5s no card de KPI afetado.
- Meta batida: confetti **discreto** (8–12 partículas, 1s). Não exagerar.
- Skeleton em todo carregamento de lista.
- Toggle de tema: **sem transição de cor** (causa flash). Já desabilitado.

## Acessibilidade

- Contraste **AA mínimo** em todos os textos (verificado: nosso primário
  contra `bg` light = 7.6:1; dark = 5.1:1).
- Foco visível: ring de 2px no `--color-primary` com offset 2px.
- Navegação por teclado completa (Radix Primitives garantem em modais e menus).
- ARIA labels em ícones-button.
- Tamanhos: touch target ≥44px no mobile (botões `size="lg"` = 48px).

## Princípios de copy

- Português brasileiro, tom conversacional, **não bancário-formal**.
- "Você" em vez de "o usuário".
- Sem exclamação em excesso. Confiança em tom calmo.
- Nunca usar emoji em fluxo crítico (cadastro, pagamento, exclusão). Pode usar
  em landing/marketing — `🏠`, `🇧🇷`.
