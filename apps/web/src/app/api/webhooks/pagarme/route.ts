import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db, schema } from "@cofre/db";
import { and, eq } from "drizzle-orm";
import { id as genId } from "@/lib/ids";
import { getPlatformSetting } from "@/lib/platform-settings";

/**
 * Webhook Pagar.me v5 — idempotente via tabela webhook_events.
 *
 * Implementação inicial:
 *  - Verifica HMAC signature se PAGARME_WEBHOOK_SECRET estiver setado.
 *  - Insere o evento em webhook_events (UNIQUE em provider+external_event_id).
 *  - Despacha por event.type para mudar status da subscription.
 *
 * Em modo dev sem chave, este endpoint só responde 200 e loga — o user pode
 * "simular" pagamento aprovado via UI em /app/cobranca/cartao.
 */

type PagarmeEvent = {
  id?: string;
  type?: string;
  data?: {
    id?: string;
    status?: string;
    customer?: { id?: string };
    subscription?: { id?: string; status?: string; next_billing_at?: string };
  };
};

async function verifyPagarmeSignature(raw: string, signatureHeader: string | null): Promise<boolean> {
  const secret = await getPlatformSetting("pagarme.webhook_secret");
  if (!secret) {
    // Sem secret: em prod rejeita; em dev aceita com warn.
    if (process.env.NODE_ENV === "production") return false;
    console.warn("[pagarme webhook] PAGARME_WEBHOOK_SECRET ausente — aceito em dev");
    return true;
  }
  if (!signatureHeader) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const provided = signatureHeader.replace(/^sha256=/i, "").trim();
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const raw = await req.text();
  const signature =
    req.headers.get("x-hub-signature") ?? req.headers.get("pagarme-signature");

  if (!(await verifyPagarmeSignature(raw, signature))) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let event: PagarmeEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const externalId = event.id ?? `pagarme_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  // Idempotência
  try {
    await db.insert(schema.webhookEvents).values({
      id: genId("wh"),
      provider: "pagarme",
      externalEventId: externalId,
      eventType: event.type ?? "unknown",
      payload: event,
    });
  } catch {
    // Já recebido — responde 200 idempotente.
    return NextResponse.json({ ok: true, idempotent: true });
  }

  // Despacho mínimo. Expandir conforme integração for real.
  try {
    const subPagarmeId = event.data?.subscription?.id;
    if (subPagarmeId) {
      if (event.type === "subscription.payment_succeeded") {
        await db
          .update(schema.subscriptions)
          .set({
            status: "active",
            pastDueSince: null,
            blockedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(schema.subscriptions.pagarmeSubscriptionId, subPagarmeId));
      } else if (event.type === "subscription.payment_failed") {
        await db
          .update(schema.subscriptions)
          .set({
            status: "past_due",
            pastDueSince: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.subscriptions.pagarmeSubscriptionId, subPagarmeId));
      } else if (event.type === "subscription.canceled") {
        await db
          .update(schema.subscriptions)
          .set({
            status: "canceled",
            canceledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.subscriptions.pagarmeSubscriptionId, subPagarmeId));
      }
    }
    await db
      .update(schema.webhookEvents)
      .set({ processedAt: new Date() })
      .where(
        and(
          eq(schema.webhookEvents.provider, "pagarme"),
          eq(schema.webhookEvents.externalEventId, externalId),
        ),
      );
  } catch (err) {
    await db
      .update(schema.webhookEvents)
      .set({ error: err instanceof Error ? err.message : String(err) })
      .where(
        and(
          eq(schema.webhookEvents.provider, "pagarme"),
          eq(schema.webhookEvents.externalEventId, externalId),
        ),
      );
  }

  return NextResponse.json({ ok: true });
}
