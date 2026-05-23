/**
 * Adapter PlugNotas (plugnotas.com.br) — STUB documentado.
 *
 * PlugNotas cobre 5.500+ municípios via REST. Auth via X-API-KEY header.
 *
 * Fluxo:
 *  - POST https://api.plugnotas.com.br/nfse { ... }  (sync ou async)
 *  - GET  https://api.plugnotas.com.br/nfse/{id}    (consulta)
 *  - GET  https://api.plugnotas.com.br/nfse/{id}/pdf  (DANFE)
 *  - GET  https://api.plugnotas.com.br/nfse/{id}/xml  (XML)
 *  - POST https://api.plugnotas.com.br/nfse/{id}/cancelamento  (cancel)
 *
 * O PlugNotas exige cadastro prévio do CNPJ emissor via POST /empresa.
 *
 * Reference: https://docs.plugnotas.com.br/reference/nfse
 */
import type { InvoiceRequest, InvoiceResult, NFSeProviderAdapter } from "../types";

function isConfigured(): boolean {
  return !!process.env.PLUGNOTAS_API_KEY;
}

export const PlugNotasProvider: NFSeProviderAdapter = {
  id: "plugnotas",

  async issue(_req: InvoiceRequest): Promise<InvoiceResult> {
    if (!isConfigured()) {
      return {
        ok: false,
        error: {
          code: "PROVIDER_NOT_CONFIGURED",
          message:
            "PlugNotas não configurado. Adicione PLUGNOTAS_API_KEY no .env e cadastre a empresa via /empresa antes da primeira emissão.",
          retriable: false,
        },
      };
    }
    return {
      ok: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Adapter PlugNotas ainda não implementado. Plug-in real em Fase 5.",
        retriable: false,
      },
    };
  },

  async cancel(_opts) {
    return { ok: false, error: "PlugNotas cancel ainda não implementado." };
  },
};
