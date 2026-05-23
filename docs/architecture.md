# Arquitetura

> Documento vivo. Cada decisão tem um "Por quê" e um "Trade-off" — não apague,
> só atualize quando mudar.

## Princípios

1. **Multi-tenant por `family_id`** em toda tabela escopada à família. RLS no
   Postgres em produção; em dev, middleware na camada Drizzle/Next garante o
   filtro. **Vazamento entre famílias é o bug número um a prevenir.**
2. **Tudo de IA, banco e WhatsApp é assíncrono.** Nada de chamada externa
   bloqueando request HTTP — fila BullMQ + Redis. O usuário vê estado
   "processando" e o resultado chega em segundos via WebSocket / refetch.
3. **Idempotência em todo webhook** — Pagar.me, Pluggy, WhatsApp. Chave por
   `event_id` + lock pessimista no nosso lado.
4. **Valores monetários em centavos (BIGINT)** — nunca float. Conversão
   pra reais só na camada de apresentação.
5. **Soft delete só onde o histórico importa** (transactions, goals). Resto é
   hard delete pra simplificar resposta a LGPD.

## Stack

| Camada | Escolha | Por quê | Alternativa considerada |
|--------|---------|---------|-------------------------|
| Web framework | Next.js 15 (App Router) | Cravado no prompt; ótimo DX + edge | Remix, SvelteKit |
| Linguagem | TypeScript estrito (`noUncheckedIndexedAccess`) | Bug-by-bug parity entre web e worker | — |
| UI | Tailwind 4 (CSS-first) + shadcn/ui + Radix Primitives | Tokens em CSS, componentes acessíveis sem styling lock-in | Mantine, Chakra |
| Banco | Postgres (Neon ou Supabase em prod) | RLS + JSON + extensões + maturidade | MySQL (sem RLS bom), SQLite (sem multi-tenant sério) |
| ORM | Drizzle | Migrations declarativas, controle do SQL, ergonomia | Prisma (binário grande, generator pesado) |
| Auth | Better Auth | 2FA, multi-org, magic link, OAuth — tudo nativo, sem vendor lock | Clerk (mais turn-key, ~$25/mês), Supabase Auth (acopla a Supabase) |
| Pagamentos | Pagar.me v5 | Cravado no prompt; bom suporte BR | Stripe (problemas pra PIX recorrente no BR) |
| WhatsApp Fase 1 | whatsapp-web.js | Único caminho hoje que suporta grupos em escala | — (ver TRADEOFFS) |
| WhatsApp Fase 4 | Cloud API (Meta) | Oficial, robusto; só viável quando grupos amadurecerem | — |
| Fila / worker | BullMQ + Redis (Upstash) | Padrão de fato, tooling maduro | RabbitMQ (overkill) |
| IA — default | Anthropic (Claude Haiku 4.5) | Melhor relação custo/qualidade pt-BR + structured output sólido | — |
| IA — opções | OpenAI (gpt-4o-mini), Gemini (1.5 Flash) | Cliente escolhe; abstração `AIClassifier` esconde diferenças | — |
| Open Finance | Pluggy | Melhor cobertura BR (Nubank, Inter, Itaú, BB, C6…) | Belvo (cobertura similar; preferência por contrato BR-only) |
| Email | Resend | DX simples, domínios verificados rápido | Postmark, AWS SES |
| Storage | Cloudflare R2 | S3-compat sem egress fees | S3 (egress caro em escala) |
| Observabilidade | Sentry + PostHog | Erros + product analytics + feature flags | Datadog (caro), Honeycomb (overkill) |
| Deploy | Vercel (web), Fly.io (worker), Neon (db), Upstash (redis) | Tudo com tier gratuito utilizável; latência BR aceitável | AWS (mais flex, mais ops); Railway (concentra tudo, lock-in) |

## Forma do monorepo

```
apps/
  web/                Next.js
  worker-whatsapp/    Worker isolado (Node + BullMQ)
packages/
  db/                 Schema + cliente Drizzle (compartilhado)
  ai/                 AIClassifier (compartilhado)
```

pnpm workspaces. **Sem Turborepo/Nx por enquanto** — overhead injustificado pro
tamanho. Adicionar quando o tempo de build local incomodar.

## Diagrama de fluxo (Fase 1 → 2)

```
                ┌────────────────────────┐
                │ WhatsApp do membro     │
                │ da família             │
                └─────────────┬──────────┘
                              │ mensagem
                              ▼
                 ┌─────────────────────────┐
                 │ Worker WhatsApp         │   sessão pareada via QR
                 │ (whatsapp-web.js)       │   roda em Fly.io
                 │                         │
                 │  on('message') ───────► │── enfileira em wa.classify ─┐
                 └─────────────────────────┘                              │
                                                                          ▼
                                                       ┌──────────────────────────┐
                                                       │ Job processor (BullMQ)   │
                                                       │  1. filtro grosso        │
                                                       │  2. transcrição (áudio)  │
                                                       │     OCR (imagem)         │
                                                       │  3. AIClassifier         │
                                                       │  4. INSERT transaction   │
                                                       └─────────────┬────────────┘
                                                                     │
                                                                     ▼
                                                       ┌──────────────────────────┐
                                                       │ Postgres                 │
                                                       └─────────────┬────────────┘
                                                                     │
                                                                     ▼
                                                       ┌──────────────────────────┐
                                                       │ Next.js (RSC + fetch)    │
                                                       │ Dashboard em tempo real  │
                                                       │ (revalidateTag)          │
                                                       └──────────────────────────┘
```

## Webhooks que precisam ser idempotentes

| Webhook | Origem | Identificador único | Política |
|---------|--------|---------------------|----------|
| `/api/webhooks/pagarme` | Pagar.me | `id` do evento | UPSERT em `webhook_events`, lock por subscription |
| `/api/webhooks/pluggy` | Pluggy | `id` do evento + `item_id` | UPSERT, enfileira `sync.bank` |
| (interno) `wa.classify` | BullMQ | `wa_message_id` | `transactions_wa_msg_unique` no banco |

## Segurança

Ver [`security-lgpd.md`](security-lgpd.md). Resumo:
- TLS 1.3 em tudo.
- AES-256-GCM nos campos com `_enc` em `platform_config` (chave em
  `PLATFORM_ENCRYPTION_KEY` env; KMS em prod).
- 2FA obrigatório para `admin_users` e para qualquer família que ative Open Finance.
- IPs em audit log anonimizados após 90 dias (último octeto zerado).
