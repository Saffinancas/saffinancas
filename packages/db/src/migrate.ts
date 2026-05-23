/**
 * Aplica as migrations geradas pelo drizzle-kit ao banco local PGlite
 * (ou ao Postgres da nuvem se DATABASE_URL apontar pra lá).
 *
 * Uso:
 *   pnpm db:generate   # cria SQL incremental em packages/db/drizzle
 *   pnpm db:migrate    # roda este script
 */
import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { migrate as migratePg } from "drizzle-orm/postgres-js/migrator";
import { db, dbMode } from "./index";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "..", "drizzle");

async function main() {
  console.log(`[migrate] driver=${dbMode}  folder=${migrationsFolder}`);
  // O Drizzle aceita "o mesmo objeto db" em ambas as APIs; só precisamos
  // chamar o migrator certo conforme o driver.
  if (dbMode === "pglite") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migratePglite(db as any, { migrationsFolder });
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migratePg(db as any, { migrationsFolder });
  }
  console.log("[migrate] ok");
  process.exit(0);
}

main().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});
