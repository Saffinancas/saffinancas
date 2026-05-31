"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  setPlatformSetting,
  deletePlatformSetting,
  invalidatePlatformSettingsCache,
} from "@/lib/platform-settings";
import { findSettingDef } from "@/lib/platform-settings-registry";

async function requireAdmin(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado.");
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") throw new Error("Sem permissão.");
  return session.user.id;
}

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function savePlatformSettingAction(input: {
  key: string;
  value: string;
  /** Se o consumidor já souber: força encrypted. Caso contrário usa o registry. */
  encrypted?: boolean;
}): Promise<SaveResult> {
  try {
    const userId = await requireAdmin();
    const key = input.key.trim();
    const value = input.value;

    if (!key) return { ok: false, error: "Chave vazia." };
    if (!/^[a-z0-9_.-]+$/.test(key)) {
      return { ok: false, error: "Chave inválida (use a-z, 0-9, ponto, hífen, underscore)." };
    }

    const def = findSettingDef(key);
    if (def?.readonly) {
      return {
        ok: false,
        error: `${def.label} é env-only. Edite em Vercel → Settings → Environment Variables.`,
      };
    }

    const encrypted = input.encrypted ?? def?.sensitive ?? false;

    await setPlatformSetting(key, value, { encrypted, updatedByUserId: userId });
    invalidatePlatformSettingsCache();
    revalidatePath("/admin/config");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro inesperado." };
  }
}

export async function deletePlatformSettingAction(key: string): Promise<SaveResult> {
  try {
    await requireAdmin();
    const def = findSettingDef(key);
    if (def?.readonly) {
      return { ok: false, error: "Setting read-only." };
    }
    await deletePlatformSetting(key);
    invalidatePlatformSettingsCache();
    revalidatePath("/admin/config");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro inesperado." };
  }
}
