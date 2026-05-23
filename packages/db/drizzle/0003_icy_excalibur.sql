ALTER TABLE "ai_usage_events" ADD COLUMN "paid_by_customer" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "families" ADD COLUMN "byok_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "families" ADD COLUMN "byok_provider" "ai_provider";--> statement-breakpoint
ALTER TABLE "families" ADD COLUMN "byok_api_key_enc" text;