import type { WhatsappProvider } from "../types";

/**
 * Adapter para whatsapp-web.js operando no MODELO SAF GLOBAL — 1 número Saf
 * pareado no worker entra em todos os grupos das famílias. Cada família vê só:
 *  - o número Saf pra salvar e adicionar no grupo
 *  - um linkCode de 6 caracteres pra mandar no grupo (`vincular ABC123`)
 *
 * Pareamento operacional do chip Saf em /admin/integracoes/whatsapp/saf-session.
 *
 * IMPORTANTE: ler process.env DENTRO das funções (não no top-level) pra evitar
 * que valores fiquem cacheados em build-time num runtime onde a env ainda não
 * foi resolvida.
 */
function workerEnv() {
  const url = process.env.WHATSAPP_WORKER_URL ?? "";
  const secret = process.env.WHATSAPP_WORKER_SECRET ?? "";
  return { url, secret };
}

export const webJsProvider: WhatsappProvider = {
  id: "web_js",
  capabilities: {
    supportsGroups: true,
    needsQrPairing: false,
    receivesViaWebhook: true,
    canSendMessages: true,
    pairingInstructions:
      "Salve o número Saf no celular, adicione no grupo da família e mande `vincular CODIGO` lá no grupo. Pronto — todo gasto vira transação.",
  },
  async sendMessage({ to, body }) {
    const { url, secret } = workerEnv();
    if (!url || !secret) {
      throw new Error("Worker não configurado — WHATSAPP_WORKER_URL/SECRET ausentes.");
    }
    const res = await fetch(`${url.replace(/\/$/, "")}/saf-session/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ to, body }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Worker /saf-session/send ${res.status}: ${t.slice(0, 200)}`);
    }
  },
  async getBotIdentifier() {
    const { url, secret } = workerEnv();
    if (!url || !secret) {
      console.warn("[web-js] getBotIdentifier: WORKER_URL/SECRET ausentes em runtime");
      return null;
    }
    try {
      const res = await fetch(`${url.replace(/\/$/, "")}/saf-session/status`, {
        headers: { Authorization: `Bearer ${secret}` },
        cache: "no-store",
      });
      if (!res.ok) {
        console.warn(`[web-js] getBotIdentifier: /saf-session/status ${res.status}`);
        return null;
      }
      const data = (await res.json()) as { pairedPhone?: string | null };
      return data.pairedPhone ?? null;
    } catch (err) {
      console.warn("[web-js] getBotIdentifier fetch failed", err);
      return null;
    }
  },
};
