import { db, schema } from "@cofre/db";
import { desc, eq, sql } from "drizzle-orm";

(async () => {
  console.log("=== whatsapp_sessions ===");
  const sessions = await db
    .select()
    .from(schema.whatsappSessions)
    .orderBy(desc(schema.whatsappSessions.updatedAt))
    .limit(10);
  for (const s of sessions) {
    console.log(
      JSON.stringify(
        {
          familyId: s.familyId,
          provider: s.provider,
          status: s.status,
          linkCode: s.linkCode,
          linkCodeExpiresAt: s.linkCodeExpiresAt,
          pairedPhone: s.pairedPhone,
          monitoredGroupId: s.monitoredGroupId,
          lastSeenAt: s.lastSeenAt,
          updatedAt: s.updatedAt,
        },
        null,
        2,
      ),
    );
  }

  console.log("\n=== whatsapp_group_links (últimos 10) ===");
  const links = await db
    .select()
    .from(schema.whatsappGroupLinks)
    .orderBy(desc(schema.whatsappGroupLinks.linkedAt))
    .limit(10);
  for (const l of links) {
    console.log(
      JSON.stringify(
        {
          familyId: l.familyId,
          provider: l.provider,
          externalChatId: l.externalChatId,
          chatName: l.chatName,
          isGroup: l.isGroup,
          archivedAt: l.archivedAt,
          linkedAt: l.linkedAt,
        },
        null,
        2,
      ),
    );
  }

  console.log("\n=== whatsapp_messages (últimas 10) ===");
  const msgs = await db
    .select({
      familyId: schema.whatsappMessages.familyId,
      waMessageId: schema.whatsappMessages.waMessageId,
      waChatId: schema.whatsappMessages.waChatId,
      senderPhone: schema.whatsappMessages.senderPhone,
      body: schema.whatsappMessages.body,
      processedAt: schema.whatsappMessages.processedAt,
      discardedReason: schema.whatsappMessages.discardedReason,
      receivedAt: schema.whatsappMessages.receivedAt,
    })
    .from(schema.whatsappMessages)
    .orderBy(desc(schema.whatsappMessages.receivedAt))
    .limit(10);
  for (const m of msgs) {
    console.log(
      `${m.receivedAt?.toISOString()} | fam=${m.familyId} | chat=${m.waChatId} | from=${m.senderPhone} | body=${m.body?.slice(0, 60) ?? "(sem body)"} | discarded=${m.discardedReason ?? "-"}`,
    );
  }

  console.log("\n=== platform_settings (whatsapp.*) ===");
  const rows = await db.execute(
    sql`select key, value, encrypted, updated_at from platform_settings where key like 'whatsapp.%' order by updated_at desc`,
  );
  for (const r of rows as unknown as Array<{ key: string; value: string | null; encrypted: boolean; updated_at: Date }>) {
    console.log(
      `${r.key} = ${r.encrypted ? "(enc " + (r.value?.length ?? 0) + "ch)" : r.value} | updated=${r.updated_at?.toISOString?.() ?? r.updated_at}`,
    );
  }

  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
