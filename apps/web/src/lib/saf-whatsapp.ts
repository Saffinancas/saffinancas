"use server";

/**
 * Proxy admin pra sessão Saf global (1 número operacional Saf usado em todos
 * os grupos das famílias). Fala com o worker via WHATSAPP_WORKER_URL.
 */

const WORKER_URL = process.env.WHATSAPP_WORKER_URL ?? "";
const WORKER_SECRET = process.env.WHATSAPP_WORKER_SECRET ?? "";

export type SafSessionStatus = {
  status: "disconnected" | "qr_pending" | "connected" | "auth_failure" | "initializing" | "unpaired";
  pairedPhone: string | null;
  qrDataUrl: string | null;
  qrExpiresAt: string | null;
};

export type WorkerError = { ok: false; error: string };
export type WorkerOk<T> = { ok: true; data: T };

async function workerFetch<T>(path: string, init?: RequestInit): Promise<WorkerOk<T> | WorkerError> {
  if (!WORKER_URL || !WORKER_SECRET) {
    return {
      ok: false,
      error:
        "Worker WhatsApp não configurado. Suba o worker no Fly.io e defina WHATSAPP_WORKER_URL + WHATSAPP_WORKER_SECRET na Vercel.",
    };
  }
  try {
    const res = await fetch(`${WORKER_URL.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WORKER_SECRET}`,
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // ignore
    }
    if (!res.ok) {
      const err =
        (json as { error?: string; message?: string } | null)?.message ??
        (json as { error?: string } | null)?.error ??
        `Worker respondeu ${res.status}`;
      return { ok: false, error: err };
    }
    return { ok: true, data: (json ?? {}) as T };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro de rede com o worker." };
  }
}

export async function getSafStatus(): Promise<SafSessionStatus | { error: string }> {
  const r = await workerFetch<SafSessionStatus>("/saf-session/status", { method: "GET" });
  if (!r.ok) return { error: r.error };
  return r.data;
}

export async function startSafSession(): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await workerFetch<{ status: string }>("/saf-session/start", { method: "POST" });
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true };
}

export async function requestSafPairingCode(
  phone: string,
): Promise<
  | { ok: true; pairingCode: string; expiresInSeconds: number; instructions: string }
  | { ok: false; error: string }
> {
  const cleaned = phone.replace(/\s/g, "");
  const r = await workerFetch<{
    pairingCode: string;
    expiresInSeconds: number;
    instructions: string;
  }>("/saf-session/pair-by-phone", {
    method: "POST",
    body: JSON.stringify({ phone: cleaned }),
  });
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, ...r.data };
}

export async function unpairSafSession(): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await workerFetch<{ ok: true }>("/saf-session/", { method: "DELETE" });
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true };
}

export async function listSafGroups(): Promise<
  | { ok: true; groups: Array<{ id: string; name: string; participants: number }> }
  | { ok: false; error: string }
> {
  const r = await workerFetch<{ groups: Array<{ id: string; name: string; participants: number }> }>(
    "/saf-session/groups",
    { method: "GET" },
  );
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, groups: r.data.groups };
}

export type SafEvent = {
  ts: string;
  from: string;
  fromMe: boolean;
  isGroup: boolean;
  type: string;
  bodyPreview: string;
  action:
    | "enqueued"
    | "skipped_no_body"
    | "skipped_not_group"
    | "skipped_not_monitored"
    | "error";
  resolvedFamilyId: string | null;
  note?: string;
};

export async function listSafEvents(): Promise<
  { ok: true; events: SafEvent[] } | { ok: false; error: string }
> {
  const r = await workerFetch<{ events: SafEvent[] }>("/saf-session/events", {
    method: "GET",
  });
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, events: r.data.events };
}

export async function sendSafMessage(
  to: string,
  body: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await workerFetch<{ ok: true }>("/saf-session/send", {
    method: "POST",
    body: JSON.stringify({ to, body }),
  });
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true };
}
