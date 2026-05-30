"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import { setPlatformSetting, deletePlatformSetting } from "@/lib/platform-settings";
import type { WhatsappProviderId } from "@/lib/whatsapp-providers/labels";

const VALID_PROVIDERS = new Set<WhatsappProviderId>([
  "sim",
  "web_js",
  "twilio_sandbox",
  "twilio_production",
  "meta_cloud",
]);

const ENCRYPTED_KEYS = new Set([
  "whatsapp.twilio.account_sid",
  "whatsapp.twilio.auth_token",
  "whatsapp.meta.access_token",
  "whatsapp.meta.app_secret",
]);

async function requireAdmin(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado.");
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") throw new Error("Sem permissão.");
  return session.user.id;
}

export type SaveProviderInput = {
  provider: WhatsappProviderId;
  twilio?: {
    accountSid?: string;
    authToken?: string;
    from?: string;
  };
  meta?: {
    phoneNumberId?: string;
    accessToken?: string;
    verifyToken?: string;
    appSecret?: string;
    displayNumber?: string;
  };
};

export async function saveWhatsappConfig(input: SaveProviderInput): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const userId = await requireAdmin();
    if (!VALID_PROVIDERS.has(input.provider)) {
      return { ok: false, error: "Provider inválido." };
    }

    // Salva o provider ativo
    await setPlatformSetting("whatsapp.provider", input.provider, { updatedByUserId: userId });

    if (input.provider === "twilio_sandbox" || input.provider === "twilio_production") {
      if (input.twilio?.accountSid) {
        await setPlatformSetting("whatsapp.twilio.account_sid", input.twilio.accountSid, {
          encrypted: true,
          updatedByUserId: userId,
        });
      }
      if (input.twilio?.authToken) {
        await setPlatformSetting("whatsapp.twilio.auth_token", input.twilio.authToken, {
          encrypted: true,
          updatedByUserId: userId,
        });
      }
      if (input.twilio?.from) {
        const from = input.twilio.from.startsWith("whatsapp:")
          ? input.twilio.from
          : `whatsapp:${input.twilio.from}`;
        await setPlatformSetting("whatsapp.twilio.from", from, { updatedByUserId: userId });
      }
    }

    if (input.provider === "meta_cloud") {
      if (input.meta?.phoneNumberId) {
        await setPlatformSetting("whatsapp.meta.phone_number_id", input.meta.phoneNumberId, {
          encrypted: true,
          updatedByUserId: userId,
        });
      }
      if (input.meta?.accessToken) {
        await setPlatformSetting("whatsapp.meta.access_token", input.meta.accessToken, {
          encrypted: true,
          updatedByUserId: userId,
        });
      }
      if (input.meta?.verifyToken) {
        await setPlatformSetting("whatsapp.meta.verify_token", input.meta.verifyToken, {
          updatedByUserId: userId,
        });
      }
      if (input.meta?.appSecret) {
        await setPlatformSetting("whatsapp.meta.app_secret", input.meta.appSecret, {
          encrypted: true,
          updatedByUserId: userId,
        });
      }
      if (input.meta?.displayNumber) {
        await setPlatformSetting("whatsapp.meta.display_number", input.meta.displayNumber, {
          updatedByUserId: userId,
        });
      }
    }

    revalidatePath("/admin/integracoes/whatsapp");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro inesperado." };
  }
}

export async function clearWhatsappSetting(key: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    // Só permite limpar keys conhecidas
    if (!key.startsWith("whatsapp.")) return { ok: false, error: "Chave inválida." };
    await deletePlatformSetting(key);
    revalidatePath("/admin/integracoes/whatsapp");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro inesperado." };
  }
}

export async function generateMetaVerifyToken(): Promise<string> {
  await requireAdmin();
  return randomBytes(24).toString("hex");
}

// helper pra detectar se uma chave é encriptada (sem tocar no DB)
export function isEncryptedKey(key: string): boolean {
  return ENCRYPTED_KEYS.has(key);
}
