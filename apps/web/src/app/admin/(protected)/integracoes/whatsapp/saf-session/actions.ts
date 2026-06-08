"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  getSafStatus,
  startSafSession,
  requestSafPairingCode,
  unpairSafSession,
} from "@/lib/saf-whatsapp";

async function requireAdmin(): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado.");
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") throw new Error("Sem permissão.");
}

export async function safStartAction() {
  await requireAdmin();
  const r = await startSafSession();
  revalidatePath("/admin/integracoes/whatsapp/saf-session");
  return r;
}

export async function safPairAction(phone: string) {
  await requireAdmin();
  if (!phone || !/^\+?\d{10,15}$/.test(phone.replace(/\s/g, ""))) {
    return { ok: false as const, error: "Telefone inválido. Use formato +55DDXXXXXXXXX." };
  }
  const r = await requestSafPairingCode(phone);
  revalidatePath("/admin/integracoes/whatsapp/saf-session");
  return r;
}

export async function safUnpairAction() {
  await requireAdmin();
  const r = await unpairSafSession();
  revalidatePath("/admin/integracoes/whatsapp/saf-session");
  return r;
}

export async function safStatusAction() {
  await requireAdmin();
  return getSafStatus();
}
