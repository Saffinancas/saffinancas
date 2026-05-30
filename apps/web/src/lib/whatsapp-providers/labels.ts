/**
 * Constantes e tipos seguros pra usar em client components.
 * Não importa nada do servidor (db, crypto, etc).
 */

export type WhatsappProviderId =
  | "sim"
  | "web_js"
  | "twilio_sandbox"
  | "twilio_production"
  | "meta_cloud";

export const PROVIDER_LABELS: Record<WhatsappProviderId, string> = {
  sim: "Simulado (dev only)",
  web_js: "WhatsApp Web (whatsapp-web.js)",
  twilio_sandbox: "Twilio Sandbox (DM 1:1)",
  twilio_production: "Twilio Produção",
  meta_cloud: "Meta WhatsApp Cloud API",
};
