/**
 * Volta o provider WhatsApp pra twilio_production e limpa a sessão legada
 * (linkCode/qr_pending da família) pra começar fresh.
 */
import { setPlatformSetting } from "../src/lib/platform-settings";
import { db, schema } from "@cofre/db";
import { eq } from "drizzle-orm";

(async () => {
  // 1. provider ativo
  await setPlatformSetting("whatsapp.provider", "twilio_production");
  console.log("✓ whatsapp.provider = twilio_production");

  // 2. limpa session legada (pra evitar UI confusa com linkCode vencido / qr_pending)
  const sessions = await db.select().from(schema.whatsappSessions);
  for (const s of sessions) {
    if (s.status === "qr_pending" || s.linkCode) {
      await db
        .update(schema.whatsappSessions)
        .set({
          status: "unpaired",
          provider: "twilio_production",
          linkCode: null,
          linkCodeExpiresAt: null,
          qrPayload: null,
          qrExpiresAt: null,
          monitoredGroupId: null,
          monitoredGroupName: null,
          updatedAt: new Date(),
        })
        .where(eq(schema.whatsappSessions.id, s.id));
      console.log(`✓ sessão ${s.familyId}: reset (status=unpaired, sem linkCode)`);
    }
  }

  // 3. arquiva os group_links de web_js que não foram efetivados
  const links = await db
    .select()
    .from(schema.whatsappGroupLinks)
    .where(eq(schema.whatsappGroupLinks.provider, "web_js"));
  for (const l of links) {
    if (!l.archivedAt) {
      await db
        .update(schema.whatsappGroupLinks)
        .set({ archivedAt: new Date() })
        .where(eq(schema.whatsappGroupLinks.id, l.id));
      console.log(`✓ link ${l.externalChatId} (${l.familyId}): arquivado`);
    }
  }

  console.log("\nProvider Twilio reativado. Cliente vai ver o número Twilio no /app/whatsapp.");
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
