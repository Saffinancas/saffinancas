/**
 * Configurações da plataforma (key-value) gerenciadas pelo admin via UI.
 * Valores sensíveis (tokens, secrets) são criptografados com PLATFORM_ENCRYPTION_KEY.
 *
 * Cache em memória de 60s pra reduzir round-trip ao DB em hot paths (ex: webhooks).
 *
 * Não use pra: DATABASE_URL, BETTER_AUTH_SECRET, PLATFORM_ENCRYPTION_KEY, CRON_SECRET
 * — esses precisam estar em env var por motivos técnicos (precisam antes do DB,
 * ou são a chave-mestra que protege as outras).
 */
import { eq } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { encrypt, decrypt } from "@/lib/crypto";

const CACHE_TTL_MS = 60_000;

type CacheEntry = { value: string | null; expiresAt: number };
const cache = new Map<string, CacheEntry>();

export async function getPlatformSetting(key: string): Promise<string | null> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const [row] = await db
    .select()
    .from(schema.platformSettings)
    .where(eq(schema.platformSettings.key, key))
    .limit(1);

  if (!row) {
    // Fallback: env var com mesmo nome (uppercase, dots → underscores)
    const envKey = key.toUpperCase().replace(/[.-]/g, "_");
    const envVal = process.env[envKey] ?? null;
    cache.set(key, { value: envVal, expiresAt: Date.now() + CACHE_TTL_MS });
    return envVal;
  }

  const raw = row.value;
  if (raw === null || raw === undefined) {
    cache.set(key, { value: null, expiresAt: Date.now() + CACHE_TTL_MS });
    return null;
  }

  const value = row.encrypted ? decrypt(raw) : raw;
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

export type SetPlatformSettingOpts = {
  /** Se true, salva criptografado (use pra tokens, secrets). */
  encrypted?: boolean;
  /** Quem está alterando (admin user id). */
  updatedByUserId?: string;
};

export async function setPlatformSetting(
  key: string,
  value: string | null,
  opts: SetPlatformSettingOpts = {},
): Promise<void> {
  const stored = value === null ? null : opts.encrypted ? encrypt(value) : value;
  await db
    .insert(schema.platformSettings)
    .values({
      key,
      value: stored,
      encrypted: opts.encrypted ?? false,
      updatedByUserId: opts.updatedByUserId ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.platformSettings.key,
      set: {
        value: stored,
        encrypted: opts.encrypted ?? false,
        updatedByUserId: opts.updatedByUserId ?? null,
        updatedAt: new Date(),
      },
    });

  // Invalida cache pra essa chave
  cache.delete(key);
}

/** Lista configs por prefixo (ex: "whatsapp."). Útil pra UI admin. */
export async function listPlatformSettings(
  prefix: string,
): Promise<Array<{ key: string; hasValue: boolean; masked: string | null; encrypted: boolean }>> {
  const rows = await db.select().from(schema.platformSettings);
  return rows
    .filter((r) => r.key.startsWith(prefix))
    .map((r) => {
      const hasValue = r.value !== null && r.value !== "";
      let masked: string | null = null;
      if (hasValue) {
        try {
          const plain = r.encrypted ? decrypt(r.value!) : r.value!;
          // Mascara TODOS os valores — quem precisa do plain pra editar deve
          // buscar via endpoint dedicado com auth admin. Listagem nunca expõe
          // valores completos, mesmo de campos não-encrypted.
          masked = plain.length <= 4 ? "····" : "····" + plain.slice(-4);
        } catch {
          masked = "····";
        }
      }
      return { key: r.key, hasValue, masked, encrypted: r.encrypted };
    });
}

/** Apaga uma config (útil ao trocar provider). */
export async function deletePlatformSetting(key: string): Promise<void> {
  await db.delete(schema.platformSettings).where(eq(schema.platformSettings.key, key));
  cache.delete(key);
}

/** Força reload na próxima leitura. Use após updates batch. */
export function invalidatePlatformSettingsCache(): void {
  cache.clear();
}
