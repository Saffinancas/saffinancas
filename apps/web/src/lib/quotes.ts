"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";

/**
 * Cotações de mercado via APIs gratuitas:
 *
 *  - **B3** (ações, FIIs, ETFs): Brapi.dev — https://brapi.dev/api/quote/PETR4
 *    Tier gratuito ~30 req/min, sem auth pra cotações básicas em BRL.
 *
 *  - **Cripto**: CoinGecko — https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl
 *    Tier gratuito ~30 req/min, sem auth.
 *
 * Ambas falham silenciosamente — se algum ticker não for encontrado, mantém o
 * preço anterior. Cotações de renda fixa (CDB, Tesouro) NÃO são suportadas pela
 * Brapi free; pra essas, sincronização real só via Pluggy.
 */

async function requireFamily(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado.");
  const u = session.user as { familyId?: string | null };
  if (!u.familyId) throw new Error("Sem família.");
  return u.familyId;
}

// ----------------------------------------------------------------------------
// B3 via Brapi.dev
// ----------------------------------------------------------------------------

type BrapiResult = {
  symbol: string;
  regularMarketPrice?: number;
  longName?: string;
};

async function fetchBrapi(tickers: string[]): Promise<Map<string, number>> {
  if (tickers.length === 0) return new Map();
  // Brapi aceita lote de tickers separados por vírgula. Limita a 20 por request.
  const map = new Map<string, number>();
  for (let i = 0; i < tickers.length; i += 20) {
    const batch = tickers.slice(i, i + 20).join(",");
    try {
      const url = `https://brapi.dev/api/quote/${batch}?fundamental=false`;
      const res = await fetch(url, {
        next: { revalidate: 0 },
        headers: { "User-Agent": "saf-financas/1.0" },
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { results?: BrapiResult[] };
      for (const r of json.results ?? []) {
        if (r.regularMarketPrice && r.regularMarketPrice > 0) {
          map.set(r.symbol.toUpperCase(), r.regularMarketPrice);
        }
      }
    } catch {
      // ignora batch que falhou
    }
  }
  return map;
}

export type RefreshResult = {
  ok: boolean;
  updated: number;
  failed: string[];
  source: "brapi" | "coingecko";
};

export async function refreshB3Quotes(): Promise<RefreshResult> {
  const familyId = await requireFamily();
  const rows = await db
    .select({ id: schema.holdings.id, ticker: schema.holdings.ticker })
    .from(schema.holdings)
    .where(
      and(eq(schema.holdings.familyId, familyId), sql`${schema.holdings.deletedAt} is null`),
    );

  if (rows.length === 0) return { ok: true, updated: 0, failed: [], source: "brapi" };

  const tickers = rows.map((r) => r.ticker.toUpperCase());
  const prices = await fetchBrapi(tickers);

  let updated = 0;
  const failed: string[] = [];
  const now = new Date();

  for (const r of rows) {
    const price = prices.get(r.ticker.toUpperCase());
    if (price == null) {
      failed.push(r.ticker);
      continue;
    }
    await db
      .update(schema.holdings)
      .set({
        currentPriceCents: Math.round(price * 100),
        lastSyncedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.holdings.id, r.id));
    updated++;
  }

  revalidatePath("/app/investimentos");
  revalidatePath("/app/investimentos/b3");
  revalidatePath("/app/imposto-de-renda");
  return { ok: true, updated, failed, source: "brapi" };
}

// ----------------------------------------------------------------------------
// Cripto via CoinGecko
// ----------------------------------------------------------------------------

/** Mapeia símbolo → ID da CoinGecko. Adicionar novos conforme demanda. */
const COIN_GECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  USDC: "usd-coin",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  MATIC: "matic-network",
  LINK: "chainlink",
  TRX: "tron",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
  ATOM: "cosmos",
  XLM: "stellar",
  NEAR: "near",
  ALGO: "algorand",
};

async function fetchCoinGecko(symbols: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const ids = symbols
    .map((s) => COIN_GECKO_IDS[s.toUpperCase()])
    .filter(Boolean) as string[];
  if (ids.length === 0) return map;

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=brl`;
    const res = await fetch(url, {
      next: { revalidate: 0 },
      headers: { "User-Agent": "saf-financas/1.0" },
    });
    if (!res.ok) return map;
    const json = (await res.json()) as Record<string, { brl?: number }>;
    for (const sym of symbols) {
      const id = COIN_GECKO_IDS[sym.toUpperCase()];
      if (!id) continue;
      const brl = json[id]?.brl;
      if (brl && brl > 0) map.set(sym.toUpperCase(), brl);
    }
  } catch {
    // silent
  }
  return map;
}

export async function refreshCryptoQuotes(): Promise<RefreshResult> {
  const familyId = await requireFamily();
  const rows = await db
    .select({ id: schema.cryptoHoldings.id, symbol: schema.cryptoHoldings.symbol })
    .from(schema.cryptoHoldings)
    .where(
      and(
        eq(schema.cryptoHoldings.familyId, familyId),
        sql`${schema.cryptoHoldings.deletedAt} is null`,
      ),
    );

  if (rows.length === 0) return { ok: true, updated: 0, failed: [], source: "coingecko" };

  const symbols = Array.from(new Set(rows.map((r) => r.symbol.toUpperCase())));
  const prices = await fetchCoinGecko(symbols);

  let updated = 0;
  const failed: string[] = [];
  const now = new Date();

  for (const r of rows) {
    const price = prices.get(r.symbol.toUpperCase());
    if (price == null) {
      failed.push(r.symbol);
      continue;
    }
    await db
      .update(schema.cryptoHoldings)
      .set({
        currentPriceCents: Math.round(price * 100),
        lastSyncedAt: now,
        updatedAt: now,
      })
      .where(eq(schema.cryptoHoldings.id, r.id));
    updated++;
  }

  revalidatePath("/app/investimentos");
  revalidatePath("/app/investimentos/cripto");
  revalidatePath("/app/imposto-de-renda");
  return { ok: true, updated, failed, source: "coingecko" };
}
