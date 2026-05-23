"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { id } from "@/lib/ids";

/**
 * Adapter de WhatsApp.
 *
 * Em `WHATSAPP_MODE=real`, todas as ações de pareamento são delegadas ao worker
 * (`apps/worker-whatsapp`) via HTTP. O worker mantém o `whatsapp-web.js` rodando
 * e responde com o estado da sessão. A web só lê/escreve no DB e proxia chamadas.
 *
 * Em `WHATSAPP_MODE=sim` (default), simulamos tudo dentro da própria web — útil
 * em dev e demos antes do worker estar de pé.
 */

const MODE = (process.env.WHATSAPP_MODE ?? "sim") as "sim" | "real";
const WORKER_URL = process.env.WHATSAPP_WORKER_URL ?? "";
const WORKER_SECRET = process.env.WHATSAPP_WORKER_SECRET ?? "";

async function getFamilyId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado.");
  const u = session.user as { familyId?: string | null };
  if (!u.familyId) throw new Error("Sem família.");
  return u.familyId;
}

export type WaSessionView = {
  status: "unpaired" | "qr_pending" | "connected" | "reconnecting" | "disconnected" | "banned";
  qrPayload: string | null;
  qrDataUrl: string | null;
  qrExpiresAt: string | null;
  pairedPhone: string | null;
  monitoredGroupId: string | null;
  monitoredGroupName: string | null;
  mode: "sim" | "real";
};

export type WaGroup = {
  id: string;
  name: string;
  participants: number;
};

async function workerFetch<T>(pathname: string, init?: RequestInit): Promise<T> {
  if (!WORKER_URL || !WORKER_SECRET) {
    throw new Error(
      "Worker WhatsApp não configurado. Defina WHATSAPP_WORKER_URL e WHATSAPP_WORKER_SECRET.",
    );
  }
  const res = await fetch(`${WORKER_URL.replace(/\/$/, "")}${pathname}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${WORKER_SECRET}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Worker respondeu ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function getSessionView(): Promise<WaSessionView> {
  const familyId = await getFamilyId();
  const [s] = await db
    .select()
    .from(schema.whatsappSessions)
    .where(eq(schema.whatsappSessions.familyId, familyId))
    .limit(1);

  // Se o worker está rodando, ele é a fonte de verdade pro status+QR.
  // Mesclamos com o DB pra trazer grupo monitorado.
  let workerState: {
    status: string;
    qrDataUrl: string | null;
    qrExpiresAt: string | null;
    pairedPhone: string | null;
  } | null = null;
  if (MODE === "real" && WORKER_URL) {
    try {
      workerState = await workerFetch(`/sessions/${familyId}`);
    } catch {
      workerState = null;
    }
  }

  if (!s && !workerState) {
    return {
      status: "unpaired",
      qrPayload: null,
      qrDataUrl: null,
      qrExpiresAt: null,
      pairedPhone: null,
      monitoredGroupId: null,
      monitoredGroupName: null,
      mode: MODE,
    };
  }

  const status = workerState ? mapWorkerStatus(workerState.status) : s?.status ?? "unpaired";
  return {
    status,
    qrPayload: s?.qrPayload ?? null,
    qrDataUrl: workerState?.qrDataUrl ?? null,
    qrExpiresAt: workerState?.qrExpiresAt ?? s?.qrExpiresAt?.toISOString() ?? null,
    pairedPhone: workerState?.pairedPhone ?? s?.pairedPhone ?? null,
    monitoredGroupId: s?.monitoredGroupId ?? null,
    monitoredGroupName: s?.monitoredGroupName ?? null,
    mode: MODE,
  };
}

export async function requestPairing(): Promise<WaSessionView> {
  const familyId = await getFamilyId();

  if (MODE === "real") {
    await workerFetch(`/sessions/${familyId}/pair`, { method: "POST" });
    revalidatePath("/app/whatsapp");
    return getSessionView();
  }

  // Modo sim
  const now = new Date();
  const qrExpiresAt = new Date(now.getTime() + 2 * 60 * 1000);
  const qrPayload = `SIM-QR-${id()}`;
  const [existing] = await db
    .select()
    .from(schema.whatsappSessions)
    .where(eq(schema.whatsappSessions.familyId, familyId))
    .limit(1);

  if (!existing) {
    await db.insert(schema.whatsappSessions).values({
      id: id("was"),
      familyId,
      status: "qr_pending",
      qrPayload,
      qrExpiresAt,
    });
  } else {
    await db
      .update(schema.whatsappSessions)
      .set({ status: "qr_pending", qrPayload, qrExpiresAt, updatedAt: now })
      .where(eq(schema.whatsappSessions.familyId, familyId));
  }
  revalidatePath("/app/whatsapp");
  return getSessionView();
}

/**
 * SIM ONLY: simula que o usuário escaneou o QR.
 */
export async function simulateConnect(opts: {
  phone: string;
  groupName: string;
}): Promise<WaSessionView> {
  if (MODE === "real") {
    throw new Error("simulateConnect só funciona em WHATSAPP_MODE=sim.");
  }
  const familyId = await getFamilyId();
  const syntheticGroupId = `sim_${id().toLowerCase().slice(0, 16)}@g.us`;
  await db
    .update(schema.whatsappSessions)
    .set({
      status: "connected",
      pairedPhone: opts.phone,
      monitoredGroupId: syntheticGroupId,
      monitoredGroupName: opts.groupName,
      qrPayload: null,
      qrExpiresAt: null,
      lastSeenAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.whatsappSessions.familyId, familyId));
  revalidatePath("/app/whatsapp");
  return getSessionView();
}

/** REAL ONLY: lista grupos disponíveis após conectar. */
export async function listGroups(): Promise<WaGroup[]> {
  if (MODE !== "real") return [];
  const familyId = await getFamilyId();
  const data = await workerFetch<{ groups: WaGroup[] }>(`/sessions/${familyId}/groups`);
  return data.groups;
}

/** Seleciona o grupo monitorado (vale pra sim e real). */
export async function selectGroup(groupId: string, groupName: string): Promise<WaSessionView> {
  const familyId = await getFamilyId();
  if (MODE === "real") {
    await workerFetch(`/sessions/${familyId}/group`, {
      method: "POST",
      body: JSON.stringify({ groupId, groupName }),
    });
  }
  await db
    .update(schema.whatsappSessions)
    .set({
      monitoredGroupId: groupId,
      monitoredGroupName: groupName,
      updatedAt: new Date(),
    })
    .where(eq(schema.whatsappSessions.familyId, familyId));
  revalidatePath("/app/whatsapp");
  return getSessionView();
}

export async function unpair(): Promise<WaSessionView> {
  const familyId = await getFamilyId();

  if (MODE === "real") {
    try {
      await workerFetch(`/sessions/${familyId}`, { method: "DELETE" });
    } catch {
      // Worker offline? Continua limpando o DB do nosso lado.
    }
  }
  await db
    .update(schema.whatsappSessions)
    .set({
      status: "unpaired",
      pairedPhone: null,
      monitoredGroupId: null,
      monitoredGroupName: null,
      qrPayload: null,
      qrExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.whatsappSessions.familyId, familyId));
  revalidatePath("/app/whatsapp");
  return getSessionView();
}

function mapWorkerStatus(s: string): WaSessionView["status"] {
  switch (s) {
    case "qr_pending":
      return "qr_pending";
    case "connected":
      return "connected";
    case "disconnected":
      return "disconnected";
    case "auth_failure":
      return "banned";
    case "initializing":
      return "qr_pending";
    default:
      return "unpaired";
  }
}
