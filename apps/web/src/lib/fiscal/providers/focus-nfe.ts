/**
 * Adapter Focus NFe (focusnfe.com.br) — STUB documentado.
 *
 * Focus NFe é um gateway pago (R$ 0,30/nota) que abstrai a maioria das
 * prefeituras brasileiras. REST simples, ideal pra MVP.
 *
 * Auth: Basic com token (`FOCUSNFE_TOKEN`).
 * Ambiente: production usa https://api.focusnfe.com.br, homologação usa
 * https://homologacao.focusnfe.com.br.
 *
 * Fluxo de emissão:
 *  1. POST /v2/nfse?ref=<rps-numero> { ... } — assíncrono, retorna 202
 *  2. GET  /v2/nfse/<ref> — polling até `status === 'autorizado'`
 *  3. GET  /v2/nfse/<ref>.pdf — DANFE
 *  4. GET  /v2/nfse/<ref>.xml — XML assinado
 *
 * Cancelamento: DELETE /v2/nfse/<ref>
 *
 * Pra plugar de verdade, basta substituir o `throw` por chamadas `fetch`
 * usando `process.env.FOCUSNFE_TOKEN` e `process.env.FOCUSNFE_ENV`.
 */
import type { InvoiceRequest, InvoiceResult, NFSeProviderAdapter } from "../types";

const BASE_URL = (env: "homologacao" | "producao") =>
  env === "producao" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";

function isConfigured(): boolean {
  return !!process.env.FOCUSNFE_TOKEN;
}

export const FocusNfeProvider: NFSeProviderAdapter = {
  id: "focus_nfe",

  async issue(_req: InvoiceRequest): Promise<InvoiceResult> {
    if (!isConfigured()) {
      return {
        ok: false,
        error: {
          code: "PROVIDER_NOT_CONFIGURED",
          message:
            "Focus NFe não configurado. Adicione FOCUSNFE_TOKEN no .env e refaça deploy.",
          retriable: false,
        },
      };
    }
    // TODO: POST /v2/nfse?ref=...
    // Mapping: req.service.code → Focus "codigo_tributario_municipio"
    //          req.service.issRateBps / 10000 → "aliquota"
    //          req.recipient → "tomador"
    //          req.provider → automaticamente do account
    void BASE_URL;
    return {
      ok: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Adapter Focus NFe ainda não implementado. Plug-in real em Fase 5.",
        retriable: false,
      },
    };
  },

  async cancel(_opts) {
    return { ok: false, error: "Focus NFe cancel ainda não implementado." };
  },
};
