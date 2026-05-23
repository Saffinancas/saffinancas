import { NextResponse } from "next/server";
import { db, schema } from "@cofre/db";
import { id as genId } from "@/lib/ids";

/**
 * Webhook Pluggy — idempotente via tabela webhook_events.
 *
 * Em Fase 3: enfileira um job de sync para cada `item_id` que recebe update;
 * o worker pega transações novas via API REST do Pluggy e insere em
 * `transactions` (origin='bank'), passando cada uma pelo @cofre/ai pra
 * sugestão de categoria. Dedupe contra WhatsApp via dedupHash.
 */

type PluggyEvent = {
  id?: string;
  event?: string;
  itemId?: string;
};

export async function POST(req: Request) {
  const raw = await req.text();

  let event: PluggyEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const externalId = event.id ?? `pluggy_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  try {
    await db.insert(schema.webhookEvents).values({
      id: genId("wh"),
      provider: "pluggy",
      externalEventId: externalId,
      eventType: event.event ?? "unknown",
      payload: event,
    });
  } catch {
    return NextResponse.json({ ok: true, idempotent: true });
  }

  // TODO Fase 3: enfileirar sync.bank job para event.itemId.
  return NextResponse.json({ ok: true });
}
