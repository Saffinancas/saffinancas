import type { FiscalProvider, NFSeProviderAdapter } from "../types";
import { SimProvider } from "./sim";
import { FocusNfeProvider } from "./focus-nfe";
import { PlugNotasProvider } from "./plugnotas";
import { PBHDirectProvider } from "./pbh-direct";

/**
 * Factory que retorna o adapter certo baseado no provider escolhido pelo
 * perfil fiscal da família. Default: `sim` (simulador).
 *
 * Este módulo é **server-only** (usa node:crypto via providers/sim). Pra
 * labels client-safe, importe de `@/lib/fiscal/provider-meta`.
 */
export function getProviderAdapter(provider: FiscalProvider): NFSeProviderAdapter {
  switch (provider) {
    case "sim":
      return SimProvider;
    case "focus_nfe":
      return FocusNfeProvider;
    case "plugnotas":
      return PlugNotasProvider;
    case "pbh_direct":
      return PBHDirectProvider;
    case "enotas":
      return SimProvider; // TODO: implementar adapter eNotas
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Unknown NFSe provider: ${String(_exhaustive)}`);
    }
  }
}

export { PROVIDER_LABEL, PROVIDER_DESCRIPTION } from "../provider-meta";
