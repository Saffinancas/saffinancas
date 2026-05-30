import type { WhatsappProvider } from "../types";

/**
 * Adapter para whatsapp-web.js (worker no Fly.io). Mantido por compat —
 * lógica de pair/listGroups continua em apps/web/src/lib/whatsapp.ts.
 *
 * No fluxo unificado, web_js NÃO recebe via webhook — o worker conecta no
 * banco diretamente. `sendMessage` aqui pode ser implementado depois se
 * quisermos que a IA responda no grupo.
 */
export const webJsProvider: WhatsappProvider = {
  id: "web_js",
  capabilities: {
    supportsGroups: true,
    needsQrPairing: true,
    receivesViaWebhook: false,
    canSendMessages: false,
    pairingInstructions:
      "Pareie o WhatsApp Web escaneando o QR. O bot fica conectado enquanto seu celular estiver online — pode precisar reescaniar a cada semanas.",
  },
  async sendMessage() {
    throw new Error("web_js.sendMessage não implementado — IA é silenciosa neste provider.");
  },
  async getBotIdentifier() {
    return null;
  },
};
