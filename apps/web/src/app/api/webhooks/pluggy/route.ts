import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { id as genId } from "@/lib/ids";
import { getPlatformSetting } from "@/lib/platform-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook Pluggy.
 *
 * Segurança:
 *  - Valida HMAC SHA-256 do raw body com `PLUGGY_WEBHOOK_SECRET` (header
 *    `x-pluggy-signature`). Se a env não estiver definida, qualquer um pode
 *    disparar resync — em prod ela é obrigatória.
 *
 * Idempotência + retry:
 *  - Cada evento é persistido em `webhook_events` por (provider, externalId).
 *  - Em falha de processamento: incrementa `attempts`, grava `error`, retorna 500.
 *  - Pluggy retenta com mesmo externalId; o registro é atualizado.
 *  - Em sucesso: grava `processed_at`, zera `error`.
 *
 * Eventos relevantes: item/created, item/updated, item/error, transactions/created.
 */

type PluggyEvent = {
  id?: string;
  event?: string;
  itemId?: string;
  triggeredBy?: string;
};

async function verifySignature(raw: string, signatureHeader: string | null): Promise<boolean> {
  const secret = await getPlatformSetting("pluggy.webhook_secret");
  if (!secret) {
    // Sem secret configurado:
    //  - prod: rejeita (fail-closed)
    //  - dev:  aceita (mas warn)
    if (process.env.NODE_ENV === "production") return false;
    console.warn("[pluggy webhook] PLUGGY_WEBHOOK_SECRET ausente — aceito em dev");
    return true;
  }
  if (!signatureHeader) return false;
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  // Header pode vir como hex puro ou prefixado (ex.: `sha256=...`). Aceita ambos.
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
    req.headers.get("x-pluggy-signature") ?? req.headers.get("pluggy-signature");

  if (!(await verifySignature(raw, signature))) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let event: PluggyEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const externalId =
    event.id ?? `pluggy_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const eventType = event.event ?? "unknown";

  // Upsert do evento: na primeira vez insere; em retentativa atualiza attempts + payload.
  await db
    .insert(schema.webhookEvents)
    .values({
      id: genId("wh"),
      provider: "pluggy",
      externalEventId: externalId,
      eventType,
      payload: event,
      attempts: 1,
    })
    .onConflictDoUpdate({
      target: [schema.webhookEvents.provider, schema.webhookEvents.externalEventId],
      set: {
        payload: event,
        attempts: sql`${schema.webhookEvents.attempts} + 1`,
      },
    });

  async function markProcessed() {
    await db
      .update(schema.webhookEvents)
      .set({ processedAt: new Date(), error: null })
      .where(
        sql`${schema.webhookEvents.provider} = 'pluggy' AND ${schema.webhookEvents.externalEventId} = ${externalId}`,
      );
  }

  async function markFailed(err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await db
      .update(schema.webhookEvents)
      .set({ error: msg.slice(0, 500) })
      .where(
        sql`${schema.webhookEvents.provider} = 'pluggy' AND ${schema.webhookEvents.externalEventId} = ${externalId}`,
      );
  }

  if (!event.itemId) {
    await markProcessed();
    return NextResponse.json({ ok: true, skipped: "no_item" });
  }

  const [conn] = await db
    .select()
    .from(schema.bankConnections)
    .where(eq(schema.bankConnections.pluggyItemId, event.itemId))
    .limit(1);

  if (!conn) {
    await markProcessed();
    return NextResponse.json({ ok: true, skipped: "unknown_item" });
  }

  try {
    if (eventType === "item/error") {
      await db
        .update(schema.bankConnections)
        .set({ status: "error", lastError: "Pluggy reportou erro — reconecte." })
        .where(eq(schema.bankConnections.id, conn.id));
    } else if (eventType === "item/updated" || eventType === "transactions/created") {
      const { syncBankConnectionInternal } = await import("@/lib/pluggy-internal");
      await syncBankConnectionInternal(conn.id, conn.pluggyItemId, conn.familyId);
    }
    await markProcessed();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[pluggy webhook] processing failed", err);
    await markFailed(err);
    // 5xx faz a Pluggy reentregar o evento. A row já está persistida com attempts+1.
    return NextResponse.json({ ok: false, error: "processing_failed" }, { status: 500 });
  }
}
