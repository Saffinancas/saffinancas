ALTER TABLE "nfse_invoices" ADD COLUMN "payment_received_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "nfse_invoices" ADD COLUMN "payment_received_amount_cents" bigint;