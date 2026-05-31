import { db, schema } from "@cofre/db";
import { count, desc, eq } from "drizzle-orm";

(async () => {
  const [bc] = await db.select({ c: count() }).from(schema.bankConnections);
  const [ba] = await db.select({ c: count() }).from(schema.bankAccounts);
  const [we] = await db
    .select({ c: count() })
    .from(schema.webhookEvents)
    .where(eq(schema.webhookEvents.provider, "pluggy"));

  const recent = await db
    .select({
      eventType: schema.webhookEvents.eventType,
      receivedAt: schema.webhookEvents.receivedAt,
      processedAt: schema.webhookEvents.processedAt,
      externalEventId: schema.webhookEvents.externalEventId,
    })
    .from(schema.webhookEvents)
    .where(eq(schema.webhookEvents.provider, "pluggy"))
    .orderBy(desc(schema.webhookEvents.receivedAt))
    .limit(5);

  const conns = await db
    .select({
      institutionName: schema.bankConnections.institutionName,
      status: schema.bankConnections.status,
      lastSyncedAt: schema.bankConnections.lastSyncedAt,
      lastError: schema.bankConnections.lastError,
    })
    .from(schema.bankConnections)
    .orderBy(desc(schema.bankConnections.lastSyncedAt))
    .limit(5);

  console.log("bank_connections:", bc?.c);
  console.log("bank_accounts:   ", ba?.c);
  console.log("webhook_events(pluggy):", we?.c);
  console.log("--- ult. 5 webhooks pluggy ---");
  console.log(JSON.stringify(recent, null, 2));
  console.log("--- ult. 5 conexoes ---");
  console.log(JSON.stringify(conns, null, 2));
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
