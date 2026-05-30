import type { WhatsappProvider } from "../types";

export const simProvider: WhatsappProvider = {
  id: "sim",
  capabilities: {
    supportsGroups: true,
    needsQrPairing: false,
    receivesViaWebhook: false,
    canSendMessages: false,
    pairingInstructions:
      "Modo simulado: nada acontece no WhatsApp real. Use pra demos e dev.",
  },
  async sendMessage() {
    // no-op
  },
  async getBotIdentifier() {
    return "+55 11 9XXXX-XXXX (simulado)";
  },
};
