/**
 * Labels e descrições dos providers — safe pra importar no client.
 * Os módulos `providers/*.ts` usam `node:crypto` e só rodam no server.
 */
import type { FiscalProvider } from "./types";

export const PROVIDER_LABEL: Record<FiscalProvider, string> = {
  sim: "Simulador (dev)",
  pbh_direct: "PBH direto (BHISSDigital)",
  focus_nfe: "Focus NFe",
  plugnotas: "PlugNotas",
  enotas: "eNotas",
};

export const PROVIDER_DESCRIPTION: Record<FiscalProvider, string> = {
  sim: "Emissão fake sempre OK. Útil pra dev/demo enquanto não pluga provider real.",
  pbh_direct: "SOAP direto na PBH. Sem custo por nota, mas exige certificado A1.",
  focus_nfe: "Gateway pago (~R$ 0,30/nota). Cobre maioria das prefeituras BR.",
  plugnotas: "Gateway pago (~R$ 0,40/nota). 5.500+ municípios.",
  enotas: "Gateway pago. Foco em integrações ERP.",
};
