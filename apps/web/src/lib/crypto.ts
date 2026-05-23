/**
 * Criptografia simétrica AES-256-GCM para valores sensíveis (BYOK API keys,
 * tokens do platform_config, etc.).
 *
 *  - Chave em `PLATFORM_ENCRYPTION_KEY`: 32 bytes base64. Em prod, derivar de
 *    KMS (AWS/GCP).
 *  - Formato armazenado: `iv:ciphertext:tag` (todos base64).
 *  - **Dev fallback**: se a env não estiver definida, usamos uma chave fixa
 *    com warning — pra dev local não travar. Em prod, fail-closed.
 */
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const env = process.env.PLATFORM_ENCRYPTION_KEY;
  if (env) {
    const decoded = Buffer.from(env, "base64");
    if (decoded.length !== 32) {
      throw new Error(
        "PLATFORM_ENCRYPTION_KEY precisa ser exatamente 32 bytes base64-encoded.",
      );
    }
    cachedKey = decoded;
    return decoded;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "PLATFORM_ENCRYPTION_KEY ausente em produção. Configure no ambiente.",
    );
  }
  // DEV: derivar uma chave estável de uma string fixa (escolha ruim em prod).
  console.warn(
    "[crypto] PLATFORM_ENCRYPTION_KEY ausente — usando chave de dev. NÃO USAR EM PROD.",
  );
  cachedKey = scryptSync("saf-dev-only-key", "saf-dev-salt", 32);
  return cachedKey;
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), enc.toString("base64"), tag.toString("base64")].join(":");
}

export function decrypt(encoded: string): string {
  const [ivB64, ctB64, tagB64] = encoded.split(":");
  if (!ivB64 || !ctB64 || !tagB64) throw new Error("Encoded ciphertext malformado.");
  const iv = Buffer.from(ivB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  if (iv.length !== IV_LEN || tag.length !== TAG_LEN) {
    throw new Error("IV ou tag com tamanho inválido.");
  }
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(ct), decipher.final()]);
  return dec.toString("utf8");
}

/** Mostra os últimos N caracteres da chave decriptada (pra exibir "··· abc123"). */
export function maskKey(encoded: string, lastChars = 4): string {
  try {
    const plain = decrypt(encoded);
    if (plain.length <= lastChars) return plain;
    return "····" + plain.slice(-lastChars);
  } catch {
    return "····";
  }
}
