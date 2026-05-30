import type { WhatsappProvider, SendMessageInput, IncomingMessage } from "../types";
import { getPlatformSetting } from "@/lib/platform-settings";

/**
 * Meta WhatsApp Cloud API adapter.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Setup (admin faz uma vez):
 *  1. Cria conta Meta Business Manager
 *  2. Cria WhatsApp Business Account (WABA)
 *  3. Adiciona número (pode usar o de teste gratuito da Meta inicialmente)
 *  4. Pega: phone_number_id, access_token, verify_token (criado por você)
 *  5. Configura webhook na Meta apontando pra /api/whatsapp/meta/webhook
 *     com o verify_token
 */

const API_VERSION = "v21.0";
const API_BASE = `https://graph.facebook.com/${API_VERSION}`;

async function getCredentials(): Promise<{ phoneNumberId: string; accessToken: string }> {
  const [phoneNumberId, accessToken] = await Promise.all([
    getPlatformSetting("whatsapp.meta.phone_number_id"),
    getPlatformSetting("whatsapp.meta.access_token"),
  ]);
  if (!phoneNumberId || !accessToken) {
    throw new Error(
      "Meta Cloud API não configurada. Defina phone_number_id e access_token em Admin → Integrações → WhatsApp.",
    );
  }
  return { phoneNumberId, accessToken };
}

async function metaSend({ to, body }: SendMessageInput): Promise<void> {
  const { phoneNumberId, accessToken } = await getCredentials();
  const url = `${API_BASE}/${phoneNumberId}/messages`;
  // Meta espera o número sem `whatsapp:` e sem `+` (E.164 sem prefix)
  const normalized = to.replace(/^whatsapp:/, "").replace(/^\+/, "");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalized,
      type: "text",
      text: { body },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Meta Cloud retornou ${res.status}: ${text}`);
  }
}

async function botIdentifier(): Promise<string | null> {
  // O número fica no display_phone_number do WABA — mas Meta exige token pra
  // consultar. Pro MVP, admin guarda o display number como setting separado.
  return await getPlatformSetting("whatsapp.meta.display_number");
}

export const metaCloudProvider: WhatsappProvider = {
  id: "meta_cloud",
  capabilities: {
    supportsGroups: false, // Meta Cloud API ainda não suporta envio pra grupos
    needsQrPairing: false,
    receivesViaWebhook: true,
    canSendMessages: true,
    pairingInstructions:
      "Mande um WhatsApp pro número do Saf Bot com o código de vinculação que aparece aqui.",
  },
  sendMessage: metaSend,
  getBotIdentifier: botIdentifier,
};

/**
 * Parser do payload de webhook Meta. Estrutura:
 * {
 *   entry: [{
 *     changes: [{
 *       value: {
 *         messages: [{
 *           id, from, timestamp, type, text: { body }, ...
 *         }],
 *         contacts: [{ profile: { name }, wa_id }]
 *       }
 *     }]
 *   }]
 * }
 */
export function parseMetaWebhook(payload: unknown): IncomingMessage | null {
  try {
    const p = payload as {
      entry?: Array<{
        changes?: Array<{
          value?: {
            messages?: Array<{
              id: string;
              from: string;
              timestamp: string;
              type: string;
              text?: { body: string };
              image?: { id: string; mime_type: string };
              audio?: { id: string; mime_type: string };
            }>;
            contacts?: Array<{ profile?: { name: string }; wa_id: string }>;
          };
        }>;
      }>;
    };
    const change = p.entry?.[0]?.changes?.[0]?.value;
    const msg = change?.messages?.[0];
    if (!msg) return null;
    const contact = change?.contacts?.[0];
    const senderPhone = "+" + msg.from;

    return {
      externalMessageId: msg.id,
      externalChatId: senderPhone, // Meta DM = wa_id do user
      senderPhone,
      senderName: contact?.profile?.name ?? null,
      body: msg.text?.body ?? "",
      isGroup: false,
      groupName: null,
      receivedAt: new Date(parseInt(msg.timestamp, 10) * 1000).toISOString(),
      mediaType: msg.image?.mime_type ?? msg.audio?.mime_type ?? null,
      mediaUrl: null, // Meta retorna media id, precisa fetch separado
    };
  } catch {
    return null;
  }
}
