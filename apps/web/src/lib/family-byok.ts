"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";

/**
 * Server actions do CLIENTE pra cadastrar a própria chave de IA (BYOK).
 * Só funcionam quando o admin tiver `families.byokEnabled = true`. Senão
 * retornam erro — defesa em profundidade contra requests adulteradas.
 */

type Provider = "claude" | "openai" | "gemini";

async function requireCustomerFamily(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado.");
  const u = session.user as { familyId?: string | null; role?: string };
  if (u.role !== "customer") throw new Error("Apenas clientes.");
  if (!u.familyId) throw new Error("Sem família associada.");
  return u.familyId;
}

function validateApiKeyShape(provider: Provider, key: string): string | null {
  const trimmed = key.trim();
  if (trimmed.length < 20) return "Chave muito curta — confirme antes de salvar.";
  if (provider === "claude" && !trimmed.startsWith("sk-ant-")) {
    return "Chaves da Anthropic começam com 'sk-ant-'.";
  }
  if (provider === "openai" && !trimmed.startsWith("sk-")) {
    return "Chaves da OpenAI começam com 'sk-'.";
  }
  // Gemini: aceita qualquer string longa (formato menos previsível).
  return null;
}

export async function saveCustomerByokKey(opts: {
  provider: Provider;
  apiKey: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const familyId = await requireCustomerFamily();

  const [family] = await db
    .select()
    .from(schema.families)
    .where(eq(schema.families.id, familyId))
    .limit(1);
  if (!family) return { ok: false, error: "Família não encontrada." };
  if (!family.byokEnabled) {
    return {
      ok: false,
      error: "BYOK não está habilitado pra sua família. Fale com a equipe Saf.",
    };
  }

  const shapeErr = validateApiKeyShape(opts.provider, opts.apiKey);
  if (shapeErr) return { ok: false, error: shapeErr };

  await db
    .update(schema.families)
    .set({
      byokProvider: opts.provider,
      byokApiKeyEnc: encrypt(opts.apiKey.trim()),
      updatedAt: new Date(),
    })
    .where(eq(schema.families.id, familyId));

  revalidatePath("/app/config/ia");
  revalidatePath("/app/config");
  return { ok: true };
}

export async function removeCustomerByokKey(): Promise<void> {
  const familyId = await requireCustomerFamily();
  await db
    .update(schema.families)
    .set({ byokProvider: null, byokApiKeyEnc: null, updatedAt: new Date() })
    .where(eq(schema.families.id, familyId));
  revalidatePath("/app/config/ia");
  revalidatePath("/app/config");
}
