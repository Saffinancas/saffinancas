/**
 * Registry centralizado de todas as variáveis de plataforma.
 *
 * Cada entrada descreve uma "config" — pode estar:
 *  - em `platform_settings` (key-value no banco, editável via UI)
 *  - em `process.env` (precisa estar antes do DB iniciar — infra-only)
 *
 * `getPlatformSetting(key)` já faz fallback automaticamente pro env equivalente
 * (UPPER + underscore), então pra TODAS as managed o usuário pode escolher:
 *  - deixar a env var na Vercel (continua funcionando), ou
 *  - apagar a env e definir o valor via /admin/config (override em runtime).
 */

export type SettingCategory =
  | "infra"
  | "auth"
  | "ai"
  | "email"
  | "payments"
  | "open-finance"
  | "whatsapp"
  | "storage"
  | "observability";

export type SettingDef = {
  /** Chave no platform_settings (formato dot.case). */
  key: string;
  /** Nome legível pra UI. */
  label: string;
  /** Categoria pra agrupar visualmente. */
  category: SettingCategory;
  /** Descrição curta do que faz. */
  description: string;
  /** Se true, valor armazenado criptografado e mascarado na UI. */
  sensitive: boolean;
  /** Se true, NÃO pode ser editado via UI (read-only — só Vercel/.env). */
  readonly: boolean;
  /** Env var equivalente (pra fallback / read-only display). */
  envVar: string;
  /** Placeholder ou exemplo pra UI. */
  placeholder?: string;
};

export const SETTINGS_REGISTRY: SettingDef[] = [
  // --- Infraestrutura (env-only) ---
  {
    key: "infra.database_url",
    envVar: "DATABASE_URL",
    label: "DATABASE_URL",
    category: "infra",
    description: "Connection string Postgres. Precisa ser env var (DB inicia antes do platform_settings).",
    sensitive: true,
    readonly: true,
  },
  {
    key: "infra.platform_encryption_key",
    envVar: "PLATFORM_ENCRYPTION_KEY",
    label: "PLATFORM_ENCRYPTION_KEY",
    category: "infra",
    description: "Chave-mestra que cifra os outros valores. Só env var (não pode se autorreferenciar).",
    sensitive: true,
    readonly: true,
  },
  {
    key: "infra.cron_secret",
    envVar: "CRON_SECRET",
    label: "CRON_SECRET",
    category: "infra",
    description: "Secret usado pelo Vercel Cron pra autenticar jobs.",
    sensitive: true,
    readonly: true,
  },
  {
    key: "infra.redis_url",
    envVar: "REDIS_URL",
    label: "REDIS_URL",
    category: "infra",
    description: "Fila BullMQ (worker WhatsApp).",
    sensitive: true,
    readonly: false,
    placeholder: "redis://default:...@host:6379",
  },

  // --- Auth ---
  {
    key: "auth.better_auth_secret",
    envVar: "BETTER_AUTH_SECRET",
    label: "BETTER_AUTH_SECRET",
    category: "auth",
    description: "Secret usado pelo Better Auth pra assinar sessões. Env-only (lido no boot).",
    sensitive: true,
    readonly: true,
  },
  {
    key: "auth.public_app_url",
    envVar: "NEXT_PUBLIC_APP_URL",
    label: "NEXT_PUBLIC_APP_URL",
    category: "auth",
    description: "URL pública do app (usada como baseURL/trustedOrigin). Env-only (embedded no build).",
    sensitive: false,
    readonly: true,
  },

  // --- IA ---
  {
    key: "ai.anthropic_api_key",
    envVar: "ANTHROPIC_API_KEY",
    label: "Anthropic (Claude)",
    category: "ai",
    description: "API key da Anthropic. Usada pelo agente WhatsApp e classificação.",
    sensitive: true,
    readonly: false,
    placeholder: "sk-ant-...",
  },
  {
    key: "ai.openai_api_key",
    envVar: "OPENAI_API_KEY",
    label: "OpenAI (GPT)",
    category: "ai",
    description: "API key da OpenAI (opcional).",
    sensitive: true,
    readonly: false,
    placeholder: "sk-...",
  },
  {
    key: "ai.google_api_key",
    envVar: "GOOGLE_GENERATIVE_AI_API_KEY",
    label: "Google (Gemini)",
    category: "ai",
    description: "API key Google Generative AI (opcional).",
    sensitive: true,
    readonly: false,
  },

  // --- Email ---
  {
    key: "email.resend_api_key",
    envVar: "RESEND_API_KEY",
    label: "Resend API key",
    category: "email",
    description: "API key Resend pra envio de email transacional (reset de senha, NFSe).",
    sensitive: true,
    readonly: false,
    placeholder: "re_...",
  },
  {
    key: "email.from",
    envVar: "EMAIL_FROM",
    label: "Remetente padrão",
    category: "email",
    description: 'Endereço "From" dos emails. Ex.: "Saf Finanças <no-reply@saffinancas.com.br>".',
    sensitive: false,
    readonly: false,
    placeholder: "Saf Finanças <no-reply@saffinancas.com.br>",
  },

  // --- Pagamentos ---
  {
    key: "pagarme.api_key",
    envVar: "PAGARME_API_KEY",
    label: "Pagar.me API key",
    category: "payments",
    description: "Chave secreta server-side da Pagar.me.",
    sensitive: true,
    readonly: false,
    placeholder: "sk_...",
  },
  {
    key: "pagarme.public_key",
    envVar: "PAGARME_PUBLIC_KEY",
    label: "Pagar.me public key",
    category: "payments",
    description: "Chave pública (frontend).",
    sensitive: false,
    readonly: false,
    placeholder: "pk_...",
  },
  {
    key: "pagarme.webhook_secret",
    envVar: "PAGARME_WEBHOOK_SECRET",
    label: "Pagar.me webhook secret",
    category: "payments",
    description: "Validação HMAC dos webhooks de cobrança.",
    sensitive: true,
    readonly: false,
  },

  // --- Open Finance (Pluggy) ---
  {
    key: "pluggy.client_id",
    envVar: "PLUGGY_CLIENT_ID",
    label: "Pluggy Client ID",
    category: "open-finance",
    description: "Client ID da conta Pluggy.",
    sensitive: true,
    readonly: false,
  },
  {
    key: "pluggy.client_secret",
    envVar: "PLUGGY_CLIENT_SECRET",
    label: "Pluggy Client Secret",
    category: "open-finance",
    description: "Client Secret da conta Pluggy.",
    sensitive: true,
    readonly: false,
  },
  {
    key: "pluggy.webhook_secret",
    envVar: "PLUGGY_WEBHOOK_SECRET",
    label: "Pluggy Webhook Secret",
    category: "open-finance",
    description: "Secret HMAC pros webhooks Pluggy. O mesmo valor é registrado no painel Pluggy.",
    sensitive: true,
    readonly: false,
  },

  // --- WhatsApp (a maioria já tem UI dedicada em /admin/integracoes/whatsapp) ---
  {
    key: "whatsapp.worker.url",
    envVar: "WHATSAPP_WORKER_URL",
    label: "Worker URL",
    category: "whatsapp",
    description: "URL do worker do whatsapp-web.js (se rodar em servidor separado).",
    sensitive: false,
    readonly: false,
    placeholder: "https://wa-worker.exemplo.com",
  },
  {
    key: "whatsapp.worker.secret",
    envVar: "WHATSAPP_WORKER_SECRET",
    label: "Worker secret",
    category: "whatsapp",
    description: "Shared secret entre app e worker.",
    sensitive: true,
    readonly: false,
  },

  // --- Storage / R2 ---
  {
    key: "storage.r2_access_key_id",
    envVar: "R2_ACCESS_KEY_ID",
    label: "R2 Access Key ID",
    category: "storage",
    description: "Cloudflare R2 — Access Key ID.",
    sensitive: true,
    readonly: false,
  },
  {
    key: "storage.r2_secret_access_key",
    envVar: "R2_SECRET_ACCESS_KEY",
    label: "R2 Secret Access Key",
    category: "storage",
    description: "Cloudflare R2 — Secret.",
    sensitive: true,
    readonly: false,
  },
  {
    key: "storage.r2_bucket",
    envVar: "R2_BUCKET",
    label: "R2 Bucket",
    category: "storage",
    description: "Nome do bucket R2 onde gravar comprovantes/anexos.",
    sensitive: false,
    readonly: false,
  },
  {
    key: "storage.r2_endpoint",
    envVar: "R2_ENDPOINT",
    label: "R2 Endpoint",
    category: "storage",
    description: "Endpoint S3-compat do R2.",
    sensitive: false,
    readonly: false,
    placeholder: "https://<account>.r2.cloudflarestorage.com",
  },

  // --- Observabilidade ---
  {
    key: "observability.sentry_dsn",
    envVar: "SENTRY_DSN",
    label: "Sentry DSN",
    category: "observability",
    description: "DSN do Sentry pra reportar erros.",
    sensitive: false,
    readonly: false,
  },
];

export const CATEGORY_LABEL: Record<SettingCategory, string> = {
  infra: "Infraestrutura",
  auth: "Autenticação",
  ai: "Provedores de IA",
  email: "E-mail",
  payments: "Pagamentos",
  "open-finance": "Open Finance (Pluggy)",
  whatsapp: "WhatsApp",
  storage: "Armazenamento",
  observability: "Observabilidade",
};

export function findSettingDef(key: string): SettingDef | undefined {
  return SETTINGS_REGISTRY.find((s) => s.key === key);
}
