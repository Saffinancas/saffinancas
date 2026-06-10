"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

const WORKER_URL = process.env.WHATSAPP_WORKER_URL ?? "";
const WORKER_SECRET = process.env.WHATSAPP_WORKER_SECRET ?? "";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado.");
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") throw new Error("Sem permissão.");
}

async function workerFetch(path: string, init?: RequestInit) {
  if (!WORKER_URL || !WORKER_SECRET) {
    return { ok: false as const, error: "Worker não configurado." };
  }
  try {
    const r = await fetch(`${WORKER_URL.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WORKER_SECRET}`,
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
    const data = (await r.json().catch(() => null)) as unknown;
    if (!r.ok) {
      return {
        ok: false as const,
        error:
          (data as { error?: string } | null)?.error ?? `HTTP ${r.status}`,
      };
    }
    return { ok: true as const, data };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Lista TODAS as sessões whatsapp-web.js ativas na memória do worker.
 * Útil pra ver se há sessões legadas (familyId != saf-global) interferindo.
 */
export async function listWorkerSessionsAction() {
  await requireAdmin();
  return workerFetch("/sessions", { method: "GET" });
}

/**
 * Mata todas as sessões whatsapp-web.js do worker EXCETO a Saf global.
 * Pra usar quando há sessões legadas de quando cada família pareava o
 * próprio WhatsApp.
 */
export async function purgeLegacySessionsAction() {
  await requireAdmin();
  const r = await workerFetch("/sessions/purge-legacy", { method: "POST" });
  revalidatePath("/admin/integracoes/whatsapp/diagnostico");
  return r;
}
