# Deploy multi-cloud (Fase atual)

Plano de deploy **pra começar com custo quase zero** (US$ 0-25/mês até ~50
clientes ativos). Quando passar de ~100 clientes ativos, vale migrar pra AWS
Fargate — ver [`migration-aws-future.md`](migration-aws-future.md).

## Visão geral

| Componente | Provider | Free tier | Pago |
|---|---|---|---|
| App Next.js + APIs | **Vercel** | 100GB bandwidth + cron | Pro US$ 20/mês quando passar |
| Postgres | **Neon** | 0.5GB + 191h compute/mês (escala a 0) | Scale US$ 19/mês |
| Email | **Resend** | 3.000 emails/mês | US$ 20/mês |
| DNS | Cloudflare/Registro.br | — | ~R$ 40/ano (domínio) |
| Storage | **Cloudflare R2** | 10GB + 1M req/mês | US$ 0,015/GB |
| Redis (worker) | **Upstash** | 10k req/dia | US$ 0,20/100k req |
| Worker WhatsApp | **Fly.io** | 3 micro-VMs free | US$ 2-5/mês cada |

**Order de deploy**: Vercel → Neon → DNS → Resend → (Worker/R2 quando precisar).

---

## 1. Neon (Postgres)

1. Crie conta em **[neon.tech](https://neon.tech)**
2. **New Project** → nome `saf-financas`, region `sa-east-1 (São Paulo)`
3. Em **Connection Details**, copie a **Pooled connection string**:
   ```
   postgresql://USER:PASS@ep-XXXX-pooler.sa-east-1.aws.neon.tech/saf?sslmode=require
   ```
4. Em **Settings → Compute**, deixe `Suspend after 5 min of inactivity` ligado
   (escala pra zero — paga só quando há tráfego)

5. **Aplicar migrações**:
   ```bash
   DATABASE_URL="<sua-pooled-url>" pnpm db:migrate:cloud
   ```
   ⚠️ Use o script `migrate:cloud` (chama `drizzle-kit migrate`, não o tsx local).

6. **Seed do admin inicial**:
   ```bash
   DATABASE_URL="<sua-pooled-url>" SEED_ADMIN_EMAIL="ti@cmosdrake.com.br" \
     SEED_ADMIN_PASSWORD="SuaSenhaForte123" pnpm seed:admin
   ```

---

## 2. Vercel (Next.js)

1. Crie conta em **[vercel.com](https://vercel.com)** (login com GitHub)
2. **Add New Project** → importa este repo (`FinancasPessoais`)
3. **Configure Project**:
   - **Framework Preset**: Next.js (auto)
   - **Root Directory**: deixar vazio (root do monorepo, o `vercel.json` aponta pra `apps/web`)
   - **Build Command**: `pnpm --filter @cofre/web build` (já vem do `vercel.json`)
   - **Install Command**: `pnpm install --frozen-lockfile` (já vem)
   - **Output Directory**: `apps/web/.next` (já vem)

4. **Environment Variables** (Settings → Environment Variables — `Production`):
   Copie do [`.env.production.example`](../apps/web/.env.production.example) e
   preencha:

   **Obrigatórias pro 1º deploy:**
   ```
   DATABASE_URL=postgresql://...neon.tech/...
   NEXT_PUBLIC_APP_URL=https://saffinancas.com.br
   BETTER_AUTH_SECRET=<openssl rand -base64 32>
   BETTER_AUTH_URL=https://saffinancas.com.br
   PLATFORM_ENCRYPTION_KEY=<openssl rand -base64 32>
   CRON_SECRET=<openssl rand -hex 32>
   ```

   **Opcionais (preenche conforme for usar):**
   - `ANTHROPIC_API_KEY` (pro classificador real ligar)
   - `PAGARME_*` (cobrança real)
   - `RESEND_API_KEY` + `EMAIL_FROM` (envio de email)
   - `FOCUSNFE_TOKEN` (emissão NFSe real)
   - `WHATSAPP_MODE=sim` (deixa sim até subir o worker)

5. **Deploy**: vercel faz build automático. Se falhar, olhe o log — geralmente
   é env var faltando ou migração não aplicada.

6. **Cron**: o `vercel.json` já tem `crons: [{ path: '/api/cron/nfse-schedules',
   schedule: '0 8 * * *' }]` — Vercel chama esse endpoint diariamente às 8h UTC
   (5h BRT) com o `Authorization: Bearer <CRON_SECRET>` header.

---

## 3. DNS no Cloudflare (ou onde estiver)

Depois do primeiro deploy, Vercel te dá uma URL `.vercel.app`. Pra apontar seu
domínio real (ex.: `saffinancas.com.br`):

1. Em **Vercel → Settings → Domains**: adiciona `saffinancas.com.br` e
   `www.saffinancas.com.br`
2. Vercel mostra os registros a criar. Geralmente:
   ```
   Tipo   Nome   Valor                           Proxy
   A      @      76.76.21.21                     DNS only
   CNAME  www    cname.vercel-dns.com            DNS only
   ```
3. **Cloudflare**: cria os registros. **IMPORTANTE**: deixa em "DNS only"
   (nuvem cinza), não "Proxied" — Cloudflare proxy atrapalha o ACME challenge
   do Vercel. Pode ligar o proxy depois que o cert estiver emitido.
4. Aguarde 1-30 min pra propagação. Vercel emite o TLS automaticamente.

---

## 4. Resend (email transacional)

1. Crie conta em **[resend.com](https://resend.com)**
2. **Domains** → **Add Domain** → `saffinancas.com.br`
3. Resend mostra os registros DNS (SPF, DKIM, DMARC) — adicione no Cloudflare
4. Após verificar (~5 min), **API Keys** → cria uma chave com perm `Send`
5. Plugar no Vercel:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   EMAIL_FROM=Saf Finanças <no-reply@saffinancas.com.br>
   ```
6. Re-deploy via Vercel (Settings → Deployments → ... → Redeploy)

Agora os agendamentos de NFSe que tiverem emails configurados disparam de
verdade. Sem o `RESEND_API_KEY`, o adapter loga no console e segue.

---

## 5. Cloudflare R2 (storage — opcional Fase 3+)

Só precisa quando habilitar comprovantes WhatsApp ou anexos de NFSe.

1. **[Cloudflare R2](https://dash.cloudflare.com/?to=/:account/r2)** → ativa
2. **Create bucket** → `saf-attachments`
3. **API Tokens** → cria um token com perm R/W no bucket
4. Plugar no Vercel:
   ```
   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET=saf-attachments
   ```

---

## 6. Worker WhatsApp em Fly.io (Fase 1+, opcional)

Pra captura real de WhatsApp via `whatsapp-web.js`. Pode esperar até validar
o produto com clientes em modo simulado.

1. Crie conta em **[fly.io](https://fly.io)** (precisa de cartão de crédito)
2. Instale o `flyctl`: `iwr https://fly.io/install.ps1 -useb | iex` (Windows)
3. No diretório do projeto:
   ```bash
   cd apps/worker-whatsapp
   fly launch --name saf-worker --region gru --no-deploy
   ```
4. Anexar volume persistente pra sessão whatsapp-web.js:
   ```bash
   fly volumes create wwebjs_auth --size 1 --region gru
   ```
5. Configurar secrets:
   ```bash
   fly secrets set DATABASE_URL="postgresql://...neon.tech/..." \
                   REDIS_URL="rediss://...upstash.io..." \
                   ANTHROPIC_API_KEY="..." \
                   PLATFORM_ENCRYPTION_KEY="..." \
                   WHATSAPP_SESSION_DIR="/data/wwebjs_auth"
   ```
6. Configurar `fly.toml` pra montar o volume em `/data` (gerado pelo `fly launch`)
7. Deploy: `fly deploy`
8. No Vercel: setar `WHATSAPP_MODE=real` e re-deploy

---

## 7. Upstash Redis (fila BullMQ — quando worker subir)

1. Crie conta em **[upstash.com](https://upstash.com)**
2. **Create Database** → Redis → region `sa-east-1`
3. Copie a **TLS Redis URL** (`rediss://...`)
4. Plugar no Vercel + Fly.io como `REDIS_URL`

---

## Checklist pós-deploy

- [ ] `https://saffinancas.com.br/` carrega a landing
- [ ] `https://saffinancas.com.br/admin/login` carrega e admin loga
- [ ] `https://saffinancas.com.br/assinar` cria conta de teste e cai no app
- [ ] Vercel **Logs** sem erros recorrentes
- [ ] Neon **Monitoring** mostra queries chegando
- [ ] Cron rodou pelo menos 1x (chega 8h UTC primeira vez ou força via Vercel UI)

## Manutenção rotineira

| Tarefa | Frequência | Como |
|---|---|---|
| Verificar logs de erro | Diário | Vercel → Logs / Sentry dashboard |
| Backup Postgres | Auto | Neon faz Point-in-Time automático (free tier: 7 dias) |
| Atualizar dependências | Mensal | `pnpm update -r` + `pnpm build` + smoke test |
| Rotacionar `BETTER_AUTH_SECRET` | Semestral | Gera novo + atualiza Vercel + invalida sessões |

## Estimativa de custos por fase

| Métrica | 0-10 famílias | 10-50 | 50-200 |
|---|---|---|---|
| Vercel | Free | Free → Pro US$ 20 | Pro |
| Neon | Free | Free → Scale US$ 19 | Scale |
| Resend | Free (3k) | Free | ~US$ 20 |
| R2 | Free | Free → US$ 1 | ~US$ 3 |
| Upstash | Free | Free | ~US$ 10 |
| Fly.io (worker) | 1 micro free | ~US$ 5 | ~US$ 15 |
| **Total fixo** | **US$ 0** | **US$ 0-45** | **US$ 75-100** |
| Custo IA (variável) | US$ 0-2 | US$ 5-30 | US$ 50-200 |
| Custo NFSe (variável) | US$ 0 | R$ 30-150 | R$ 200-800 |

Quando passar de **150-200 famílias ativas**, vale revisitar a migração pra
AWS — ver [`migration-aws-future.md`](migration-aws-future.md).
