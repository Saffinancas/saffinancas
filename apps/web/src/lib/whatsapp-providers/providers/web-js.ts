import type { WhatsappProvider } from "../types";

/**
 * Adapter para whatsapp-web.js operando no MODELO SAF GLOBAL — 1 número Saf
 * pareado no worker entra em todos os grupos das famílias. Cada família vê só:
 *  - o número Saf pra salvar e adicionar no grupo
 *  - um linkCode de 6 caracteres pra mandar no grupo (`vincular ABC123`)
 *
 * Comportamento de UI igual aos providers webhook (Twilio/Meta), mas a captura
 * acontece pelo whatsapp-web.js no worker — pareamento operacional do chip
 * Saf é feito em /admin/integracoes/whatsapp/saf-session.
 */

const WORKER_URL = process.env.WHATSAPP_WORKER_URL ?? "";
const WORKER_SECRET = process.env.WHATSAPP_WORKER_SECRET ?? "";

export const webJsProvider: WhatsappProvider = {
  id: "web_js",
  capabilities: {
    supportsGroups: true,
    // Modelo Saf global: cliente final NUNCA pareia. Só o admin pareia o chip
    // Saf uma vez na vida do produto.
    needsQrPairing: false,
    receivesViaWebhook: true,
    canSendMessages: true,
    pairingInstructions:
      "Salve o número Saf no celular, adicione no grupo da família e mande `vincular CODIGO` lá no grupo. Pronto — todo gasto vira transação.",
  },
  async sendMessage({ to, body }) {
    if (!WORKER_URL || !WORKER_SECRET) {
      throw new Error("Worker não configurado — WHATSAPP_WORKER_URL/SECRET ausentes.");
    }
    const res = await fetch(`${WORKER_URL.replace(/\/$/, "")}/saf-session/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WORKER_SECRET}`,
      },
      body: JSON.stringify({ to, body }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Worker /saf-session/send ${res.status}: ${t.slice(0, 200)}`);
    }
  },
  async getBotIdentifier() {
    if (!WORKER_URL || !WORKER_SECRET) return null;
    try {
      const res = await fetch(`${WORKER_URL.replace(/\/$/, "")}/saf-session/status`, {
        headers: { Authorization: `Bearer ${WORKER_SECRET}` },
        cache: "no-store",
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { pairedPhone?: string | null };
      return data.pairedPhone ?? null;
    } catch {
      return null;
    }
  },
};
