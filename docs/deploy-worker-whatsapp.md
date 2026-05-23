# Deploy do worker WhatsApp (Fly.io)

O worker mantém o `whatsapp-web.js` rodando — um Chromium headless por família que sincroniza com o WhatsApp Web. Ele expõe uma HTTP API privada que a web (Vercel) chama pra parear, listar grupos e desconectar; e processa mensagens via fila BullMQ.

Por que Fly.io? Vercel não roda Chromium e não tem disco persistente. Fly tem ambos — e o tier mais barato (~US$ 5/mês com volume) já dá conta de centenas de famílias.

---

## Pré-requisitos

- Conta Fly.io criada (`fly auth signup`) — sa-east-1 (gru) tem boa latência pro Brasil.
- Upstash Redis criado → guarde o `REDIS_URL` (rediss://).
- Neon Postgres com a mesma `DATABASE_URL` que a web usa.
- `flyctl` instalado: `iwr https://fly.io/install.ps1 -useb | iex` (Windows) ou `curl -L https://fly.io/install.sh | sh` (mac/linux).

---

## Passo a passo

### 1. Criar a app

```powershell
flyctl auth login
flyctl apps create saf-whatsapp --org pessoal
```

### 2. Criar o volume persistente (sessões WhatsApp)

```powershell
flyctl volumes create wa_sessions --region gru --size 3 -a saf-whatsapp
```

3 GB cobre dezenas de famílias (cada sessão whatsapp-web.js ocupa ~30-80MB).

### 3. Gerar o segredo compartilhado

```powershell
$secret = -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Maximum 256) })
$secret  # COPIA esse valor — vai pro worker E pra Vercel
```

(no bash: `openssl rand -hex 32`)

### 4. Setar segredos no Fly

```powershell
flyctl secrets set -a saf-whatsapp `
  DATABASE_URL="postgresql://..." `
  REDIS_URL="rediss://default:..." `
  WORKER_SHARED_SECRET="<o valor gerado>" `
  ANTHROPIC_API_KEY="sk-ant-..." `
  PLATFORM_ENCRYPTION_KEY="<mesma chave da web>"
```

### 5. Deploy

Da raiz do monorepo (importante — Dockerfile assume context = raiz):

```powershell
flyctl deploy -a saf-whatsapp `
  --config apps/worker-whatsapp/fly.toml `
  --dockerfile apps/worker-whatsapp/Dockerfile
```

A build leva ~6-10 min na primeira vez (Chromium pesa). Subsequentes ficam ~2 min com cache.

### 6. Verificar

```powershell
flyctl logs -a saf-whatsapp
# Esperado: "HTTP API up" + "Nenhuma sessão persistente pra restaurar"

curl https://saf-whatsapp.fly.dev/health
# {"ok":true,"activeSessions":0,"uptime":12.3}
```

### 7. Conectar a Vercel ao worker

Na dashboard Vercel → Settings → Environment Variables, adicione:

| Var | Valor |
|---|---|
| `WHATSAPP_MODE` | `real` |
| `WHATSAPP_WORKER_URL` | `https://saf-whatsapp.fly.dev` |
| `WHATSAPP_WORKER_SECRET` | mesmo valor do `WORKER_SHARED_SECRET` |

Redeploy a web (push no main ou clique em "Redeploy") pra carregar as vars.

### 8. Testar fim-a-fim

1. Abre `https://seu-dominio/app/whatsapp`
2. Clique em **Gerar QR Code**
3. WhatsApp do celular → Aparelhos conectados → Conectar um aparelho → escaneia
4. Página atualiza pra "Conectado" e mostra lista de grupos
5. Seleciona o grupo da família
6. Manda mensagem no grupo: **"churrasco 85"** → vira transação no dashboard

---

## Operação

### Ver sessões ativas

```powershell
curl https://saf-whatsapp.fly.dev/health
```

### Ver fila BullMQ

A fila vive no Redis do Upstash. Pra inspecionar, use `redis-cli` ou um GUI como TablePlus apontando pro `REDIS_URL`.

Chave da fila: `bull:wa.classify:*`.

### Restart sem perder sessões

`flyctl machine restart -a saf-whatsapp` mantém o volume `/data/wwebjs_auth`. Ao subir, o worker restaura todas as sessões pelo banco (status=connected) sem QR novo.

### Escalar

```powershell
# Mais memória (se múltiplas famílias começarem a engargalar)
flyctl scale memory 2048 -a saf-whatsapp

# Mais máquinas (cuidado: cada client whatsapp-web.js precisa estar UMA vez só —
# rodar várias máquinas exige sharding por family_id).
```

**Recomendação**: 1 máquina até ~50 famílias ativas. Acima disso, hora de planejar sharding (cada máquina cuida de um subset de families baseado em hash do family_id).

---

## Custo estimado

| Recurso | Tier | Custo/mês |
|---|---|---|
| App Fly (shared-cpu-2x, 1GB, 1 máquina) | hobby | ~$3 |
| Volume 3GB | hobby | ~$0.45 |
| Bandwidth out (~10GB) | incluso | $0 |
| **Total** | | **~$3.50/mês** |

A US$3.50/mês você cobre as ~100 primeiras famílias. Depois disso, escala vertical (memória) e depois sharding horizontal.

---

## Troubleshooting

**"Não consigo escanear o QR" / QR expira muito rápido**
- whatsapp-web.js gera QR a cada ~60s. Recarregue a página se passar disso.
- Verifica se o `qrDataUrl` está chegando: `curl -H "Authorization: Bearer $SECRET" https://saf-whatsapp.fly.dev/sessions/<familyId>`

**"unauthorized" da web pro worker**
- O `WHATSAPP_WORKER_SECRET` na Vercel e `WORKER_SHARED_SECRET` no Fly têm que ser idênticos. Sem espaços, sem aspas.

**Sessão cai sozinha após algumas horas**
- O WhatsApp pode revogar a sessão se o celular ficou offline por muito tempo. O worker detecta (`disconnected`) e o user precisa reparear.
- Em produção, alertar via email/Slack quando isso acontece.

**"Out of memory" no Fly**
- Cada `whatsapp-web.js` consome ~150-300MB. Com 1GB, ~3-5 famílias simultâneas máximo. Subir pra 2GB pra crescer.

**Chromium não inicia**
- Logs do Fly devem mostrar `Failed to launch the browser process`. Garante que o Dockerfile instalou todas as libs (`libgbm1`, `libnss3`, etc.) e que `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium` está no env.
