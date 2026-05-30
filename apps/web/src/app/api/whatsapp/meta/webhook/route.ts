import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getActiveProvider, getActiveProviderId } from "@/lib/whatsapp-providers";
import { parseMetaWebhook } from "@/lib/whatsapp-providers/providers/meta-cloud";
import { handleIncomingMessage } from "@/lib/whatsapp-providers/inbound";
import { getPlatformSetting } from "@/lib/platform-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET — Meta faz challenge handshake quando você configura o webhook.
 * Eles mandam `hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`.
 * Devolvemos o `hub.challenge` se o verify_token bater com o nosso.
 */
export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe") {
    return new NextResponse("forbidden", { status: 403 });
  }
  const expected = await getPlatformSetting("whatsapp.meta.verify_token");
  if (!expected || token !== expected) {
    return new NextResponse("forbidden", { status: 403 });
  }
  return new NextResponse(challenge ?? "", { status: 200 });
}

/**
 * Meta assina cada webhook com HMAC-SHA256 do app_secret.
 * Header: `X-Hub-Signature-256: sha256=<hex>`.
 */
async function isValidMetaSignature(
  req: Request,
  rawBody: string,
): Promise<boolean> {
  const signature = req.headers.get("x-hub-signature-256");
  if (!signature) return false;
  const appSecret = await getPlatformSetting("whatsapp.meta.app_secret");
  if (!appSecret) return false;

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(req: Request): Promise<Response> {
  const rawBody = await req.text();

  const providerId = await getActiveProviderId();
  if (providerId !== "meta_cloud") {
    return NextResponse.json({ error: "provider_not_active" }, { status: 400 });
  }

  const valid = await isValidMetaSignature(req, rawBody);
  if (!valid) {
    // Meta exige 200 mesmo em erro pra não desabilitar o webhook. Loga e dropa.
    console.warn("[meta webhook] assinatura inválida — dropping");
    return new NextResponse("", { status: 200 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("", { status: 200 });
  }

  const incoming = parseMetaWebhook(payload);
  if (!incoming) {
    // Pode ser um status update (delivered, read) — só ack
    return new NextResponse("", { status: 200 });
  }

  const provider = await getActiveProvider();
  try {
    await handleIncomingMessage(incoming, providerId, provider);
  } catch (err) {
    console.error("[meta webhook] handleIncomingMessage failed", err);
  }
  return new NextResponse("", { status: 200 });
}
