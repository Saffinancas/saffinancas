/**
 * Abstração de provider de WhatsApp.
 *
 * Cada provider implementa o mesmo contrato — admin escolhe o ativo via UI,
 * e a app/web e os webhooks roteiam para o provider correto.
 */

export type { WhatsappProviderId } from "./labels";
import type { WhatsappProviderId } from "./labels";

export type WhatsappCapabilities = {
  /** Suporta operar dentro de grupos (não só DM)? */
  supportsGroups: boolean;
  /** Precisa que o cliente escaneie QR Code? */
  needsQrPairing: boolean;
  /** Recebe mensagens via webhook HTTP? */
  receivesViaWebhook: boolean;
  /** Pode enviar mensagens (responder)? */
  canSendMessages: boolean;
  /** Texto curto pra UI explicar o que o cliente precisa fazer. */
  pairingInstructions: string;
};

export type IncomingMessage = {
  /** ID estável do provider pra dedup (ex: SmsSid, message wamid). */
  externalMessageId: string;
  /** ID do chat (DM número ou grupo). */
  externalChatId: string;
  /** Telefone do remetente em formato E.164 (+55...). */
  senderPhone: string;
  /** Nome do remetente se o provider mandar. */
  senderName: string | null;
  /** Texto da mensagem. */
  body: string;
  /** É mensagem de grupo? */
  isGroup: boolean;
  /** Nome do grupo se for grupo. */
  groupName: string | null;
  /** Timestamp do envio (ISO). */
  receivedAt: string;
  /** Tipo de mídia (audio, image, video) se houver. */
  mediaType: string | null;
  /** URL da mídia se houver (Twilio retorna URL pra baixar). */
  mediaUrl: string | null;
};

export type SendMessageInput = {
  to: string;
  /** Texto a enviar. */
  body: string;
};

export interface WhatsappProvider {
  readonly id: WhatsappProviderId;
  readonly capabilities: WhatsappCapabilities;

  /**
   * Manda mensagem de texto. Pode falhar silenciosamente em `sim` ou
   * lançar se credentials estão errados.
   */
  sendMessage(input: SendMessageInput): Promise<void>;

  /**
   * Retorna o número (ou identificador) que o cliente deve adicionar/contatar
   * pra vincular. Pra Twilio: `+14155238886` (sandbox) ou o número aprovado.
   * Pra Meta: o display_phone_number do WABA.
   */
  getBotIdentifier(): Promise<string | null>;
}
