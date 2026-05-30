import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getActiveProvider, getActiveProviderId } from "@/lib/whatsapp-providers";
import { parseTwilioWebhook } from "@/lib/whatsapp-providers/providers/twilio";
import { handleIncomingMessage } from "@/lib/whatsapp-providers/inbound";
import { getPlatformSetting } from "@/lib/platform-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Twilio assina cada webhook com HMAC-SHA1 do auth_token sobre URL + params.
 * Header: `X-Twilio-Signature`.
 * Docs: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
async function isValidTwilioSignature(
  req: Request,
  rawBody: string,
): Promise<boolean> {
  const signature = req.headers.get("x-twilio-signature");
  if (!signature) return false;
  const token = await getPlatformSetting("whatsapp.twilio.auth_token");
  if (!token) return false;

  // Twilio: HMAC = base64(HMAC-SHA1(token, url + sorted_params_concat))
  const url = req.url;
  const params = new URLSearchParams(rawBody);
  const sortedKeys = Array.from(params.keys()).sort();
  const concat = url + sortedKeys.map((k) => k + (params.get(k) ?? "")).join("");
  const expected = crypto.createHmac("sha1", token).update(concat).digest("base64");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request): Promise<Response> {
  const rawBody = await req.text();

  const providerId = await getActiveProviderId();
  if (providerId !== "twilio_sandbox" && providerId !== "twilio_production") {
    return NextResponse.json({ error: "provider_not_active" }, { status: 400 });
  }

  // Validação HMAC — em produção, sempre exigir. Em sandbox de teste, log + segue.
  const valid = await isValidTwilioSignature(req, rawBody);
  if (!valid && providerId === "twilio_production") {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }
  if (!valid) {
    console.warn("[twilio webhook] assinatura inválida — aceita por estar em sandbox");
  }

  const params = new URLSearchParams(rawBody);
  const incoming = parseTwilioWebhook(params, providerId);

  if (!incoming.body && !incoming.mediaUrl) {
    return new NextResponse("", { status: 200 });
  }

  const provider = await getActiveProvider();
  try {
    await handleIncomingMessage(incoming, providerId, provider);
  } catch (err) {
    console.error("[twilio webhook] handleIncomingMessage failed", err);
  }

  // Twilio precisa de 200 senão fica retentando — TwiML vazio = ack sem responder
  return new NextResponse("<Response/>", {
    status: 200,
    headers: { "Content-Type": "application/xml" },
  });
}
