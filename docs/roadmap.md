# Roadmap por fase

Cada fase entrega um produto navegável de ponta-a-ponta no escopo dela. Não
abrir nova fase com bug aberto em fase anterior.

## Fase 0 — Foundation (semanas 1–2) — **em andamento**

**Objetivo:** repo está pronto pra recber feature de produto.

- [x] Monorepo pnpm (apps/web, apps/worker-whatsapp, packages/db, packages/ai)
- [x] Landing pública (`/`) navegável com 7 seções + dark mode
- [x] Design tokens (OKLCH, Inter + Instrument Serif, tabular-nums)
- [x] Schema Drizzle completo (todas as entidades do §5 do prompt-mestre)
- [x] Abstração `AIClassifier` multi-provider com prompt pt-BR
- [ ] Better Auth: signup + login + verificação de e-mail
- [ ] Pagar.me: subscription create + webhook básico
- [ ] Painel admin esqueleto (`/admin`) com lista de famílias e MRR

## Fase 1 — MVP (semanas 3–6)

**Objetivo:** 20 famílias usando em piloto privado.

- [ ] Worker WhatsApp com whatsapp-web.js, persistência de sessão
- [ ] Pareamento por QR no fluxo de onboarding
- [ ] Seleção do grupo monitorado
- [ ] Pipeline de ingestão: filtro grosso → AIClassifier → INSERT em transactions
- [ ] Auto-aprovar ≥0.85 de confiança; abaixo → `pending_review`
- [ ] Dashboard: 3 KPIs do mês + lista de transações recentes
- [ ] Categorias padrão pré-criadas no signup
- [ ] CRUD manual de transações + edição de categoria 1-a-1
- [ ] Notificação no grupo (opcional, config por família) "✅ R$ X registrado"
- [ ] Critério de aceite #1: cadastro → pagamento aprovado → vínculo WhatsApp →
      primeira transação classificada em < 5 minutos

## Fase 2 — V1 público (semanas 7–10)

**Objetivo:** lançamento público.

- [ ] Configuração de provider de IA por família (claude/openai/gemini/auto)
- [ ] Histórico 12 meses com gráfico de barras
- [ ] Drill-down por categoria + reclassificação em massa
- [ ] Aba **Previsto**: checklist mensal + recorrência + clone automático
- [ ] Aba **Metas** com links externos, anotações, projeção
- [ ] Aba **Futuro**: receitas esperadas, parcelas, gráfico de fluxo de caixa
- [ ] Dark mode polido em todas as telas
- [ ] Mobile: testes em viewport real, touch targets ≥44px
- [ ] PWA instalável

## Fase 3 — Open Finance (semanas 11–14)

**Objetivo:** quem quer dados em tempo real conecta o banco.

- [ ] Pluggy Connect embedado em "Conectar conta"
- [ ] Sync inicial (90 dias para trás) → cada transação passa pelo classificador
- [ ] Webhook do Pluggy para deltas
- [ ] Deduplicação automática banco vs WhatsApp + UI de merge manual
- [ ] Saldo das contas no topo do dashboard
- [ ] Projeção de fluxo de caixa 12 meses pra frente

## Fase 4 — Escala (3+ meses)

- [ ] Migração WhatsApp Cloud API quando Meta liberar grupos com confiabilidade
- [ ] App nativo (iOS + Android) via Expo, reutilizando lógica do PWA
- [ ] Programa de indicação ("1 mês grátis a cada amigo")
- [ ] Web push notifications
- [ ] Suporte a múltiplos usuários por família (hoje 1:1)

## Critérios de pronto globais (Definition of Done)

Independente da fase, nada é considerado pronto sem:

1. Type check passando (`pnpm typecheck`).
2. Lint sem erro.
3. Migrações geradas e aplicadas em ambiente de teste.
4. Lighthouse mobile ≥90 em Perf/A11y/Best/SEO **para a landing**.
5. Sem flash de tema errado (FOUC) ao carregar página.
6. Critérios listados no §11 do prompt-mestre, aplicáveis à fase.
