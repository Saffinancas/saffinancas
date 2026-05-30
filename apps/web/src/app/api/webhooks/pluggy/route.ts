import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { id as genId } from "@/lib/ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook Pluggy. Eventos relevantes:
 *  - item/created
 *  - item/updated         → houve refresh, vamos resyncar
 *  - item/error           → conexão precisa de re-auth
 *  - transactions/created → novas transactions disponíveis
 *
 * Pluggy não assina HMAC por default (em prod pode-se ativar). Aqui validamos
 * só que o evento tem itemId conhecido na nossa base.
 */

type PluggyEvent = {
  id?: string;
  event?: string;
  itemId?: string;
  triggeredBy?: string;
};

export async function POST(req: Request) {
  const raw = await req.text();
  let event: PluggyEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const externalId =
    event.id ?? `pluggy_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  // Idempotência
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

  if (!event.itemId) {
    return NextResponse.json({ ok: true, skipped: "no_item" });
  }

  // Procura a conexão local
  const [conn] = await db
    .select()
    .from(schema.bankConnections)
    .where(eq(schema.bankConnections.pluggyItemId, event.itemId))
    .limit(1);

  if (!conn) {
    // Item desconhecido pra nós — pode ser de outro app, ignora
    return NextResponse.json({ ok: true, skipped: "unknown_item" });
  }

  const type = event.event ?? "";

  if (type === "item/error") {
    await db
      .update(schema.bankConnections)
      .set({ status: "error", lastError: "Pluggy reportou erro — reconecte." })
      .where(eq(schema.bankConnections.id, conn.id));
    return NextResponse.json({ ok: true });
  }

  if (type === "item/updated" || type === "transactions/created") {
    // Dispara sync (best-effort, async). Mantém webhook rápido.
    void (async () => {
      try {
        const { syncBankConnectionInternal } = await import("@/lib/pluggy-internal");
        await syncBankConnectionInternal(conn.id, conn.pluggyItemId, conn.familyId);
      } catch (err) {
        console.error("[pluggy webhook] sync failed", err);
      }
    })();
  }

  return NextResponse.json({ ok: true });
}
