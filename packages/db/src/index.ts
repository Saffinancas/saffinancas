/**
 * Cliente Drizzle único — escolhe o driver baseado em DATABASE_URL.
 *
 *  - `DATABASE_URL` ausente OU começando com `pglite:` → PGlite local
 *    (arquivo em `./.pglite/saf.db` por padrão, ou no caminho que vier depois
 *    de `pglite:`). Mesma engine do Postgres em produção.
 *
 *  - `DATABASE_URL` com `postgres://` ou `postgresql://` → postgres-js,
 *    para Neon / Supabase / qualquer Postgres da nuvem.
 *
 * Você troca de "local dev" pra "produção" só mexendo no .env — schema,
 * migrations e código de query continuam idênticos.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type DB =
  | ReturnType<typeof drizzlePglite<typeof schema>>
  | ReturnType<typeof drizzlePostgres<typeof schema>>;

const url = process.env.DATABASE_URL;

declare global {
  // eslint-disable-next-line no-var
  var __saf_db__: { db: DB; mode: "pglite" | "postgres"; pglite?: PGlite } | undefined;
}

function defaultPgliteDir(): string {
  // Anchorado no diretório DESTE arquivo (packages/db/src/index.ts),
  // não em process.cwd() — assim, qualquer script (migrate, seed, dev server)
  // aponta para o MESMO banco local, independente de onde foi disparado.
  const here = path.dirname(fileURLToPath(import.meta.url));
  const monorepoRoot = path.resolve(here, "..", "..", "..");
  return path.join(monorepoRoot, ".pglite");
}

function init(): { db: DB; mode: "pglite" | "postgres"; pglite?: PGlite } {
  if (!url || url.startsWith("pglite:") || url.startsWith("file:")) {
    const dataDir = url?.replace(/^pglite:\/\/|^pglite:|^file:\/\//, "") || defaultPgliteDir();
    const client = new PGlite(dataDir);
    return {
      db: drizzlePglite(client, { schema, casing: "snake_case" }),
      mode: "pglite",
      pglite: client,
    };
  }
  const sql = postgres(url, { prepare: false, max: 10 });
  return {
    db: drizzlePostgres(sql, { schema, casing: "snake_case" }),
    mode: "postgres",
  };
}

const cached = globalThis.__saf_db__ ?? init();
if (process.env.NODE_ENV !== "production") {
  globalThis.__saf_db__ = cached;
}

export const db = cached.db;
export const dbMode = cached.mode;
export const pglite = cached.pglite;
export { schema };
export * from "./schema";
