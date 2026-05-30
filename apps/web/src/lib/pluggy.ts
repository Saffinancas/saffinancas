"use server";

/**
 * Cliente Pluggy + Open Finance.
 *
 * Fluxo:
 *  1. Server pede `apiKey` via /auth (TTL ~2h, cacheada em memória)
 *  2. Front pede `connect_token` via /api/pluggy/connect-token
 *  3. Front abre Pluggy Connect (script externo) → user escolhe banco e autentica
 *  4. Front avisa o nosso back com `itemId` → server cria `bank_connections`
 *     e sincroniza accounts + transactions
 *  5. Webhook do Pluggy avisa quando novas transactions chegam → sync incremental
 */

import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { getPlatformSetting } from "@/lib/platform-settings";
import { id as genId } from "@/lib/ids";

const API_BASE = "https://api.pluggy.ai";

// Cache em memória da apiKey (TTL ~2h pelo provider)
type AuthCache = { apiKey: string; expiresAt: number };
let cachedAuth: AuthCache | null = null;

async function getCredentials(): Promise<{ clientId: string; clientSecret: string }> {
  const [clientId, clientSecret] = await Promise.all([
    getPlatformSetting("pluggy.client_id"),
    getPlatformSetting("pluggy.client_secret"),
  ]);
  if (!clientId || !clientSecret) {
    throw new Error("Pluggy não configurado. Defina credenciais em Admin → Integrações.");
  }
  return { clientId, clientSecret };
}

async function getApiKey(): Promise<string> {
  if (cachedAuth && cachedAuth.expiresAt > Date.now() + 60_000) {
    return cachedAuth.apiKey;
  }
  const { clientId, clientSecret } = await getCredentials();
  const res = await fetch(`${API_BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Pluggy auth ${res.status}: ${text}`);
  }
  const json = (await res.json()) as { apiKey: string };
  cachedAuth = { apiKey: json.apiKey, expiresAt: Date.now() + 2 * 3600 * 1000 };
  return json.apiKey;
}

async function pluggyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = await getApiKey();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Pluggy ${path} ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

async function familyId(): Promise<string> {
  const s = await auth.api.getSession({ headers: await headers() });
  const fid = (s?.user as { familyId?: string | null })?.familyId;
  if (!fid) throw new Error("Sem família.");
  return fid;
}

/** Status global da integração — fallback pra "sim" se não tem credenciais. */
export async function pluggyMode(): Promise<"sim" | "real"> {
  const [id, secret] = await Promise.all([
    getPlatformSetting("pluggy.client_id"),
    getPlatformSetting("pluggy.client_secret"),
  ]);
  return id && secret ? "real" : "sim";
}

/**
 * Pede um connect_token pro widget abrir. Token é específico do user e
 * tem validade curta (~30min).
 */
export async function createConnectToken(): Promise<
  { ok: true; token: string } | { ok: false; error: string }
> {
  try {
    await familyId();
    const json = await pluggyFetch<{ accessToken: string }>("/connect_token", {
      method: "POST",
      body: JSON.stringify({}),
    });
    return { ok: true, token: json.accessToken };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro Pluggy" };
  }
}

type PluggyAccount = {
  id: string;
  type: string;
  subtype: string;
  name: string;
  marketingName?: string;
  number?: string;
  balance: number;
  itemId: string;
  currencyCode: string;
  creditData?: { creditLimit: number };
};

type PluggyTransaction = {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: "DEBIT" | "CREDIT";
  category?: string | null;
  merchant?: { name?: string };
};

type PluggyItem = {
  id: string;
  status: string;
  connector: { name: string; imageUrl?: string };
  lastUpdatedAt?: string;
};

/**
 * Front chama isso após user autenticar no Pluggy Connect. Server:
 *  1. Busca o item no Pluggy
 *  2. Salva bank_connections + bank_accounts
 *  3. Sincroniza últimos 90 dias de transactions
 */
export async function registerConnectedItem(
  itemId: string,
): Promise<{ ok: true; connectionId: string } | { ok: false; error: string }> {
  try {
    const fid = await familyId();

    const item = await pluggyFetch<PluggyItem>(`/items/${itemId}`);
    const connId = genId("bnk");

    // Upsert connection
    await db
      .insert(schema.bankConnections)
      .values({
        id: connId,
        familyId: fid,
        pluggyItemId: itemId,
        institutionName: item.connector.name,
        institutionLogoUrl: item.connector.imageUrl ?? null,
        status: item.status === "UPDATED" ? "active" : "pending",
        lastSyncedAt: item.lastUpdatedAt ? new Date(item.lastUpdatedAt) : null,
      })
      .onConflictDoUpdate({
        target: schema.bankConnections.pluggyItemId,
        set: {
          familyId: fid,
          institutionName: item.connector.name,
          institutionLogoUrl: item.connector.imageUrl ?? null,
          status: item.status === "UPDATED" ? "active" : "pending",
          lastSyncedAt: item.lastUpdatedAt ? new Date(item.lastUpdatedAt) : null,
          lastError: null,
          updatedAt: new Date(),
        },
      });

    // Get the actual connection id (after upsert)
    const [conn] = await db
      .select({ id: schema.bankConnections.id })
      .from(schema.bankConnections)
      .where(eq(schema.bankConnections.pluggyItemId, itemId))
      .limit(1);
    const finalConnId = conn?.id ?? connId;

    // Sync accounts
    await syncAccountsForItem(itemId, finalConnId, fid);

    // Sync transactions (últimos 90 dias)
    await syncTransactionsForItem(itemId, finalConnId, fid);

    revalidatePath("/app/contas");
    revalidatePath("/app/transacoes");
    revalidatePath("/app");
    return { ok: true, connectionId: finalConnId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro" };
  }
}

async function syncAccountsForItem(
  itemId: string,
  connectionId: string,
  familyId: string,
): Promise<void> {
  const json = await pluggyFetch<{ results: PluggyAccount[] }>(
    `/accounts?itemId=${itemId}`,
  );
  for (const acc of json.results) {
    await db
      .insert(schema.bankAccounts)
      .values({
        id: genId("bac"),
        bankConnectionId: connectionId,
        familyId,
        pluggyAccountId: acc.id,
        nickname: acc.marketingName ?? acc.name,
        type: acc.subtype || acc.type,
        balanceCents: Math.round(acc.balance * 100),
        creditLimitCents: acc.creditData?.creditLimit
          ? Math.round(acc.creditData.creditLimit * 100)
          : null,
        currency: acc.currencyCode || "BRL",
        lastFour: acc.number?.slice(-4) ?? null,
      })
      .onConflictDoUpdate({
        target: schema.bankAccounts.pluggyAccountId,
        set: {
          nickname: acc.marketingName ?? acc.name,
          balanceCents: Math.round(acc.balance * 100),
          creditLimitCents: acc.creditData?.creditLimit
            ? Math.round(acc.creditData.creditLimit * 100)
            : null,
          updatedAt: new Date(),
        },
      });
  }
}

async function syncTransactionsForItem(
  itemId: string,
  connectionId: string,
  familyId: string,
): Promise<void> {
  // Lista accounts pra iterar
  const accs = await db
    .select()
    .from(schema.bankAccounts)
    .where(eq(schema.bankAccounts.bankConnectionId, connectionId));

  const since = new Date();
  since.setDate(since.getDate() - 90);
  const sinceIso = since.toISOString().slice(0, 10);

  for (const acc of accs) {
    let page = 1;
    while (true) {
      const json = await pluggyFetch<{
        results: PluggyTransaction[];
        total: number;
        totalPages: number;
      }>(
        `/transactions?accountId=${acc.pluggyAccountId}&from=${sinceIso}&page=${page}&pageSize=200`,
      );
      for (const t of json.results) {
        const isIncome = t.type === "CREDIT" || t.amount > 0;
        await db
          .insert(schema.transactions)
          .values({
            id: genId("tx"),
            familyId,
            type: isIncome ? "income" : "expense",
            amountCents: Math.round(Math.abs(t.amount) * 100),
            currency: "BRL",
            description: t.description,
            occurredAt: new Date(t.date),
            origin: "bank",
            status: "confirmed",
            bankConnectionId: connectionId,
            bankTransactionExternalId: t.id,
          })
          .onConflictDoNothing();
      }
      if (page >= json.totalPages) break;
      page++;
    }
  }

  // Atualiza last_synced_at da connection
  await db
    .update(schema.bankConnections)
    .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.bankConnections.id, connectionId));
}

/** Sync manual de uma conexão existente. */
export async function syncBankConnection(
  connectionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const fid = await familyId();
    const [conn] = await db
      .select()
      .from(schema.bankConnections)
      .where(
        and(
          eq(schema.bankConnections.id, connectionId),
          eq(schema.bankConnections.familyId, fid),
        ),
      )
      .limit(1);
    if (!conn) return { ok: false, error: "Conexão não encontrada." };

    await syncAccountsForItem(conn.pluggyItemId, conn.id, fid);
    await syncTransactionsForItem(conn.pluggyItemId, conn.id, fid);
    revalidatePath("/app/contas");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro" };
  }
}

export async function disconnectBank(
  connectionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const fid = await familyId();
    const [conn] = await db
      .select()
      .from(schema.bankConnections)
      .where(
        and(
          eq(schema.bankConnections.id, connectionId),
          eq(schema.bankConnections.familyId, fid),
        ),
      )
      .limit(1);
    if (!conn) return { ok: false, error: "Conexão não encontrada." };

    // Tenta apagar no Pluggy também (best-effort)
    try {
      await pluggyFetch(`/items/${conn.pluggyItemId}`, { method: "DELETE" });
    } catch {
      // ok, prosseguir
    }

    await db.delete(schema.bankConnections).where(eq(schema.bankConnections.id, connectionId));
    revalidatePath("/app/contas");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro" };
  }
}

export type BankView = {
  id: string;
  pluggyItemId: string;
  institutionName: string;
  institutionLogoUrl: string | null;
  status: string;
  lastSyncedAt: string | null;
  lastError: string | null;
  accounts: Array<{
    id: string;
    nickname: string | null;
    type: string;
    balanceCents: number | null;
    creditLimitCents: number | null;
    lastFour: string | null;
  }>;
};

export async function listConnectedBanks(): Promise<BankView[]> {
  const fid = await familyId();
  const conns = await db
    .select()
    .from(schema.bankConnections)
    .where(eq(schema.bankConnections.familyId, fid));
  const accs = conns.length
    ? await db
        .select()
        .from(schema.bankAccounts)
        .where(eq(schema.bankAccounts.familyId, fid))
    : [];

  return conns.map((c) => ({
    id: c.id,
    pluggyItemId: c.pluggyItemId,
    institutionName: c.institutionName,
    institutionLogoUrl: c.institutionLogoUrl,
    status: c.status,
    lastSyncedAt: c.lastSyncedAt?.toISOString() ?? null,
    lastError: c.lastError,
    accounts: accs
      .filter((a) => a.bankConnectionId === c.id)
      .map((a) => ({
        id: a.id,
        nickname: a.nickname,
        type: a.type,
        balanceCents: a.balanceCents != null ? Number(a.balanceCents) : null,
        creditLimitCents: a.creditLimitCents != null ? Number(a.creditLimitCents) : null,
        lastFour: a.lastFour,
      })),
  }));
}
