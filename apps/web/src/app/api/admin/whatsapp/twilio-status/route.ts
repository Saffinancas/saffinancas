import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getPlatformSetting } from "@/lib/platform-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Consulta direto na API Twilio:
 *   1. /Accounts/{sid}/IncomingPhoneNumbers.json — números provisionados na conta
 *   2. messaging.twilio.com/v2/Channels/Senders — WhatsApp Senders (status real)
 *
 * Devolve um diagnóstico legível.
 */
export async function GET(): Promise<Response> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const [sid, token, configuredFrom] = await Promise.all([
    getPlatformSetting("whatsapp.twilio.account_sid"),
    getPlatformSetting("whatsapp.twilio.auth_token"),
    getPlatformSetting("whatsapp.twilio.from"),
  ]);
  if (!sid || !token) {
    return NextResponse.json({ error: "Twilio não configurado." }, { status: 400 });
  }

  const authHeader = "Basic " + Buffer.from(`${sid}:${token}`).toString("base64");

  // 1. Phone numbers na conta
  let phoneNumbers: unknown = null;
  let phoneNumbersError: string | null = null;
  try {
    const r = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/IncomingPhoneNumbers.json`,
      { headers: { Authorization: authHeader } },
    );
    const j = await r.json();
    phoneNumbers = r.ok ? j : null;
    if (!r.ok) phoneNumbersError = `${r.status}: ${JSON.stringify(j)}`;
  } catch (e) {
    phoneNumbersError = e instanceof Error ? e.message : String(e);
  }

  // 2. WhatsApp Senders v2
  let senders: unknown = null;
  let sendersError: string | null = null;
  try {
    const r = await fetch("https://messaging.twilio.com/v2/Channels/Senders", {
      headers: { Authorization: authHeader },
    });
    const j = await r.json();
    senders = r.ok ? j : null;
    if (!r.ok) sendersError = `${r.status}: ${JSON.stringify(j)}`;
  } catch (e) {
    sendersError = e instanceof Error ? e.message : String(e);
  }

  // 3. Fallback v1 (formato mais antigo)
  let sendersV1: unknown = null;
  if (!senders) {
    try {
      const r = await fetch("https://messaging.twilio.com/v1/Senders", {
        headers: { Authorization: authHeader },
      });
      if (r.ok) sendersV1 = await r.json();
    } catch {
      // ignore
    }
  }

  return NextResponse.json({
    accountSid: sid.slice(0, 6) + "..." + sid.slice(-4),
    configuredFrom,
    phoneNumbers,
    phoneNumbersError,
    senders,
    sendersError,
    sendersV1,
  });
}
