# Migração futura: multi-cloud → AWS sa-east-1

Este documento é o plano de migração **a executar quando você passar de
~150-200 famílias ativas** (ou quando o custo do Vercel Pro + Neon Scale +
serviços relacionados ficar maior do que Fargate vai custar).

**Status:** plano. Sem código terraform ainda. Quando for executar, eu monto.

---

## Quando faz sentido migrar

| Sinal | Multi-cloud vence | Hora de AWS |
|---|---|---|
| Custo mensal | ~US$ 100 | passou de US$ 200 |
| Famílias ativas | <100 | 150+ |
| Bandwidth Vercel | <100GB | >500GB |
| Necessidade de VPC/networking | não | sim (HIPAA, ISO, contratos enterprise) |
| Workloads pesados (image proc, ML) | não | sim |

Mas **não migre antes** — multi-cloud é mais barato no início.

---

## Arquitetura alvo (AWS Fargate em sa-east-1)

```
                    ┌──────────────┐
   Cliente Web ────▶│  CloudFront  │ (CDN + WAF)
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │     ALB      │ (TLS termination, sa-east-1)
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌─────▼─────┐     ┌─────▼─────┐
   │ ECS-Web │       │ ECS-Worker│     │ ECS-Cron  │
   │ Fargate │       │ (WhatsApp)│     │ (NFSe)    │
   │  2 tasks│       │  1 task   │     │  1 task   │
   └────┬────┘       └─────┬─────┘     └─────┬─────┘
        │                  │                  │
        └──────────┬───────┴─────────┬───────┘
                   │                 │
            ┌──────▼────────┐  ┌─────▼───────┐
            │ RDS Postgres  │  │ ElastiCache │
            │ (Multi-AZ)    │  │   Redis     │
            └───────────────┘  └─────────────┘

   ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌─────────┐
   │    S3    │  │   EFS    │  │   Secrets    │  │  Route  │
   │attachments│  │WhatsApp │  │   Manager    │  │   53    │
   └──────────┘  │ session  │  └──────────────┘  └─────────┘
                 └──────────┘
```

---

## Decisões já tomadas (recap da discussão anterior)

- **Região**: `sa-east-1` (São Paulo)
- **DNS**: externo (Cloudflare), CNAME apontando pro ALB ou CloudFront
- **Multi-AZ no RDS**: a decidir — começa Single-AZ pra economizar US$ 18/mês,
  promove pra Multi-AZ quando tiver >50 clientes pagantes
- **NAT Gateway**: usar **VPC Endpoints** em vez (economiza ~US$ 35/mês)

---

## Estrutura do repositório AWS

```
infra/aws/
├── bootstrap/                    # roda 1x manual: cria S3 + DynamoDB pro tfstate
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
├── modules/
│   ├── vpc/                      # VPC + subnets + VPC Endpoints (sem NAT)
│   ├── ecs-cluster/              # Cluster + capacity providers (Fargate + Fargate Spot)
│   ├── ecs-service/              # Reusable pra web/worker/cron
│   ├── rds-postgres/             # RDS + parameter group + subnet group
│   ├── elasticache-redis/        # Single-node t4g.micro
│   ├── alb/                      # ALB + target groups + listener (443)
│   ├── cloudfront/               # CloudFront na frente do ALB
│   ├── ecr/                      # Repos saf-web, saf-worker
│   ├── s3/                       # Buckets attachments, backups
│   ├── efs/                      # Volume da sessão WhatsApp
│   ├── secrets/                  # Secrets Manager (vazios — popula depois)
│   ├── iam/                      # Roles task-exec, task-web, task-worker
│   └── waf/                      # WAFv2 com regras básicas (opcional)
└── envs/
    ├── staging/
    │   ├── main.tf               # Compõe módulos pro env staging
    │   ├── terraform.tfvars
    │   └── backend.tf
    └── production/
        └── ...
```

---

## Checklist pré-migração (D-15 do switch)

- [ ] Conta AWS com billing ativo + MFA root
- [ ] IAM user `terraform-saf` ou SSO/Identity Center
- [ ] Quota Fargate vCPU **subida pra 16** em sa-east-1 (Service Quotas)
- [ ] Quota Elastic IPs pra **5+** (caso reativar NAT)
- [ ] Backup completo do Neon (snapshot manual + dump local)
- [ ] Dump SQL testado em Postgres local
- [ ] ACM certificate solicitado em `sa-east-1` (pro ALB) e `us-east-1` (pro CloudFront)
- [ ] Email transacional do Resend continua funcionando (não muda)
- [ ] Cloudflare DNS pronto pra apontar CNAME → CloudFront
- [ ] Pelo menos 1 deploy de **staging** rodando antes de mexer em production

---

## Estratégia de cutover (sem downtime)

### Opção A — Cutover em janela de manutenção
1. Pausa cadastros novos por 30min
2. `pg_dump` do Neon → `pg_restore` no RDS
3. Vercel → AWS via DNS swap (TTL baixo previamente)
4. Reativa cadastros

### Opção B — Replicação ativa
1. Configura logical replication do Neon → RDS via `pglogical`
2. Verifica que dados estão idênticos
3. DNS swap durante baixo tráfego
4. Para o Neon depois de 7 dias

**Recomendação**: começar com Opção A em uma noite. Mais simples.

---

## Custo previsto sa-east-1 (Multi-AZ, com CloudFront)

| Recurso | Mensal |
|---|---|
| Fargate web (0.5 vCPU × 2 tasks 24/7) | US$ 22 |
| Fargate worker WhatsApp (0.25 vCPU × 1) | US$ 6 |
| RDS db.t4g.micro Multi-AZ (20GB gp3) | US$ 36 |
| ElastiCache cache.t4g.micro | US$ 14 |
| ALB | US$ 18 |
| EFS (1GB) | US$ 0,30 |
| S3 (10GB + 100k req) | US$ 3 |
| CloudFront (100GB egress) | US$ 12 |
| Secrets Manager (20 secrets) | US$ 8 |
| CloudWatch (logs + alarms) | US$ 5 |
| VPC Endpoints (substitui NAT) | US$ 7 |
| WAFv2 (regras básicas) | US$ 6 |
| **Total** | **~US$ 140** |

Comparativo: com 500 famílias ativas no Vercel multi-cloud o custo bate ~US$
300-400, então **migrar pra AWS economiza US$ 150-250/mês nessa escala**.

---

## Comandos da migração (quando chegar a hora)

```bash
# 1. Bootstrap state backend (uma vez)
cd infra/aws/bootstrap
terraform init && terraform apply

# 2. Provisiona staging
cd ../envs/staging
terraform init && terraform plan
terraform apply

# 3. Build e push das imagens
docker build -t saf-web:latest -f apps/web/Dockerfile .
docker build -t saf-worker:latest -f apps/worker-whatsapp/Dockerfile .
# Push pros ECR repos criados pelo terraform

# 4. Force new deployment do ECS service
aws ecs update-service --cluster saf-staging --service web --force-new-deployment

# 5. Restore do dump Postgres no RDS
pg_restore --no-owner --clean -d <RDS_URL> backup-neon.dump

# 6. Smoke test staging por 1 semana

# 7. Promove pra production
cd ../production && terraform apply

# 8. DNS swap (Cloudflare): CNAME → CloudFront
```

---

## Itens que não migram automaticamente

- **Sessões Better Auth**: usuários precisam logar de novo (cookies novos)
- **WhatsApp session do worker**: tem que pareiar QR de novo (sessão em EFS novo)
- **CRON_SECRET**: gera novo, atualiza Vercel cron OFF, configura EventBridge
- **Webhooks Pagar.me/Pluggy**: re-cadastra URL no painel de cada provider

---

## Alternativa: subir SÓ o worker pra AWS, manter front no Vercel

Se a única dor for o worker (WhatsApp + cron NFSe), pode-se híbrido permanente:
- Front continua em **Vercel** (simples, escala automática)
- Worker vai pra **AWS Fargate** ou Fly.io (já está)
- DB em **Neon** ou migra pra **RDS**

Custo: ~US$ 30-60/mês adicional só pro worker, sem complicar o front.
