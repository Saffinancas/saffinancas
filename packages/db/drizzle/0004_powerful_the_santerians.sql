CREATE TYPE "public"."asset_class" AS ENUM('stock', 'fii', 'etf', 'fixed_income', 'fund', 'other');--> statement-breakpoint
CREATE TYPE "public"."attachment_owner" AS ENUM('transaction', 'patrimony_asset', 'rental', 'dividend', 'rental_payment');--> statement-breakpoint
CREATE TYPE "public"."brokerage" AS ENUM('xp', 'rico', 'clear', 'btg', 'nuinvest', 'inter', 'itau', 'bradesco', 'warren', 'modal', 'self_custody', 'other');--> statement-breakpoint
CREATE TYPE "public"."crypto_transaction_type" AS ENUM('buy', 'sell', 'transfer_in', 'transfer_out', 'staking_reward', 'airdrop', 'fee');--> statement-breakpoint
CREATE TYPE "public"."crypto_venue" AS ENUM('binance', 'mercadobitcoin', 'coinbase', 'foxbit', 'kraken', 'bitso', 'novadax', 'self_custody', 'other');--> statement-breakpoint
CREATE TYPE "public"."dividend_kind" AS ENUM('dividend', 'jcp', 'rent', 'amortization', 'other');--> statement-breakpoint
CREATE TYPE "public"."dividend_status" AS ENUM('pending', 'received', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."patrimony_asset_type" AS ENUM('real_estate', 'vehicle', 'artwork', 'equipment', 'other');--> statement-breakpoint
CREATE TYPE "public"."rental_adjustment_index" AS ENUM('none', 'igpm', 'ipca', 'inpc', 'custom');--> statement-breakpoint
CREATE TYPE "public"."rental_status" AS ENUM('active', 'ended', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."valuation_source" AS ENUM('manual', 'market', 'appraisal', 'tax_table');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"owner_type" "attachment_owner" NOT NULL,
	"owner_id" text NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar(128) NOT NULL,
	"storage_key" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crypto_holdings" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"symbol" varchar(16) NOT NULL,
	"name" text NOT NULL,
	"quantity" numeric(28, 18) NOT NULL,
	"avg_cost_cents" bigint NOT NULL,
	"current_price_cents" bigint,
	"venue" "crypto_venue" DEFAULT 'self_custody' NOT NULL,
	"wallet_address" text,
	"venue_api_key_hint" varchar(32),
	"notes" text,
	"last_synced_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crypto_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"holding_id" text NOT NULL,
	"type" "crypto_transaction_type" NOT NULL,
	"quantity" numeric(28, 18) NOT NULL,
	"price_cents" bigint NOT NULL,
	"fee_cents" bigint DEFAULT 0 NOT NULL,
	"executed_at" timestamp with time zone NOT NULL,
	"external_tx_hash" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dividends" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"holding_id" text,
	"ticker" varchar(16) NOT NULL,
	"kind" "dividend_kind" DEFAULT 'dividend' NOT NULL,
	"amount_cents" bigint NOT NULL,
	"declared_at" timestamp with time zone,
	"payable_at" timestamp with time zone NOT NULL,
	"competence_month" timestamp with time zone NOT NULL,
	"status" "dividend_status" DEFAULT 'pending' NOT NULL,
	"linked_transaction_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "holdings" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"asset_class" "asset_class" NOT NULL,
	"ticker" varchar(16) NOT NULL,
	"name" text NOT NULL,
	"brokerage" "brokerage" DEFAULT 'other' NOT NULL,
	"quantity" numeric(20, 8) NOT NULL,
	"avg_cost_cents" bigint NOT NULL,
	"current_price_cents" bigint,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"pluggy_account_id" text,
	"pluggy_asset_id" text,
	"notes" text,
	"last_synced_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ir_year_summaries" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"year" smallint NOT NULL,
	"payload" jsonb NOT NULL,
	"estimated_refund_cents" bigint,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patrimony_assets" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"name" text NOT NULL,
	"type" "patrimony_asset_type" NOT NULL,
	"acquisition_date" timestamp with time zone NOT NULL,
	"acquisition_cost_cents" bigint NOT NULL,
	"current_value_cents" bigint NOT NULL,
	"metadata" jsonb,
	"notes" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patrimony_valuations" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"family_id" text NOT NULL,
	"valued_at" timestamp with time zone NOT NULL,
	"value_cents" bigint NOT NULL,
	"source" "valuation_source" DEFAULT 'manual' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rental_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"rental_id" text NOT NULL,
	"family_id" text NOT NULL,
	"period_month" timestamp with time zone NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"expected_amount_cents" bigint NOT NULL,
	"paid_amount_cents" bigint,
	"linked_transaction_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rentals" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"family_id" text NOT NULL,
	"tenant_name" text NOT NULL,
	"tenant_contact" text,
	"monthly_rent_cents" bigint NOT NULL,
	"contract_start" timestamp with time zone NOT NULL,
	"contract_end" timestamp with time zone,
	"payment_day" smallint DEFAULT 5 NOT NULL,
	"adjustment_index" "rental_adjustment_index" DEFAULT 'igpm' NOT NULL,
	"last_adjustment_at" timestamp with time zone,
	"status" "rental_status" DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attachments" ADD CONSTRAINT "attachments_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crypto_holdings" ADD CONSTRAINT "crypto_holdings_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crypto_transactions" ADD CONSTRAINT "crypto_transactions_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crypto_transactions" ADD CONSTRAINT "crypto_transactions_holding_id_crypto_holdings_id_fk" FOREIGN KEY ("holding_id") REFERENCES "public"."crypto_holdings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dividends" ADD CONSTRAINT "dividends_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dividends" ADD CONSTRAINT "dividends_holding_id_holdings_id_fk" FOREIGN KEY ("holding_id") REFERENCES "public"."holdings"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "holdings" ADD CONSTRAINT "holdings_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ir_year_summaries" ADD CONSTRAINT "ir_year_summaries_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patrimony_assets" ADD CONSTRAINT "patrimony_assets_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patrimony_valuations" ADD CONSTRAINT "patrimony_valuations_asset_id_patrimony_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."patrimony_assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patrimony_valuations" ADD CONSTRAINT "patrimony_valuations_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rental_payments" ADD CONSTRAINT "rental_payments_rental_id_rentals_id_fk" FOREIGN KEY ("rental_id") REFERENCES "public"."rentals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rental_payments" ADD CONSTRAINT "rental_payments_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rentals" ADD CONSTRAINT "rentals_asset_id_patrimony_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."patrimony_assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rentals" ADD CONSTRAINT "rentals_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attachments_owner_idx" ON "attachments" USING btree ("family_id","owner_type","owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crypto_holdings_family_idx" ON "crypto_holdings" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crypto_tx_family_executed_idx" ON "crypto_transactions" USING btree ("family_id","executed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crypto_tx_holding_idx" ON "crypto_transactions" USING btree ("holding_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dividends_family_payable_idx" ON "dividends" USING btree ("family_id","payable_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dividends_family_status_idx" ON "dividends" USING btree ("family_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dividends_family_competence_idx" ON "dividends" USING btree ("family_id","competence_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "holdings_family_idx" ON "holdings" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ir_summary_family_year_unique" ON "ir_year_summaries" USING btree ("family_id","year");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patrimony_family_idx" ON "patrimony_assets" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "valuations_asset_valued_idx" ON "patrimony_valuations" USING btree ("asset_id","valued_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "rental_payments_rental_period_unique" ON "rental_payments" USING btree ("rental_id","period_month");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rental_payments_family_due_idx" ON "rental_payments" USING btree ("family_id","due_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rentals_family_idx" ON "rentals" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rentals_asset_idx" ON "rentals" USING btree ("asset_id");