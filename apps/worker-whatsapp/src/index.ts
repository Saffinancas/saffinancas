import { db, schema } from "@cofre/db";
import { inArray } from "drizzle-orm";
import { env } from "./env.js";
import { log } from "./log.js";
import { buildApp } from "./http/server.js";
import { sessionManager } from "./wa/manager.js";
import { startConsumer } from "./queue/consumer.js";
import { redis } from "./queue/redis.js";

async function restorePersistentSessions(): Promise<void> {
  const rows = await db
    .select({ familyId: schema.whatsappSessions.familyId })
    .from(schema.whatsappSessions)
    .where(inArray(schema.whatsappSessions.status, ["connected", "qr_pending"]));

  if (rows.length === 0) {
    log.info("Nenhuma sessão persistente pra restaurar");
    return;
  }
  log.info({ count: rows.length }, "Restaurando sessões persistentes");
  for (const row of rows) {
    sessionManager.getOrCreate(row.familyId).catch((err) =>
      log.error({ err, familyId: row.familyId }, "Falha ao restaurar sessão"),
    );
  }
}

async function main(): Promise<void> {
  log.info({ env: env.NODE_ENV, port: env.PORT }, "worker-whatsapp boot");

  const consumer = startConsumer();

  const app = buildApp();
  const server = app.listen(env.PORT, () => {
    log.info({ port: env.PORT }, "HTTP API up");
  });

  await restorePersistentSessions();

  async function shutdown(signal: string): Promise<void> {
    log.info({ signal }, "Shutdown solicitado");
    server.close();
    await consumer.close();
    await sessionManager.shutdown();
    await redis.quit();
    process.exit(0);
  }
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  log.error({ err }, "Boot falhou");
  process.exit(1);
});
