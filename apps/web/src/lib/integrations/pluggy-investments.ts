"use server";

/**
 * Pluggy Investments — adapter STUB.
 *
 * Quando você plugar `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET` no .env:
 *
 *  - createInvestmentConnectToken: chama POST /connect_tokens com escopo
 *    `INVESTMENTS` na API do Pluggy.
 *  - syncInvestments(itemId): puxa via GET /investments?itemId=... TODAS as
 *    posições (ações, FIIs, ETFs, renda fixa, fundos) de TODAS as corretoras
 *    conectadas e faz UPSERT em `holdings` (chave: family_id + ticker + brokerage).
 *  - syncDividends(itemId): GET /investments/{id}/transactions filtrando
 *    por type=DIVIDEND/JCP/RENT e gera registros em `dividends`. Cada um com
 *    status='received' e linkedTransactionId já criado.
 *
 * Cobertura de corretoras (lista oficial Pluggy):
 *   B3 via XP, Rico, Clear, BTG Pactual, NuInvest, Inter Invest, Itaú,
 *   Bradesco, Warren, Modalmais — cobre 95%+ do mercado retail BR.
 *
 * Reference: https://docs.pluggy.ai/docs/investments
 */
export async function isPluggyConfigured(): Promise<boolean> {
  return !!process.env.PLUGGY_CLIENT_ID && !!process.env.PLUGGY_CLIENT_SECRET;
}

export async function createInvestmentConnectToken(): Promise<
  { ok: true; token: string } | { ok: false; error: string }
> {
  if (!(await isPluggyConfigured())) {
    return {
      ok: false,
      error:
        "Pluggy não configurado. Adicione PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no .env",
    };
  }
  return {
    ok: false,
    error: "Integração real entra na Fase 3. Por ora, registre manualmente.",
  };
}
