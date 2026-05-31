"use server";

/**
 * Pluggy Investments — usa o connect-token com `products: ['INVESTMENTS']` pra
 * abrir o widget já filtrado pra corretoras. O sync das posições acontece em
 * `pluggy.ts::syncInvestmentsForItem`, chamado automaticamente por
 * `registerConnectedItem` depois que o user conecta.
 *
 * Cobertura de corretoras (lista Pluggy): XP, Rico, Clear, BTG, NuInvest,
 * Inter Invest, Itaú, Bradesco, Warren, Modalmais.
 *
 * Reference: https://docs.pluggy.ai/docs/investments
 */
import { createConnectToken, pluggyMode } from "@/lib/pluggy";

export async function isPluggyConfigured(): Promise<boolean> {
  return (await pluggyMode()) === "real";
}

export async function createInvestmentConnectToken(): Promise<
  { ok: true; token: string } | { ok: false; error: string }
> {
  if (!(await isPluggyConfigured())) {
    return {
      ok: false,
      error: "Pluggy não configurado. Configure em Admin → Integrações.",
    };
  }
  return createConnectToken({ products: ["INVESTMENTS"] });
}
