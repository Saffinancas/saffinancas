ALTER TYPE "public"."subscription_status" ADD VALUE 'free';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_usage_events" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_cents" integer DEFAULT 0 NOT NULL,
	"transaction_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ai_usage_events" ADD CONSTRAINT "ai_usage_events_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_usage_family_month_idx" ON "ai_usage_events" USING btree ("family_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_usage_provider_idx" ON "ai_usage_events" USING btree ("provider","created_at");