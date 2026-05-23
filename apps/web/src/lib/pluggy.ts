"use server";

/**
 * Adapter Pluggy em **modo stub** — a UI já existe em /app/contas com mensagem
 * de "em breve". Este arquivo é o gancho para Fase 3.
 *
 * Quando você plugar PLUGGY_CLIENT_ID + PLUGGY_CLIENT_SECRET no .env:
 *  - createConnectToken: chama POST /connect_tokens da API do Pluggy.
 *  - listAccounts(itemId): lista contas vinculadas.
 *  - syncTransactions(itemId): puxa transações dos últimos 90 dias e enfileira
 *    pra classificação pelo @cofre/ai (deduplicação contra origin='whatsapp'
 *    via dedupHash).
 */

export async function pluggyMode(): Promise<"sim" | "real"> {
  const has = !!process.env.PLUGGY_CLIENT_ID && !!process.env.PLUGGY_CLIENT_SECRET;
  return has ? "real" : "sim";
}

export async function createConnectToken(): Promise<
  { ok: true; token: string } | { ok: false; error: string }
> {
  if ((await pluggyMode()) === "sim") {
    return {
      ok: false,
      error:
        "Pluggy ainda não configurado. Adicione PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no .env.",
    };
  }
  // TODO Fase 3.
  return { ok: false, error: "Integração real do Pluggy entra na Fase 3." };
}
