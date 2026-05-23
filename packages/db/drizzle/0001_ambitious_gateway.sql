CREATE TABLE IF NOT EXISTS "data_deletion_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"family_id" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"confirmed_at" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" varchar(32) NOT NULL,
	"external_event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "data_deletion_requests" ADD CONSTRAINT "data_deletion_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "data_deletion_requests" ADD CONSTRAINT "data_deletion_requests_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_deletion_user_idx" ON "data_deletion_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "data_deletion_scheduled_idx" ON "data_deletion_requests" USING btree ("scheduled_for");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "webhook_events_provider_event_unique" ON "webhook_events" USING btree ("provider","external_event_id");