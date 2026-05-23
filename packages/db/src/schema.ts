/**
 * Schema Drizzle — Postgres (compatível com PGlite local + Postgres na nuvem).
 *
 * Convenções:
 *  - Toda tabela escopada à família tem coluna `familyId` (FK ON DELETE CASCADE).
 *  - Valores monetários em CENTAVOS (BIGINT) — nunca floats.
 *  - IDs: TEXT (Better Auth requer text). Geração via `nanoid` (sem dependência
 *    de pgcrypto) — preenchido na camada de aplicação.
 *  - `createdAt`/`updatedAt` em toda tabela.
 *  - Soft delete via `deletedAt` apenas onde o histórico importa (transactions,
 *    goals). Resto é hard delete.
 *  - Better Auth integrado direto neste schema: `users`, `sessions`, `accounts`,
 *    `verifications` são tabelas que ele gerencia.
 */
import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  bigint,
  boolean,
  integer,
  smallint,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
  numeric,
} from "drizzle-orm/pg-core";

// --- Enums -------------------------------------------------------------------

export const subscriptionStatus = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "blocked",
  /** Plano gratuito vitalício — admin atribui manualmente. Sem trial, sem cobrança, sem bloqueio. */
  "free",
]);

export const aiProvider = pgEnum("ai_provider", ["claude", "openai", "gemini", "auto"]);

export const transactionType = pgEnum("transaction_type", ["expense", "income"]);

export const transactionStatus = pgEnum("transaction_status", [
  "pending_review",
  "confirmed",
  "disputed",
  "deleted",
]);

export const transactionOrigin = pgEnum("transaction_origin", [
  "whatsapp",
  "bank",
  "manual",
  "planned",
]);

export const recurrence = pgEnum("recurrence", ["once", "monthly", "annual"]);

export const plannedStatus = pgEnum("planned_status", ["to_pay", "paid", "overdue", "skipped"]);

export const whatsappSessionStatus = pgEnum("whatsapp_session_status", [
  "unpaired",
  "qr_pending",
  "connected",
  "reconnecting",
  "disconnected",
  "banned",
]);

export const userRole = pgEnum("user_role", ["customer", "admin", "operator", "support"]);

export const auditAction = pgEnum("audit_action", [
  "login",
  "logout",
  "subscription_changed",
  "subscription_blocked",
  "ai_provider_changed",
  "wa_session_paired",
  "wa_session_unpaired",
  "transaction_edited",
  "transaction_bulk_recategorized",
  "data_export_requested",
  "data_deletion_requested",
  "config_changed",
]);

// --- Famílias ----------------------------------------------------------------

export const families = pgTable("families", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /**
   * Provedor de IA usado pra classificar transações desta família.
   * Definido pelo admin. Cliente NÃO vê esse campo a menos que byokEnabled=true.
   */
  aiProvider: aiProvider("ai_provider").notNull().default("claude"),

  /** Admin permitiu que o cliente use a própria chave de API? Default: não. */
  byokEnabled: boolean("byok_enabled").notNull().default(false),
  /** Provedor que o cliente escolheu pra usar com a chave dele. */
  byokProvider: aiProvider("byok_provider"),
  /** Chave de API do cliente, AES-256-GCM at-rest. */
  byokApiKeyEnc: text("byok_api_key_enc"),

  notifyOnCapture: boolean("notify_on_capture").notNull().default(false),
  timezone: text("timezone").notNull().default("America/Sao_Paulo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- Users (Better Auth + domínio juntos) -----------------------------------

/**
 * Tabela de usuário compartilhada entre Better Auth (autenticação) e domínio.
 *
 *  - `role = 'admin' | 'operator' | 'support'`: usuário do painel admin
 *    (`/admin`). `familyId` fica NULL.
 *  - `role = 'customer'`: membro de uma família. `familyId` apontando para
 *    a família.
 *
 * Campos `email`, `emailVerified`, `name`, `image`, `createdAt`, `updatedAt`
 * seguem a convenção do Better Auth. Demais campos são domínio.
 */
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),

    role: userRole("role").notNull().default("customer"),
    familyId: text("family_id").references(() => families.id, { onDelete: "cascade" }),
    phone: varchar("phone", { length: 32 }),
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailUnique: uniqueIndex("users_email_unique").on(t.email),
    familyIdx: index("users_family_idx").on(t.familyId),
    roleIdx: index("users_role_idx").on(t.role),
  }),
);

// --- Better Auth: sessions, accounts, verifications -------------------------

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => ({
    tokenIdx: uniqueIndex("sessions_token_unique").on(t.token),
    userIdx: index("sessions_user_idx").on(t.userId),
  }),
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("accounts_user_idx").on(t.userId),
    providerAccountIdx: uniqueIndex("accounts_provider_account_unique").on(
      t.providerId,
      t.accountId,
    ),
  }),
);

export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    identifierIdx: index("verifications_identifier_idx").on(t.identifier),
  }),
);

// --- Assinatura --------------------------------------------------------------

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    status: subscriptionStatus("status").notNull().default("trialing"),
    plan: text("plan").notNull().default("family-monthly"),
    pagarmeSubscriptionId: text("pagarme_subscription_id"),
    pagarmeCustomerId: text("pagarme_customer_id"),
    nextBillingAt: timestamp("next_billing_at", { withTimezone: true }),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    pastDueSince: timestamp("past_due_since", { withTimezone: true }),
    blockedAt: timestamp("blocked_at", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    familyIdx: uniqueIndex("subscriptions_family_unique").on(t.familyId),
    pmIdx: index("subscriptions_pagarme_idx").on(t.pagarmeSubscriptionId),
    statusIdx: index("subscriptions_status_idx").on(t.status),
  }),
);

// --- WhatsApp ---------------------------------------------------------------

export const whatsappSessions = pgTable(
  "whatsapp_sessions",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    workerInstance: text("worker_instance"),
    status: whatsappSessionStatus("status").notNull().default("unpaired"),
    pairedPhone: varchar("paired_phone", { length: 32 }),
    monitoredGroupId: text("monitored_group_id"),
    monitoredGroupName: text("monitored_group_name"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    sessionStorageKey: text("session_storage_key"),
    qrPayload: text("qr_payload"),
    qrExpiresAt: timestamp("qr_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    familyUnique: uniqueIndex("wa_sessions_family_unique").on(t.familyId),
  }),
);

export const whatsappMembers = pgTable(
  "whatsapp_members",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    phone: varchar("phone", { length: 32 }).notNull(),
    displayName: text("display_name"),
    pushName: text("push_name"),
    avatarUrl: text("avatar_url"),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    familyPhoneUnique: uniqueIndex("wa_members_family_phone_unique").on(t.familyId, t.phone),
  }),
);

// --- Categorias --------------------------------------------------------------

export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    parentId: text("parent_id"),
    allowedType: text("allowed_type").notNull().default("expense"),
    icon: varchar("icon", { length: 64 }).notNull().default("tag"),
    color: varchar("color", { length: 16 }).notNull().default("primary"),
    isSystem: boolean("is_system").notNull().default(false),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    sortOrder: smallint("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    familyIdx: index("categories_family_idx").on(t.familyId),
    nameUnique: uniqueIndex("categories_family_name_unique").on(t.familyId, t.name),
  }),
);

export const categoryRules = pgTable(
  "category_rules",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    pattern: text("pattern").notNull(),
    isRegex: boolean("is_regex").notNull().default(false),
    priority: smallint("priority").notNull().default(100),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    familyIdx: index("category_rules_family_idx").on(t.familyId),
  }),
);

// --- Transações --------------------------------------------------------------

export const transactions = pgTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),

    type: transactionType("type").notNull(),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("BRL"),

    description: text("description").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),

    origin: transactionOrigin("origin").notNull(),
    status: transactionStatus("status").notNull().default("confirmed"),

    whatsappMemberId: text("whatsapp_member_id").references(() => whatsappMembers.id, {
      onDelete: "set null",
    }),
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    aiProviderUsed: aiProvider("ai_provider_used"),
    aiConfidence: numeric("ai_confidence", { precision: 4, scale: 3 }),
    aiCategorySuggestion: text("ai_category_suggestion"),

    bankConnectionId: text("bank_connection_id"),
    bankTransactionExternalId: text("bank_transaction_external_id"),

    whatsappMessageId: text("whatsapp_message_id"),
    plannedExpenseId: text("planned_expense_id"),

    attachmentUrls: jsonb("attachment_urls").$type<string[]>(),

    dedupHash: text("dedup_hash"),
    mergedFromTransactionId: text("merged_from_transaction_id"),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    familyOccurredIdx: index("transactions_family_occurred_idx").on(t.familyId, t.occurredAt),
    familyCategoryIdx: index("transactions_family_category_idx").on(t.familyId, t.categoryId),
    familyStatusIdx: index("transactions_family_status_idx").on(t.familyId, t.status),
    dedupIdx: index("transactions_dedup_idx").on(t.familyId, t.dedupHash),
    waMsgIdx: uniqueIndex("transactions_wa_msg_unique")
      .on(t.familyId, t.whatsappMessageId)
      .where(sql`${t.whatsappMessageId} is not null`),
    bankExtIdx: uniqueIndex("transactions_bank_ext_unique")
      .on(t.familyId, t.bankConnectionId, t.bankTransactionExternalId)
      .where(sql`${t.bankTransactionExternalId} is not null`),
  }),
);

export const whatsappMessages = pgTable(
  "whatsapp_messages",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    waMessageId: text("wa_message_id").notNull(),
    waChatId: text("wa_chat_id").notNull(),
    senderPhone: varchar("sender_phone", { length: 32 }).notNull(),
    senderMemberId: text("sender_member_id").references(() => whatsappMembers.id, {
      onDelete: "set null",
    }),
    body: text("body"),
    mediaType: varchar("media_type", { length: 32 }),
    mediaStorageKey: text("media_storage_key"),
    transcript: text("transcript"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    discardedReason: text("discarded_reason"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    waUnique: uniqueIndex("wa_messages_wa_unique").on(t.familyId, t.waMessageId),
    familyReceivedIdx: index("wa_messages_family_received_idx").on(t.familyId, t.receivedAt),
    expiresIdx: index("wa_messages_expires_idx").on(t.expiresAt),
  }),
);

// --- Previsibilidade --------------------------------------------------------

export const plannedExpenses = pgTable(
  "planned_expenses",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    type: transactionType("type").notNull().default("expense"),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    dueDay: smallint("due_day").notNull(),
    periodMonth: timestamp("period_month", { withTimezone: true }).notNull(),
    recurrence: recurrence("recurrence").notNull().default("monthly"),
    status: plannedStatus("status").notNull().default("to_pay"),
    paidTransactionId: text("paid_transaction_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    familyPeriodIdx: index("planned_family_period_idx").on(t.familyId, t.periodMonth),
  }),
);

// --- Metas -------------------------------------------------------------------

export const goals = pgTable(
  "goals",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    targetCents: bigint("target_cents", { mode: "number" }).notNull(),
    savedCents: bigint("saved_cents", { mode: "number" }).notNull().default(0),
    deadline: timestamp("deadline", { withTimezone: true }),
    iconUrl: text("icon_url"),
    notes: text("notes"),
    externalLinks: jsonb("external_links").$type<Array<{ label: string; url: string }>>(),
    autoContribPct: smallint("auto_contrib_pct"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ familyIdx: index("goals_family_idx").on(t.familyId) }),
);

// --- Receitas futuras --------------------------------------------------------

export const futureIncomes = pgTable(
  "future_incomes",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    totalCents: bigint("total_cents", { mode: "number" }).notNull(),
    expectedAt: timestamp("expected_at", { withTimezone: true }),
    kind: varchar("kind", { length: 32 }).notNull(),
    notes: text("notes"),
    receivedTransactionId: text("received_transaction_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ familyIdx: index("future_incomes_family_idx").on(t.familyId) }),
);

export const futureIncomeInstallments = pgTable(
  "future_income_installments",
  {
    id: text("id").primaryKey(),
    futureIncomeId: text("future_income_id")
      .notNull()
      .references(() => futureIncomes.id, { onDelete: "cascade" }),
    sequence: smallint("sequence").notNull(),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    expectedAt: timestamp("expected_at", { withTimezone: true }).notNull(),
    receivedTransactionId: text("received_transaction_id"),
  },
  (t) => ({
    uniq: uniqueIndex("future_income_inst_unique").on(t.futureIncomeId, t.sequence),
  }),
);

// --- Open Finance ------------------------------------------------------------

export const bankConnections = pgTable(
  "bank_connections",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    pluggyItemId: text("pluggy_item_id").notNull(),
    institutionName: text("institution_name").notNull(),
    institutionLogoUrl: text("institution_logo_url"),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pluggyUnique: uniqueIndex("bank_conn_pluggy_unique").on(t.pluggyItemId),
    familyIdx: index("bank_conn_family_idx").on(t.familyId),
  }),
);

export const bankAccounts = pgTable(
  "bank_accounts",
  {
    id: text("id").primaryKey(),
    bankConnectionId: text("bank_connection_id")
      .notNull()
      .references(() => bankConnections.id, { onDelete: "cascade" }),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    pluggyAccountId: text("pluggy_account_id").notNull(),
    nickname: text("nickname"),
    type: varchar("type", { length: 32 }).notNull(),
    balanceCents: bigint("balance_cents", { mode: "number" }),
    creditLimitCents: bigint("credit_limit_cents", { mode: "number" }),
    currency: varchar("currency", { length: 3 }).notNull().default("BRL"),
    lastFour: varchar("last_four", { length: 8 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pluggyUnique: uniqueIndex("bank_acc_pluggy_unique").on(t.pluggyAccountId),
    familyIdx: index("bank_acc_family_idx").on(t.familyId),
  }),
);

// --- PlatformConfig (singleton) ---------------------------------------------

export const platformConfig = pgTable("platform_config", {
  key: text("key").primaryKey().default("singleton"),
  pagarmeApiKeyEnc: text("pagarme_api_key_enc"),
  pagarmePublicKey: text("pagarme_public_key"),
  pagarmeWebhookSecretEnc: text("pagarme_webhook_secret_enc"),
  anthropicApiKeyEnc: text("anthropic_api_key_enc"),
  openaiApiKeyEnc: text("openai_api_key_enc"),
  googleApiKeyEnc: text("google_api_key_enc"),
  pluggyClientIdEnc: text("pluggy_client_id_enc"),
  pluggyClientSecretEnc: text("pluggy_client_secret_enc"),
  payoutBankInfo: jsonb("payout_bank_info"),
  defaultMonthlyPriceCents: integer("default_monthly_price_cents").notNull().default(2990),
  defaultAnnualPriceCents: integer("default_annual_price_cents").notNull().default(28700),
  trialDays: smallint("trial_days").notNull().default(14),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedByUserId: text("updated_by_user_id").references(() => users.id),
});

// --- Investimentos: B3 (renda variável + fixa) -----------------------------

export const assetClass = pgEnum("asset_class", [
  "stock",
  "fii",
  "etf",
  "fixed_income",
  "fund",
  "other",
]);

export const brokerage = pgEnum("brokerage", [
  "xp",
  "rico",
  "clear",
  "btg",
  "nuinvest",
  "inter",
  "itau",
  "bradesco",
  "warren",
  "modal",
  "self_custody",
  "other",
]);

export const holdings = pgTable(
  "holdings",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    assetClass: assetClass("asset_class").notNull(),
    ticker: varchar("ticker", { length: 16 }).notNull(),
    name: text("name").notNull(),
    brokerage: brokerage("brokerage").notNull().default("other"),
    quantity: numeric("quantity", { precision: 20, scale: 8 }).notNull(),
    avgCostCents: bigint("avg_cost_cents", { mode: "number" }).notNull(),
    currentPriceCents: bigint("current_price_cents", { mode: "number" }),
    currency: varchar("currency", { length: 3 }).notNull().default("BRL"),
    pluggyAccountId: text("pluggy_account_id"),
    pluggyAssetId: text("pluggy_asset_id"),
    notes: text("notes"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    familyIdx: index("holdings_family_idx").on(t.familyId),
  }),
);

export const dividendKind = pgEnum("dividend_kind", [
  "dividend",
  "jcp",
  "rent",
  "amortization",
  "other",
]);

export const dividendStatus = pgEnum("dividend_status", [
  "pending",
  "received",
  "canceled",
]);

export const dividends = pgTable(
  "dividends",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    holdingId: text("holding_id").references(() => holdings.id, { onDelete: "set null" }),
    ticker: varchar("ticker", { length: 16 }).notNull(),
    kind: dividendKind("kind").notNull().default("dividend"),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    declaredAt: timestamp("declared_at", { withTimezone: true }),
    payableAt: timestamp("payable_at", { withTimezone: true }).notNull(),
    competenceMonth: timestamp("competence_month", { withTimezone: true }).notNull(),
    status: dividendStatus("status").notNull().default("pending"),
    linkedTransactionId: text("linked_transaction_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    familyPayableIdx: index("dividends_family_payable_idx").on(t.familyId, t.payableAt),
    familyStatusIdx: index("dividends_family_status_idx").on(t.familyId, t.status),
    familyCompetenceIdx: index("dividends_family_competence_idx").on(
      t.familyId,
      t.competenceMonth,
    ),
  }),
);

// --- Criptomoedas -----------------------------------------------------------

export const cryptoVenue = pgEnum("crypto_venue", [
  "binance",
  "mercadobitcoin",
  "coinbase",
  "foxbit",
  "kraken",
  "bitso",
  "novadax",
  "self_custody",
  "other",
]);

export const cryptoHoldings = pgTable(
  "crypto_holdings",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    symbol: varchar("symbol", { length: 16 }).notNull(),
    name: text("name").notNull(),
    quantity: numeric("quantity", { precision: 28, scale: 18 }).notNull(),
    avgCostCents: bigint("avg_cost_cents", { mode: "number" }).notNull(),
    currentPriceCents: bigint("current_price_cents", { mode: "number" }),
    venue: cryptoVenue("venue").notNull().default("self_custody"),
    walletAddress: text("wallet_address"),
    venueApiKeyHint: varchar("venue_api_key_hint", { length: 32 }),
    notes: text("notes"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    familyIdx: index("crypto_holdings_family_idx").on(t.familyId),
  }),
);

export const cryptoTransactionType = pgEnum("crypto_transaction_type", [
  "buy",
  "sell",
  "transfer_in",
  "transfer_out",
  "staking_reward",
  "airdrop",
  "fee",
]);

export const cryptoTransactions = pgTable(
  "crypto_transactions",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    holdingId: text("holding_id")
      .notNull()
      .references(() => cryptoHoldings.id, { onDelete: "cascade" }),
    type: cryptoTransactionType("type").notNull(),
    quantity: numeric("quantity", { precision: 28, scale: 18 }).notNull(),
    priceCents: bigint("price_cents", { mode: "number" }).notNull(),
    feeCents: bigint("fee_cents", { mode: "number" }).notNull().default(0),
    executedAt: timestamp("executed_at", { withTimezone: true }).notNull(),
    externalTxHash: text("external_tx_hash"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    familyExecutedIdx: index("crypto_tx_family_executed_idx").on(t.familyId, t.executedAt),
    holdingIdx: index("crypto_tx_holding_idx").on(t.holdingId),
  }),
);

// --- Patrimônio: bens (imóveis, veículos, etc.) ----------------------------

export const patrimonyAssetType = pgEnum("patrimony_asset_type", [
  "real_estate",
  "vehicle",
  "artwork",
  "equipment",
  "other",
]);

export const patrimonyAssets = pgTable(
  "patrimony_assets",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: patrimonyAssetType("type").notNull(),
    acquisitionDate: timestamp("acquisition_date", { withTimezone: true }).notNull(),
    acquisitionCostCents: bigint("acquisition_cost_cents", { mode: "number" }).notNull(),
    currentValueCents: bigint("current_value_cents", { mode: "number" }).notNull(),
    metadata: jsonb("metadata"),
    notes: text("notes"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    familyIdx: index("patrimony_family_idx").on(t.familyId),
  }),
);

export const valuationSource = pgEnum("valuation_source", [
  "manual",
  "market",
  "appraisal",
  "tax_table",
]);

export const patrimonyValuations = pgTable(
  "patrimony_valuations",
  {
    id: text("id").primaryKey(),
    assetId: text("asset_id")
      .notNull()
      .references(() => patrimonyAssets.id, { onDelete: "cascade" }),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    valuedAt: timestamp("valued_at", { withTimezone: true }).notNull(),
    valueCents: bigint("value_cents", { mode: "number" }).notNull(),
    source: valuationSource("source").notNull().default("manual"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    assetValuedIdx: index("valuations_asset_valued_idx").on(t.assetId, t.valuedAt),
  }),
);

export const rentalAdjustmentIndex = pgEnum("rental_adjustment_index", [
  "none",
  "igpm",
  "ipca",
  "inpc",
  "custom",
]);

export const rentalStatus = pgEnum("rental_status", ["active", "ended", "suspended"]);

export const rentals = pgTable(
  "rentals",
  {
    id: text("id").primaryKey(),
    assetId: text("asset_id")
      .notNull()
      .references(() => patrimonyAssets.id, { onDelete: "cascade" }),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    tenantName: text("tenant_name").notNull(),
    tenantContact: text("tenant_contact"),
    monthlyRentCents: bigint("monthly_rent_cents", { mode: "number" }).notNull(),
    contractStart: timestamp("contract_start", { withTimezone: true }).notNull(),
    contractEnd: timestamp("contract_end", { withTimezone: true }),
    paymentDay: smallint("payment_day").notNull().default(5),
    adjustmentIndex: rentalAdjustmentIndex("adjustment_index").notNull().default("igpm"),
    lastAdjustmentAt: timestamp("last_adjustment_at", { withTimezone: true }),
    status: rentalStatus("status").notNull().default("active"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    familyIdx: index("rentals_family_idx").on(t.familyId),
    assetIdx: index("rentals_asset_idx").on(t.assetId),
  }),
);

export const rentalPayments = pgTable(
  "rental_payments",
  {
    id: text("id").primaryKey(),
    rentalId: text("rental_id")
      .notNull()
      .references(() => rentals.id, { onDelete: "cascade" }),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    periodMonth: timestamp("period_month", { withTimezone: true }).notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    expectedAmountCents: bigint("expected_amount_cents", { mode: "number" }).notNull(),
    paidAmountCents: bigint("paid_amount_cents", { mode: "number" }),
    linkedTransactionId: text("linked_transaction_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    rentalPeriodUnique: uniqueIndex("rental_payments_rental_period_unique").on(
      t.rentalId,
      t.periodMonth,
    ),
    familyDueIdx: index("rental_payments_family_due_idx").on(t.familyId, t.dueDate),
  }),
);

// --- Anexos -----------------------------------------------------------------

export const attachmentOwner = pgEnum("attachment_owner", [
  "transaction",
  "patrimony_asset",
  "rental",
  "dividend",
  "rental_payment",
]);

export const attachments = pgTable(
  "attachments",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    ownerType: attachmentOwner("owner_type").notNull(),
    ownerId: text("owner_id").notNull(),
    fileName: text("file_name").notNull(),
    fileSize: integer("file_size").notNull(),
    mimeType: varchar("mime_type", { length: 128 }).notNull(),
    storageKey: text("storage_key").notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => ({
    ownerIdx: index("attachments_owner_idx").on(t.familyId, t.ownerType, t.ownerId),
  }),
);

// --- Imposto de Renda (sumário anual gerado) -------------------------------

export const irYearSummaries = pgTable(
  "ir_year_summaries",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    year: smallint("year").notNull(),
    payload: jsonb("payload").notNull(),
    estimatedRefundCents: bigint("estimated_refund_cents", { mode: "number" }),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    familyYearUnique: uniqueIndex("ir_summary_family_year_unique").on(t.familyId, t.year),
  }),
);

// --- Fiscal / NFSe ----------------------------------------------------------

export const nfseProvider = pgEnum("nfse_provider", [
  "sim",
  "pbh_direct",
  "focus_nfe",
  "plugnotas",
  "enotas",
]);

export const nfseInvoiceStatus = pgEnum("nfse_invoice_status", [
  "draft",
  "queued",
  "processing",
  "issued",
  "rejected",
  "canceled",
]);

export const nfseScheduleStatus = pgEnum("nfse_schedule_status", [
  "active",
  "paused",
  "ended",
]);

export const fiscalRegime = pgEnum("fiscal_regime", [
  "mei",
  "simples_nacional",
  "lucro_presumido",
  "lucro_real",
]);

export const fiscalProfiles = pgTable(
  "fiscal_profiles",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    documentType: varchar("document_type", { length: 2 }).notNull(),
    documentNumber: varchar("document_number", { length: 20 }).notNull(),
    legalName: text("legal_name").notNull(),
    tradeName: text("trade_name"),
    municipalInscription: varchar("municipal_inscription", { length: 32 }),
    stateInscription: varchar("state_inscription", { length: 32 }),
    cityCode: varchar("city_code", { length: 7 }).notNull().default("3106200"),
    cityName: varchar("city_name", { length: 64 }).notNull().default("Belo Horizonte"),
    stateCode: varchar("state_code", { length: 2 }).notNull().default("MG"),
    address: jsonb("address").notNull(),
    contactEmail: text("contact_email"),
    contactPhone: varchar("contact_phone", { length: 32 }),
    regime: fiscalRegime("regime").notNull().default("simples_nacional"),
    preferredProvider: nfseProvider("preferred_provider").notNull().default("sim"),
    providerConfigEnc: text("provider_config_enc"),
    environment: varchar("environment", { length: 16 }).notNull().default("homologacao"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    familyUnique: uniqueIndex("fiscal_profiles_family_unique").on(t.familyId),
  }),
);

export const fiscalCertificates = pgTable(
  "fiscal_certificates",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    pfxEnc: text("pfx_enc").notNull(),
    passwordEnc: text("password_enc").notNull(),
    subjectCn: text("subject_cn"),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => ({
    familyActiveIdx: index("fiscal_certs_family_active_idx").on(t.familyId, t.isActive),
  }),
);

export const nfseRecipients = pgTable(
  "nfse_recipients",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    documentType: varchar("document_type", { length: 2 }).notNull(),
    documentNumber: varchar("document_number", { length: 20 }).notNull(),
    name: text("name").notNull(),
    email: text("email"),
    municipalInscription: varchar("municipal_inscription", { length: 32 }),
    address: jsonb("address"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    familyDocIdx: uniqueIndex("nfse_recipients_family_doc_unique").on(
      t.familyId,
      t.documentNumber,
    ),
  }),
);

export const nfseInvoices = pgTable(
  "nfse_invoices",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => fiscalProfiles.id, { onDelete: "cascade" }),
    recipientId: text("recipient_id").references(() => nfseRecipients.id, {
      onDelete: "set null",
    }),
    rpsNumber: integer("rps_number").notNull(),
    rpsSerie: varchar("rps_serie", { length: 8 }).notNull().default("A"),
    nfseNumber: bigint("nfse_number", { mode: "number" }),
    verificationCode: varchar("verification_code", { length: 32 }),
    provider: nfseProvider("provider").notNull(),
    status: nfseInvoiceStatus("status").notNull().default("draft"),
    serviceValueCents: bigint("service_value_cents", { mode: "number" }).notNull(),
    serviceDescription: text("service_description").notNull(),
    serviceCode: varchar("service_code", { length: 16 }).notNull(),
    cnae: varchar("cnae", { length: 16 }),
    issRateBps: integer("iss_rate_bps").notNull().default(0),
    issValueCents: bigint("iss_value_cents", { mode: "number" }).notNull().default(0),
    issWithheld: boolean("iss_withheld").notNull().default(false),
    withholdings: jsonb("withholdings"),
    xmlEnc: text("xml_enc"),
    pdfStorageKey: text("pdf_storage_key"),
    competenceDate: timestamp("competence_date", { withTimezone: true }).notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    /**
     * Conta a receber: nota fica "a receber" assim que emitida. Quando o
     * pagamento é confirmado, `paymentReceivedAt` é gravado e uma transaction
     * de receita é criada no `linkedTransactionId`.
     */
    paymentReceivedAt: timestamp("payment_received_at", { withTimezone: true }),
    paymentReceivedAmountCents: bigint("payment_received_amount_cents", { mode: "number" }),
    scheduleId: text("schedule_id"),
    linkedTransactionId: text("linked_transaction_id"),
    errorMessage: text("error_message"),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    familyStatusIdx: index("nfse_invoices_family_status_idx").on(t.familyId, t.status),
    familyIssuedIdx: index("nfse_invoices_family_issued_idx").on(t.familyId, t.issuedAt),
    familyRpsUnique: uniqueIndex("nfse_invoices_family_rps_unique").on(
      t.familyId,
      t.rpsSerie,
      t.rpsNumber,
    ),
    nfseNumberIdx: index("nfse_invoices_number_idx").on(t.familyId, t.nfseNumber),
  }),
);

export const nfseSchedules = pgTable(
  "nfse_schedules",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => fiscalProfiles.id, { onDelete: "cascade" }),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => nfseRecipients.id, { onDelete: "restrict" }),
    label: text("label").notNull(),
    dayOfMonth: smallint("day_of_month").notNull(),
    serviceValueCents: bigint("service_value_cents", { mode: "number" }).notNull(),
    serviceDescription: text("service_description").notNull(),
    serviceCode: varchar("service_code", { length: 16 }).notNull(),
    issRateBps: integer("iss_rate_bps").notNull().default(0),
    issWithheld: boolean("iss_withheld").notNull().default(false),
    status: nfseScheduleStatus("status").notNull().default("active"),
    nextRunAt: timestamp("next_run_at", { withTimezone: true }),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    invoicesIssued: integer("invoices_issued").notNull().default(0),
    emailRecipients: jsonb("email_recipients")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    familyStatusIdx: index("nfse_schedules_family_status_idx").on(t.familyId, t.status),
    nextRunIdx: index("nfse_schedules_next_run_idx").on(t.nextRunAt),
  }),
);

export const nfseEvents = pgTable(
  "nfse_events",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    invoiceId: text("invoice_id").references(() => nfseInvoices.id, { onDelete: "cascade" }),
    scheduleId: text("schedule_id").references(() => nfseSchedules.id, {
      onDelete: "set null",
    }),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    provider: nfseProvider("provider"),
    payload: jsonb("payload"),
    success: boolean("success").notNull().default(true),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    invoiceIdx: index("nfse_events_invoice_idx").on(t.invoiceId, t.createdAt),
  }),
);

// --- Uso de IA (custo estimado por classificação) --------------------------

/**
 * Cada chamada do AIClassifier registra uma linha aqui — usada pelo admin
 * pra estimar quanto está custando cada família em IA num mês, e decidir o
 * preço da assinatura. Cost em centavos de BRL (convertido na hora de inserir).
 */
export const aiUsageEvents = pgTable(
  "ai_usage_events",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    provider: aiProvider("provider").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    /** Custo total estimado em centavos de BRL no momento da chamada. */
    costCents: integer("cost_cents").notNull().default(0),
    /**
     * `true` quando a chamada usou a chave do PRÓPRIO cliente (BYOK).
     * Pra fins do relatório do admin, isto NÃO conta como custo da Saf.
     */
    paidByCustomer: boolean("paid_by_customer").notNull().default(false),
    /** Transação resultante (null se a mensagem não virou transação). */
    transactionId: text("transaction_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    familyMonthIdx: index("ai_usage_family_month_idx").on(t.familyId, t.createdAt),
    providerIdx: index("ai_usage_provider_idx").on(t.provider, t.createdAt),
  }),
);

// --- Idempotência de webhooks ----------------------------------------------

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: text("id").primaryKey(),
    /** "pagarme" | "pluggy" | ... */
    provider: varchar("provider", { length: 32 }).notNull(),
    /** Event ID externo (fornecido pelo provedor) */
    externalEventId: text("external_event_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    error: text("error"),
  },
  (t) => ({
    providerEventUnique: uniqueIndex("webhook_events_provider_event_unique").on(
      t.provider,
      t.externalEventId,
    ),
  }),
);

// --- LGPD: solicitações de exclusão -----------------------------------------

export const dataDeletionRequests = pgTable(
  "data_deletion_requests",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    familyId: text("family_id").references(() => families.id, { onDelete: "cascade" }),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    /** Após esta data, o cron faz hard delete. */
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => ({
    userIdx: index("data_deletion_user_idx").on(t.userId),
    scheduledIdx: index("data_deletion_scheduled_idx").on(t.scheduledFor),
  }),
);

// --- Audit log --------------------------------------------------------------

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id").references(() => families.id, { onDelete: "set null" }),
    actorUserId: text("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: auditAction("action").notNull(),
    targetType: varchar("target_type", { length: 64 }),
    targetId: text("target_id"),
    metadata: jsonb("metadata"),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    familyCreatedIdx: index("audit_family_created_idx").on(t.familyId, t.createdAt),
  }),
);

// --- Relations ---------------------------------------------------------------

export const familiesRelations = relations(families, ({ many, one }) => ({
  users: many(users),
  subscription: one(subscriptions),
  whatsappSession: one(whatsappSessions),
  whatsappMembers: many(whatsappMembers),
  categories: many(categories),
  transactions: many(transactions),
  plannedExpenses: many(plannedExpenses),
  goals: many(goals),
  futureIncomes: many(futureIncomes),
  bankConnections: many(bankConnections),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  family: one(families, { fields: [users.familyId], references: [families.id] }),
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  family: one(families, { fields: [subscriptions.familyId], references: [families.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  family: one(families, { fields: [transactions.familyId], references: [families.id] }),
  category: one(categories, { fields: [transactions.categoryId], references: [categories.id] }),
  member: one(whatsappMembers, {
    fields: [transactions.whatsappMemberId],
    references: [whatsappMembers.id],
  }),
  createdBy: one(users, { fields: [transactions.createdByUserId], references: [users.id] }),
  bankConnection: one(bankConnections, {
    fields: [transactions.bankConnectionId],
    references: [bankConnections.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  family: one(families, { fields: [categories.familyId], references: [families.id] }),
  transactions: many(transactions),
  rules: many(categoryRules),
}));

export const bankConnectionsRelations = relations(bankConnections, ({ one, many }) => ({
  family: one(families, { fields: [bankConnections.familyId], references: [families.id] }),
  accounts: many(bankAccounts),
}));

export const bankAccountsRelations = relations(bankAccounts, ({ one }) => ({
  connection: one(bankConnections, {
    fields: [bankAccounts.bankConnectionId],
    references: [bankConnections.id],
  }),
}));

// --- Types convenience ------------------------------------------------------

export type Family = typeof families.$inferSelect;
export type NewFamily = typeof families.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Verification = typeof verifications.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type PlannedExpense = typeof plannedExpenses.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type FutureIncome = typeof futureIncomes.$inferSelect;
export type BankConnection = typeof bankConnections.$inferSelect;
export type BankAccount = typeof bankAccounts.$inferSelect;
export type WhatsappSession = typeof whatsappSessions.$inferSelect;
export type WhatsappMember = typeof whatsappMembers.$inferSelect;
export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type PlatformConfig = typeof platformConfig.$inferSelect;
export type AiUsageEvent = typeof aiUsageEvents.$inferSelect;
export type NewAiUsageEvent = typeof aiUsageEvents.$inferInsert;
export type Holding = typeof holdings.$inferSelect;
export type Dividend = typeof dividends.$inferSelect;
export type CryptoHolding = typeof cryptoHoldings.$inferSelect;
export type CryptoTransaction = typeof cryptoTransactions.$inferSelect;
export type PatrimonyAsset = typeof patrimonyAssets.$inferSelect;
export type PatrimonyValuation = typeof patrimonyValuations.$inferSelect;
export type Rental = typeof rentals.$inferSelect;
export type RentalPayment = typeof rentalPayments.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;
export type IrYearSummary = typeof irYearSummaries.$inferSelect;
export type FiscalProfile = typeof fiscalProfiles.$inferSelect;
export type FiscalCertificate = typeof fiscalCertificates.$inferSelect;
export type NfseRecipient = typeof nfseRecipients.$inferSelect;
export type NfseInvoice = typeof nfseInvoices.$inferSelect;
export type NfseSchedule = typeof nfseSchedules.$inferSelect;
export type NfseEvent = typeof nfseEvents.$inferSelect;
