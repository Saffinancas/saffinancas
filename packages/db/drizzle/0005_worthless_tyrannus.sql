CREATE TYPE "public"."fiscal_regime" AS ENUM('mei', 'simples_nacional', 'lucro_presumido', 'lucro_real');--> statement-breakpoint
CREATE TYPE "public"."nfse_invoice_status" AS ENUM('draft', 'queued', 'processing', 'issued', 'rejected', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."nfse_provider" AS ENUM('sim', 'pbh_direct', 'focus_nfe', 'plugnotas', 'enotas');--> statement-breakpoint
CREATE TYPE "public"."nfse_schedule_status" AS ENUM('active', 'paused', 'ended');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fiscal_certificates" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"file_name" text NOT NULL,
	"pfx_enc" text NOT NULL,
	"password_enc" text NOT NULL,
	"subject_cn" text,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fiscal_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"document_type" varchar(2) NOT NULL,
	"document_number" varchar(20) NOT NULL,
	"legal_name" text NOT NULL,
	"trade_name" text,
	"municipal_inscription" varchar(32),
	"state_inscription" varchar(32),
	"city_code" varchar(7) DEFAULT '3106200' NOT NULL,
	"city_name" varchar(64) DEFAULT 'Belo Horizonte' NOT NULL,
	"state_code" varchar(2) DEFAULT 'MG' NOT NULL,
	"address" jsonb NOT NULL,
	"contact_email" text,
	"contact_phone" varchar(32),
	"regime" "fiscal_regime" DEFAULT 'simples_nacional' NOT NULL,
	"preferred_provider" "nfse_provider" DEFAULT 'sim' NOT NULL,
	"provider_config_enc" text,
	"environment" varchar(16) DEFAULT 'homologacao' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nfse_events" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"invoice_id" text,
	"schedule_id" text,
	"event_type" varchar(64) NOT NULL,
	"provider" "nfse_provider",
	"payload" jsonb,
	"success" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nfse_invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"profile_id" text NOT NULL,
	"recipient_id" text,
	"rps_number" integer NOT NULL,
	"rps_serie" varchar(8) DEFAULT 'A' NOT NULL,
	"nfse_number" bigint,
	"verification_code" varchar(32),
	"provider" "nfse_provider" NOT NULL,
	"status" "nfse_invoice_status" DEFAULT 'draft' NOT NULL,
	"service_value_cents" bigint NOT NULL,
	"service_description" text NOT NULL,
	"service_code" varchar(16) NOT NULL,
	"cnae" varchar(16),
	"iss_rate_bps" integer DEFAULT 0 NOT NULL,
	"iss_value_cents" bigint DEFAULT 0 NOT NULL,
	"iss_withheld" boolean DEFAULT false NOT NULL,
	"withholdings" jsonb,
	"xml_enc" text,
	"pdf_storage_key" text,
	"competence_date" timestamp with time zone NOT NULL,
	"issued_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"cancel_reason" text,
	"schedule_id" text,
	"linked_transaction_id" text,
	"error_message" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nfse_recipients" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"document_type" varchar(2) NOT NULL,
	"document_number" varchar(20) NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"municipal_inscription" varchar(32),
	"address" jsonb,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nfse_schedules" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"profile_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"label" text NOT NULL,
	"day_of_month" smallint NOT NULL,
	"service_value_cents" bigint NOT NULL,
	"service_description" text NOT NULL,
	"service_code" varchar(16) NOT NULL,
	"iss_rate_bps" integer DEFAULT 0 NOT NULL,
	"iss_withheld" boolean DEFAULT false NOT NULL,
	"status" "nfse_schedule_status" DEFAULT 'active' NOT NULL,
	"next_run_at" timestamp with time zone,
	"last_run_at" timestamp with time zone,
	"invoices_issued" integer DEFAULT 0 NOT NULL,
	"email_recipients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fiscal_certificates" ADD CONSTRAINT "fiscal_certificates_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fiscal_profiles" ADD CONSTRAINT "fiscal_profiles_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nfse_events" ADD CONSTRAINT "nfse_events_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nfse_events" ADD CONSTRAINT "nfse_events_invoice_id_nfse_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."nfse_invoices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nfse_events" ADD CONSTRAINT "nfse_events_schedule_id_nfse_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."nfse_schedules"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nfse_invoices" ADD CONSTRAINT "nfse_invoices_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nfse_invoices" ADD CONSTRAINT "nfse_invoices_profile_id_fiscal_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."fiscal_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nfse_invoices" ADD CONSTRAINT "nfse_invoices_recipient_id_nfse_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."nfse_recipients"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nfse_recipients" ADD CONSTRAINT "nfse_recipients_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nfse_schedules" ADD CONSTRAINT "nfse_schedules_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nfse_schedules" ADD CONSTRAINT "nfse_schedules_profile_id_fiscal_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."fiscal_profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "nfse_schedules" ADD CONSTRAINT "nfse_schedules_recipient_id_nfse_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."nfse_recipients"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fiscal_certs_family_active_idx" ON "fiscal_certificates" USING btree ("family_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "fiscal_profiles_family_unique" ON "fiscal_profiles" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nfse_events_invoice_idx" ON "nfse_events" USING btree ("invoice_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nfse_invoices_family_status_idx" ON "nfse_invoices" USING btree ("family_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nfse_invoices_family_issued_idx" ON "nfse_invoices" USING btree ("family_id","issued_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfse_invoices_family_rps_unique" ON "nfse_invoices" USING btree ("family_id","rps_serie","rps_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nfse_invoices_number_idx" ON "nfse_invoices" USING btree ("family_id","nfse_number");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "nfse_recipients_family_doc_unique" ON "nfse_recipients" USING btree ("family_id","document_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nfse_schedules_family_status_idx" ON "nfse_schedules" USING btree ("family_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "nfse_schedules_next_run_idx" ON "nfse_schedules" USING btree ("next_run_at");