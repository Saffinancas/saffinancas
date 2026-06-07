import type { WhatsappProvider, WhatsappProviderId, SendMessageInput, IncomingMessage } from "../types";
import { getPlatformSetting } from "@/lib/platform-settings";

/**
 * Twilio WhatsApp adapter.
 *
 * Sandbox: número fixo `whatsapp:+14155238886`, cliente precisa enviar
 * `join <code>` antes. NÃO suporta grupos.
 *
 * Produção: número aprovado pela Meta. Suporta grupos.
 *
 * Os dois compartilham 100% do código — só diferem em qual flag a UI mostra
 * e em capabilities.supportsGroups.
 */

const API_BASE = "https://api.twilio.com/2010-04-01";

async function getCredentials(): Promise<{ sid: string; token: string; from: string }> {
  const [sid, token, from] = await Promise.all([
    getPlatformSetting("whatsapp.twilio.account_sid"),
    getPlatformSetting("whatsapp.twilio.auth_token"),
    getPlatformSetting("whatsapp.twilio.from"),
  ]);
  if (!sid || !token || !from) {
    throw new Error(
      "Twilio não configurado. Defina account_sid, auth_token e from em Admin → Integrações → WhatsApp.",
    );
  }
  return { sid, token, from };
}

async function twilioSend({ to, body }: SendMessageInput): Promise<void> {
  const { sid, token, from } = await getCredentials();
  const url = `${API_BASE}/Accounts/${sid}/Messages.json`;
  const params = new URLSearchParams();
  params.set("From", from);
  // Twilio espera o `whatsapp:` prefix em ambos
  params.set("To", to.startsWith("whatsapp:") ? to : `whatsapp:${to}`);
  params.set("Body", body);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Twilio retornou ${res.status}: ${text}`);
  }
}

async function botIdentifier(): Promise<string> {
  const from = await getPlatformSetting("whatsapp.twilio.from");
  // "whatsapp:+14155238886" → "+14155238886"
  return from?.replace(/^whatsapp:/, "") ?? "(não configurado)";
}

export const twilioSandboxProvider: WhatsappProvider = {
  id: "twilio_sandbox",
  capabilities: {
    supportsGroups: false,
    needsQrPairing: false,
    receivesViaWebhook: true,
    canSendMessages: true,
    pairingInstructions:
      "Mande um WhatsApp pro número da Saf com o código `join <palavras>` que o Twilio mostra na console. Depois envie o código de vinculação que aparece aqui.",
  },
  sendMessage: twilioSend,
  getBotIdentifier: botIdentifier,
};

export const twilioProductionProvider: WhatsappProvider = {
  id: "twilio_production",
  capabilities: {
    // Twilio WhatsApp Business API NÃO suporta grupos (limitação da Twilio).
    // Pra capturar mensagens de grupo da família, use o provider `web_js`.
    supportsGroups: false,
    needsQrPairing: false,
    receivesViaWebhook: true,
    canSendMessages: true,
    pairingInstructions:
      "Mande WhatsApp pro número Saf com `vincular <CÓDIGO>`. O Twilio só suporta DM 1:1 — pra grupos use o provider WhatsApp Web.",
  },
  sendMessage: twilioSend,
  getBotIdentifier: botIdentifier,
};

/**
 * Parser do webhook Twilio. Twilio manda `application/x-www-form-urlencoded`.
 * Campos relevantes:
 *   - MessageSid: ID único
 *   - From: "whatsapp:+5511..."
 *   - To: "whatsapp:+14155238886"
 *   - Body: texto
 *   - ProfileName: nome do remetente
 *   - NumMedia: "0" ou "1+"
 *   - MediaUrl0, MediaContentType0: se NumMedia > 0
 *
 * Twilio NÃO manda group_id explicitamente — pra DM, `From` é o chat_id.
 * Pra grupos (prod), `From` ainda é o número da pessoa, mas tem
 * `WaId` ou outro indicador. Pro MVP, tratamos tudo como DM se sandbox,
 * e grupos quando vier (a confirmar no payload real).
 */
export function parseTwilioWebhook(form: URLSearchParams, providerId: WhatsappProviderId): IncomingMessage {
  const from = form.get("From") ?? "";
  const senderPhone = from.replace(/^whatsapp:/, "");
  const numMedia = parseInt(form.get("NumMedia") ?? "0", 10);

  return {
    externalMessageId: form.get("MessageSid") ?? "",
    // Em sandbox/DM, chatId = senderPhone. Em grupos (prod), Twilio pode
    // enviar GroupSid futuramente — por enquanto agrupamos por From.
    externalChatId: senderPhone,
    senderPhone,
    senderName: form.get("ProfileName") ?? null,
    body: form.get("Body") ?? "",
    isGroup: providerId === "twilio_production" && !!form.get("GroupSid"),
    groupName: form.get("GroupName") ?? null,
    receivedAt: new Date().toISOString(),
    mediaType: numMedia > 0 ? form.get("MediaContentType0") : null,
    mediaUrl: numMedia > 0 ? form.get("MediaUrl0") : null,
  };
}
