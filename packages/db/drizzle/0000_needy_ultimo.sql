CREATE TYPE "public"."ai_provider" AS ENUM('claude', 'openai', 'gemini', 'auto');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('login', 'logout', 'subscription_changed', 'subscription_blocked', 'ai_provider_changed', 'wa_session_paired', 'wa_session_unpaired', 'transaction_edited', 'transaction_bulk_recategorized', 'data_export_requested', 'data_deletion_requested', 'config_changed');--> statement-breakpoint
CREATE TYPE "public"."planned_status" AS ENUM('to_pay', 'paid', 'overdue', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."recurrence" AS ENUM('once', 'monthly', 'annual');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."transaction_origin" AS ENUM('whatsapp', 'bank', 'manual', 'planned');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending_review', 'confirmed', 'disputed', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('expense', 'income');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('customer', 'admin', 'operator', 'support');--> statement-breakpoint
CREATE TYPE "public"."whatsapp_session_status" AS ENUM('unpaired', 'qr_pending', 'connected', 'reconnecting', 'disconnected', 'banned');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text,
	"actor_user_id" text,
	"action" "audit_action" NOT NULL,
	"target_type" varchar(64),
	"target_id" text,
	"metadata" jsonb,
	"ip_address" varchar(64),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bank_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"bank_connection_id" text NOT NULL,
	"family_id" text NOT NULL,
	"pluggy_account_id" text NOT NULL,
	"nickname" text,
	"type" varchar(32) NOT NULL,
	"balance_cents" bigint,
	"credit_limit_cents" bigint,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"last_four" varchar(8),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bank_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"pluggy_item_id" text NOT NULL,
	"institution_name" text NOT NULL,
	"institution_logo_url" text,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"name" text NOT NULL,
	"parent_id" text,
	"allowed_type" text DEFAULT 'expense' NOT NULL,
	"icon" varchar(64) DEFAULT 'tag' NOT NULL,
	"color" varchar(16) DEFAULT 'primary' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "category_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"category_id" text NOT NULL,
	"pattern" text NOT NULL,
	"is_regex" boolean DEFAULT false NOT NULL,
	"priority" smallint DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "families" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"ai_provider" "ai_provider" DEFAULT 'claude' NOT NULL,
	"notify_on_capture" boolean DEFAULT false NOT NULL,
	"timezone" text DEFAULT 'America/Sao_Paulo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "future_income_installments" (
	"id" text PRIMARY KEY NOT NULL,
	"future_income_id" text NOT NULL,
	"sequence" smallint NOT NULL,
	"amount_cents" bigint NOT NULL,
	"expected_at" timestamp with time zone NOT NULL,
	"received_transaction_id" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "future_incomes" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"name" text NOT NULL,
	"total_cents" bigint NOT NULL,
	"expected_at" timestamp with time zone,
	"kind" varchar(32) NOT NULL,
	"notes" text,
	"received_transaction_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "goals" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"name" text NOT NULL,
	"target_cents" bigint NOT NULL,
	"saved_cents" bigint DEFAULT 0 NOT NULL,
	"deadline" timestamp with time zone,
	"icon_url" text,
	"notes" text,
	"external_links" jsonb,
	"auto_contrib_pct" smallint,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "planned_expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"name" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"type" "transaction_type" DEFAULT 'expense' NOT NULL,
	"category_id" text,
	"due_day" smallint NOT NULL,
	"period_month" timestamp with time zone NOT NULL,
	"recurrence" "recurrence" DEFAULT 'monthly' NOT NULL,
	"status" "planned_status" DEFAULT 'to_pay' NOT NULL,
	"paid_transaction_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_config" (
	"key" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"pagarme_api_key_enc" text,
	"pagarme_public_key" text,
	"pagarme_webhook_secret_enc" text,
	"anthropic_api_key_enc" text,
	"openai_api_key_enc" text,
	"google_api_key_enc" text,
	"pluggy_client_id_enc" text,
	"pluggy_client_secret_enc" text,
	"payout_bank_info" jsonb,
	"default_monthly_price_cents" integer DEFAULT 2990 NOT NULL,
	"default_annual_price_cents" integer DEFAULT 28700 NOT NULL,
	"trial_days" smallint DEFAULT 14 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_user_id" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"status" "subscription_status" DEFAULT 'trialing' NOT NULL,
	"plan" text DEFAULT 'family-monthly' NOT NULL,
	"pagarme_subscription_id" text,
	"pagarme_customer_id" text,
	"next_billing_at" timestamp with time zone,
	"trial_ends_at" timestamp with time zone,
	"past_due_since" timestamp with time zone,
	"blocked_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount_cents" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"description" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"category_id" text,
	"origin" "transaction_origin" NOT NULL,
	"status" "transaction_status" DEFAULT 'confirmed' NOT NULL,
	"whatsapp_member_id" text,
	"created_by_user_id" text,
	"ai_provider_used" "ai_provider",
	"ai_confidence" numeric(4, 3),
	"ai_category_suggestion" text,
	"bank_connection_id" text,
	"bank_transaction_external_id" text,
	"whatsapp_message_id" text,
	"planned_expense_id" text,
	"attachment_urls" jsonb,
	"dedup_hash" text,
	"merged_from_transaction_id" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"family_id" text,
	"phone" varchar(32),
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "whatsapp_members" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"phone" varchar(32) NOT NULL,
	"display_name" text,
	"push_name" text,
	"avatar_url" text,
	"user_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "whatsapp_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"wa_message_id" text NOT NULL,
	"wa_chat_id" text NOT NULL,
	"sender_phone" varchar(32) NOT NULL,
	"sender_member_id" text,
	"body" text,
	"media_type" varchar(32),
	"media_storage_key" text,
	"transcript" text,
	"received_at" timestamp with time zone NOT NULL,
	"processed_at" timestamp with time zone,
	"discarded_reason" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "whatsapp_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"worker_instance" text,
	"status" "whatsapp_session_status" DEFAULT 'unpaired' NOT NULL,
	"paired_phone" varchar(32),
	"monitored_group_id" text,
	"monitored_group_name" text,
	"last_seen_at" timestamp with time zone,
	"session_storage_key" text,
	"qr_payload" text,
	"qr_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_bank_connection_id_bank_connections_id_fk" FOREIGN KEY ("bank_connection_id") REFERENCES "public"."bank_connections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bank_connections" ADD CONSTRAINT "bank_connections_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "categories" ADD CONSTRAINT "categories_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "category_rules" ADD CONSTRAINT "category_rules_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "category_rules" ADD CONSTRAINT "category_rules_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "future_income_installments" ADD CONSTRAINT "future_income_installments_future_income_id_future_incomes_id_fk" FOREIGN KEY ("future_income_id") REFERENCES "public"."future_incomes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "future_incomes" ADD CONSTRAINT "future_incomes_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goals" ADD CONSTRAINT "goals_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "planned_expenses" ADD CONSTRAINT "planned_expenses_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "planned_expenses" ADD CONSTRAINT "planned_expenses_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "platform_config" ADD CONSTRAINT "platform_config_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_whatsapp_member_id_whatsapp_members_id_fk" FOREIGN KEY ("whatsapp_member_id") REFERENCES "public"."whatsapp_members"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_members" ADD CONSTRAINT "whatsapp_members_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_members" ADD CONSTRAINT "whatsapp_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_sender_member_id_whatsapp_members_id_fk" FOREIGN KEY ("sender_member_id") REFERENCES "public"."whatsapp_members"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_sessions" ADD CONSTRAINT "whatsapp_sessions_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "accounts_user_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "accounts_provider_account_unique" ON "accounts" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_family_created_idx" ON "audit_logs" USING btree ("family_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bank_acc_pluggy_unique" ON "bank_accounts" USING btree ("pluggy_account_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bank_acc_family_idx" ON "bank_accounts" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bank_conn_pluggy_unique" ON "bank_connections" USING btree ("pluggy_item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bank_conn_family_idx" ON "bank_connections" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "categories_family_idx" ON "categories" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "categories_family_name_unique" ON "categories" USING btree ("family_id","name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "category_rules_family_idx" ON "category_rules" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "future_income_inst_unique" ON "future_income_installments" USING btree ("future_income_id","sequence");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "future_incomes_family_idx" ON "future_incomes" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "goals_family_idx" ON "goals" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "planned_family_period_idx" ON "planned_expenses" USING btree ("family_id","period_month");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_token_unique" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_family_unique" ON "subscriptions" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_pagarme_idx" ON "subscriptions" USING btree ("pagarme_subscription_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_family_occurred_idx" ON "transactions" USING btree ("family_id","occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_family_category_idx" ON "transactions" USING btree ("family_id","category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_family_status_idx" ON "transactions" USING btree ("family_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "transactions_dedup_idx" ON "transactions" USING btree ("family_id","dedup_hash");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "transactions_wa_msg_unique" ON "transactions" USING btree ("family_id","whatsapp_message_id") WHERE "transactions"."whatsapp_message_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "transactions_bank_ext_unique" ON "transactions" USING btree ("family_id","bank_connection_id","bank_transaction_external_id") WHERE "transactions"."bank_transaction_external_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_family_idx" ON "users" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verifications_identifier_idx" ON "verifications" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wa_members_family_phone_unique" ON "whatsapp_members" USING btree ("family_id","phone");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wa_messages_wa_unique" ON "whatsapp_messages" USING btree ("family_id","wa_message_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wa_messages_family_received_idx" ON "whatsapp_messages" USING btree ("family_id","received_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wa_messages_expires_idx" ON "whatsapp_messages" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wa_sessions_family_unique" ON "whatsapp_sessions" USING btree ("family_id");