/**
 * Helpers Pluggy sem dependência de session/headers.
 * Usados por webhooks e crons que não têm contexto de usuário.
 */

import { eq } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { getPlatformSetting } from "@/lib/platform-settings";
import { id as genId } from "@/lib/ids";

const API_BASE = "https://api.pluggy.ai";
let cachedApiKey: { key: string; expiresAt: number } | null = null;

async function getApiKey(): Promise<string> {
  if (cachedApiKey && cachedApiKey.expiresAt > Date.now() + 60_000) {
    return cachedApiKey.key;
  }
  const [clientId, clientSecret] = await Promise.all([
    getPlatformSetting("pluggy.client_id"),
    getPlatformSetting("pluggy.client_secret"),
  ]);
  if (!clientId || !clientSecret) throw new Error("Pluggy não configurado");

  const res = await fetch(`${API_BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  if (!res.ok) throw new Error(`Pluggy auth ${res.status}`);
  const json = (await res.json()) as { apiKey: string };
  cachedApiKey = { key: json.apiKey, expiresAt: Date.now() + 2 * 3600 * 1000 };
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
  });
  if (!res.ok) throw new Error(`Pluggy ${path} ${res.status}`);
  return (await res.json()) as T;
}

export async function syncBankConnectionInternal(
  connectionId: string,
  pluggyItemId: string,
  familyId: string,
): Promise<void> {
  // Sync accounts
  const accountsRes = await pluggyFetch<{
    results: Array<{
      id: string;
      type: string;
      subtype: string;
      name: string;
      marketingName?: string;
      number?: string;
      balance: number;
      currencyCode: string;
      creditData?: { creditLimit: number };
    }>;
  }>(`/accounts?itemId=${pluggyItemId}`);

  for (const acc of accountsRes.results) {
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
          updatedAt: new Date(),
        },
      });
  }

  // Sync transactions (últimos 90 dias)
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
        results: Array<{
          id: string;
          description: string;
          amount: number;
          date: string;
          type: "DEBIT" | "CREDIT";
        }>;
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

  await db
    .update(schema.bankConnections)
    .set({ lastSyncedAt: new Date(), updatedAt: new Date(), status: "active", lastError: null })
    .where(eq(schema.bankConnections.id, connectionId));
}
