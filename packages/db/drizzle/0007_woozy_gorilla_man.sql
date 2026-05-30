CREATE TYPE "public"."whatsapp_provider" AS ENUM('sim', 'web_js', 'twilio_sandbox', 'twilio_production', 'meta_cloud');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text,
	"encrypted" boolean DEFAULT false NOT NULL,
	"updated_by_user_id" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "whatsapp_group_links" (
	"id" text PRIMARY KEY NOT NULL,
	"family_id" text NOT NULL,
	"provider" "whatsapp_provider" NOT NULL,
	"external_chat_id" text NOT NULL,
	"chat_name" text,
	"is_group" boolean DEFAULT false NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "whatsapp_sessions" ADD COLUMN "provider" "whatsapp_provider" DEFAULT 'sim' NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_sessions" ADD COLUMN "link_code" varchar(8);--> statement-breakpoint
ALTER TABLE "whatsapp_sessions" ADD COLUMN "link_code_expires_at" timestamp with time zone;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_group_links" ADD CONSTRAINT "whatsapp_group_links_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wa_group_links_provider_chat_unique" ON "whatsapp_group_links" USING btree ("provider","external_chat_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wa_group_links_family_idx" ON "whatsapp_group_links" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wa_sessions_link_code_unique" ON "whatsapp_sessions" USING btree ("link_code") WHERE "whatsapp_sessions"."link_code" is not null;