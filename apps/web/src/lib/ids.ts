/**
 * Geração de IDs como strings curtas (estilo nanoid).
 *
 * Não trazemos nanoid como dep — usamos crypto nativo. 16 bytes em base32 dá ~26
 * chars; suficiente pra unicidade entre famílias num SaaS pequeno-médio.
 * Quando passar de centenas de milhares de famílias, considerar ULID (lexicograficamente
 * ordenável por tempo) — pra isso seria só trocar a impl aqui.
 */
import { randomBytes } from "node:crypto";

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32

export function id(prefix?: string): string {
  const bytes = randomBytes(16);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return prefix ? `${prefix}_${out}` : out;
}
