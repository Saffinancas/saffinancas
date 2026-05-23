# Segurança, privacidade e LGPD

> Cumprir LGPD não é só legal — é diferencial competitivo. Esta página é o
> contrato com o cliente e com o regulador. Se algo aqui mudar, atualizar
> simultaneamente: este doc + Política de Privacidade + termo de consentimento
> no onboarding.

## Princípios

1. **Coletar o mínimo**: só o que serve pra classificar e mostrar transações.
2. **Reter o mínimo**: mensagens brutas do WhatsApp por **90 dias** e depois
   descartar. Transação estruturada (valor, data, categoria) permanece — é o
   produto que o cliente comprou.
3. **Acesso por necessidade**: chaves de IA, Pluggy e Pagar.me só no servidor.
   Cliente nunca vê. Admins têm escopo por `role`.
4. **Direitos do titular sempre auto-atendíveis**: exportar e excluir devem ser
   ações que o usuário faz sozinho na UI.

## Criptografia

| Onde | Como |
|------|------|
| Em trânsito | TLS 1.3 universal. HSTS preload. Sem fallback pra HTTP. |
| Em repouso (banco) | Postgres com encryption at-rest do provedor (Neon/Supabase já garantem). |
| Em repouso (campos sensíveis específicos) | `_enc` em `platform_config` — AES-256-GCM application-level, chave em `PLATFORM_ENCRYPTION_KEY`. Em prod, derivar de KMS. |
| 2FA secrets | Mesmo esquema dos campos `_enc`. |
| Sessões WhatsApp (volume do worker) | Volume EBS-equivalente com encryption habilitada. Backup com a mesma encryption. |
| Comprovantes (R2) | Bucket com server-side encryption + URLs assinadas com TTL curto. |

## Retenção

| Dado | Período | Política |
|------|---------|----------|
| Mensagem bruta WhatsApp (texto, áudio, imagem) | 90 dias | Cron diário deleta linhas em `whatsapp_messages` com `expires_at < now()` + objeto no R2. |
| Transcrição de áudio / OCR | 90 dias | Junto com a mensagem original. |
| Transação estruturada | Enquanto a família estiver ativa | Não expira; deleção via direito do titular. |
| Audit log | 24 meses | IP anonimizado (último octeto = 0) após 90 dias. |
| Logs aplicação (Sentry/Pino) | 30 dias | Sentry config + Pino redaction de PII. |
| Backups DB | 7 dias rolling | Encryption at-rest. |

## Direitos do titular (LGPD)

Implementar **antes do lançamento público** (Fase 2):

- **`GET /me/export`** — gera ZIP com todos os dados do usuário (JSON +
  CSV das transações + comprovantes baixados). Envia link por email com
  TTL de 7 dias.
- **`POST /me/delete`** — agenda exclusão com 30 dias de carência. Email de
  confirmação obrigatório. Após 30 dias: hard delete em cascata por
  `family_id`. Audit log preserva o evento sem dados pessoais.
- **DPO** com email visível no rodapé e na Política de Privacidade.

## Consentimento explícito no onboarding

Antes do pareamento WhatsApp, checkbox **não pré-marcado**:

> "Eu autorizo o Cofre a ler as mensagens do grupo do WhatsApp que eu
> selecionar, exclusivamente para fins de classificação financeira
> automatizada. Eu entendo que mensagens brutas são mantidas por até 90
> dias e descartadas após esse período, conforme a Política de Privacidade."

Registrar no audit log o consentimento (timestamp, IP, user-agent, versão do
termo).

## Não usar dados para treinar modelos de terceiros

Em todos os providers:
- **Anthropic API**: dados de input/output não são usados para treino (default).
- **OpenAI API**: idem (default desde 2023). Confirmar opt-out em billing.
- **Google Gemini API**: marcar opt-out de "use my data to improve" no console.

Documentar isso na Política de Privacidade nominalmente — clientes ranqueiam
isso como decisivo (mostrar nos materiais de marketing).

## 2FA obrigatório

- `admin_users`: TOTP via authenticator app. Sem 2FA = sem login. Período de
  graça de 7 dias após convite, depois bloqueio.
- Família com `bank_connections` ativa: 2FA obrigatório no titular para
  qualquer ação destrutiva (deletar conta, mudar provider de IA, exportar).

## Audit log

`audit_logs` registra (entre outros):
- Logins e logouts (User e Admin)
- Alteração de assinatura / status de cobrança
- Mudança de provider de IA
- Pareamento e despareamento de WhatsApp
- Edição em massa de transações
- Solicitações de export e deletion
- Toda alteração em `platform_config`

Admin tem visão filtrável. Cliente tem visão dos próprios eventos em "Atividade
da conta".

## Plano de incidente

1. Detecção (Sentry alert ou denúncia).
2. Contenção (revogar chave, desabilitar endpoint, isolar worker).
3. Comunicação interna (1h) e ao titular afetado (≤72h, conforme LGPD art. 48).
4. ANPD se incidente for relevante.
5. Post-mortem público em `/status` se tiver impacto a clientes.

## Lista de verificação antes de lançar publicamente (Fase 2)

- [ ] Política de Privacidade publicada e linkada no footer
- [ ] Termo de Uso idem
- [ ] Termo de consentimento WhatsApp no onboarding (registrado em audit log)
- [ ] Endpoints `/me/export` e `/me/delete` funcionando E2E
- [ ] DPO designado com contato visível
- [ ] Encrypted-at-rest confirmado no provedor de DB
- [ ] Cron de retenção de 90 dias rodando em staging
- [ ] 2FA obrigatório para admins
- [ ] Sentry com redaction de PII
- [ ] Página `/status` para comunicação de incidentes
