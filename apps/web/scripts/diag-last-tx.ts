import { db, schema } from "@cofre/db";
import { desc, eq } from "drizzle-orm";

(async () => {
  console.log("=== Últimas 5 transações via WhatsApp ===");
  const txs = await db
    .select({
      id: schema.transactions.id,
      familyId: schema.transactions.familyId,
      type: schema.transactions.type,
      amountCents: schema.transactions.amountCents,
      description: schema.transactions.description,
      occurredAt: schema.transactions.occurredAt,
      origin: schema.transactions.origin,
      whatsappMessageId: schema.transactions.whatsappMessageId,
      createdAt: schema.transactions.createdAt,
    })
    .from(schema.transactions)
    .where(eq(schema.transactions.origin, "whatsapp"))
    .orderBy(desc(schema.transactions.createdAt))
    .limit(5);

  for (const t of txs) {
    console.log(
      JSON.stringify(
        {
          id: t.id,
          family: t.familyId,
          type: t.type,
          amount: `R$ ${(t.amountCents / 100).toFixed(2)}`,
          desc: t.description?.slice(0, 60),
          createdAt: t.createdAt?.toISOString(),
          waMessageId: t.whatsappMessageId,
        },
        null,
        2,
      ),
    );

    // ver a msg raw correspondente
    if (t.whatsappMessageId) {
      const [m] = await db
        .select({
          waMessageId: schema.whatsappMessages.waMessageId,
          waChatId: schema.whatsappMessages.waChatId,
          senderPhone: schema.whatsappMessages.senderPhone,
          receivedAt: schema.whatsappMessages.receivedAt,
        })
        .from(schema.whatsappMessages)
        .where(eq(schema.whatsappMessages.id, t.whatsappMessageId))
        .limit(1);
      if (m) {
        console.log(
          `  ↳ msg ${m.waMessageId} chat=${m.waChatId} de ${m.senderPhone} at ${m.receivedAt?.toISOString()}`,
        );
      }
    }
  }
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
