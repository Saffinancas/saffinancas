# Cofre — Finanças familiares via WhatsApp + IA

> **Cofre** é codinome. O nome de marca ainda não foi escolhido — trocar em
> [`apps/web/src/lib/brand.ts`](apps/web/src/lib/brand.ts).

SaaS de finanças familiares cujo diferencial é capturar receitas e despesas das
mensagens de um **grupo de WhatsApp** da família, classificando com **IA**
(Claude / OpenAI / Gemini — o cliente escolhe).

```
Família 🏠 (WhatsApp)               Cofre                          Família 🏠 (dashboard)
─────────────────────                ─────                          ──────────────────────
"paguei 320 no mercado"  ──────▶  worker-whatsapp  ──fila──▶  classificador IA  ──▶  Postgres  ──▶  Next.js dashboard
                                       ↑                                                              ↑
                                  whatsapp-web.js                                                  Open Finance via Pluggy
                                  (Fase 1; trade-off                                               (Fase 3 — opcional pro cliente)
                                  documentado)
```

---

## Status atual

**Fase 0 — Foundation (scaffold inicial).** Em código aqui hoje:

- Landing pública navegável (`/`) com hero, "como funciona", diferenciais,
  comparativo, casos de uso, preço, FAQ, footer.
- Páginas placeholder para `/entrar` e `/assinar` (auth + checkout viram na
  Fase 0/1).
- Design system com tokens em OKLCH, fonte serif para números grandes, dark
  mode sem FOUC.
- Modelo de dados completo (`packages/db`) cobrindo **todas** as entidades do
  §5 do prompt-mestre. Pronto para `drizzle-kit generate`.
- Abstração `AIClassifier` multi-provider (`packages/ai`) com prompt pt-BR e
  structured output. Não está cabeado ao banco ainda — é só a camada de
  classificação.
- Stub do worker WhatsApp (`apps/worker-whatsapp`) com decisão de
  arquitetura **documentada** em [`TRADEOFFS.md`](apps/worker-whatsapp/TRADEOFFS.md)
  — leia antes de codar a captura de Fase 1.

**Não está aqui ainda** (próximos passos por fase em [`docs/roadmap.md`](docs/roadmap.md)):
- Auth (Better Auth)
- Checkout + webhooks Pagar.me
- Painel admin
- Pipeline real de ingestão WhatsApp
- Dashboard
- Pluggy / Open Finance

---

## Setup local

Pré-requisitos: Node 20+, pnpm 9+, Postgres 15+ (local ou Neon/Supabase),
Redis (Docker ou local) — Redis só importa quando começar a rodar o worker.

```bash
# 1. dependências
pnpm install

# 2. ambiente
cp .env.example .env
# preencher DATABASE_URL e os secrets que você for usar

# 3. (opcional, ainda sem migrations geradas) gerar SQL a partir do schema
pnpm db:generate
pnpm db:migrate

# 4. rodar a web
pnpm dev
# abre em http://localhost:3000
```

## Estrutura

```
apps/
  web/                 Next.js 15 (landing + dashboard + admin futuro)
  worker-whatsapp/     Worker isolado para a sessão WhatsApp (Fase 1+)
packages/
  db/                  Schema Drizzle + cliente Postgres compartilhado
  ai/                  AIClassifier (Claude/OpenAI/Gemini) + prompt pt-BR
docs/
  architecture.md      Decisões de arquitetura e por quês
  roadmap.md           Plano por fases (0–4)
  design-system.md     Tokens, princípios, componentes-âncora
  security-lgpd.md     Criptografia, retenção, LGPD, auditoria
```

## Scripts úteis

| Script | Faz |
| --- | --- |
| `pnpm dev` | Sobe a web em http://localhost:3000 |
| `pnpm build` | Build de produção da web |
| `pnpm typecheck` | TS check em todos os pacotes |
| `pnpm db:generate` | Gera SQL incremental a partir do schema Drizzle |
| `pnpm db:migrate` | Aplica migrations no Postgres apontado por `DATABASE_URL` |
| `pnpm db:studio` | Abre o Drizzle Studio (browser do schema) |
| `pnpm worker:wa` | Sobe o worker WhatsApp (Fase 1+, hoje é placeholder) |

---

## Decisões que você (usuário) precisa tomar antes da Fase 1

1. **Nome de marca final** → trocar em `apps/web/src/lib/brand.ts`.
2. **WhatsApp Web vs Cloud API** → ver
   [`apps/worker-whatsapp/TRADEOFFS.md`](apps/worker-whatsapp/TRADEOFFS.md). Recomendação:
   começar com whatsapp-web.js.
3. **Provedor de Postgres** (Neon ✓ recomendado, Supabase, RDS).
4. **Auth** — scaffolding planejado com Better Auth. Aceita Clerk se preferir
   menos código próprio (ver `docs/architecture.md`).
5. **Storage de comprovantes** — Cloudflare R2 ou S3.

---

## Licença

Privado / proprietário. © {Year} {LegalName}.
