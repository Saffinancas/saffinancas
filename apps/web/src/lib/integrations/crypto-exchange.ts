"use server";

/**
 * Adapters de exchanges de cripto — STUBS.
 *
 * Implementação real (read-only via API key do usuário, armazenada criptografada
 * via `@/lib/crypto`):
 *
 *  - **Binance**: GET https://api.binance.com/api/v3/account
 *    Cabeçalho HMAC SHA256 com a chave secreta. Retorna saldos por moeda.
 *  - **Mercado Bitcoin**: GET https://api.mercadobitcoin.net/api/v4/accounts
 *    Auth via OAuth2 client_credentials. Retorna posições.
 *  - **Coinbase**: GET https://api.coinbase.com/v2/accounts (legacy)
 *    OR Coinbase Advanced Trade API. Cabeçalho CB-ACCESS-*.
 *  - **Foxbit**: GET https://api.foxbit.com.br/v3/me/balances
 *    Bearer token via OAuth2.
 *
 * Para self-custody (carteiras públicas):
 *  - Bitcoin: Blockstream Esplora API ou Mempool.space
 *  - Ethereum: Etherscan API (precisa de chave gratuita)
 *  - Solana: Solana RPC público
 *
 * Por ora, todas as funções são placeholders. UI usa CRUD manual.
 */

export type CryptoExchange =
  | "binance"
  | "mercadobitcoin"
  | "coinbase"
  | "foxbit"
  | "kraken"
  | "bitso"
  | "novadax";

export async function exchangeIntegrationStatus(
  exchange: CryptoExchange,
): Promise<{ configured: boolean; reason: string }> {
  const envMap: Partial<Record<CryptoExchange, string[]>> = {
    binance: ["BINANCE_API_KEY", "BINANCE_API_SECRET"],
    mercadobitcoin: ["MB_CLIENT_ID", "MB_CLIENT_SECRET"],
    coinbase: ["COINBASE_API_KEY", "COINBASE_API_SECRET"],
    foxbit: ["FOXBIT_API_KEY", "FOXBIT_API_SECRET"],
  };
  const needs = envMap[exchange];
  if (!needs) return { configured: false, reason: "Exchange ainda não suportada." };
  const missing = needs.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    return { configured: false, reason: `Faltam: ${missing.join(", ")}` };
  }
  return { configured: true, reason: "OK" };
}

export async function syncExchange(_exchange: CryptoExchange): Promise<{
  ok: false;
  error: string;
}> {
  // TODO Fase 4: chamada real à API da exchange + UPSERT em crypto_holdings.
  return {
    ok: false,
    error:
      "Integração real com exchanges entra na próxima fase. Por ora, registre manualmente seus saldos.",
  };
}
