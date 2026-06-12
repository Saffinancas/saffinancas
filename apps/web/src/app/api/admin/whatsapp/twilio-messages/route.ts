import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getPlatformSetting } from "@/lib/platform-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lista últimas mensagens via Twilio API com status de entrega. Pra debugar
 * quando outbound retorna OK mas mensagem não chega no celular.
 */
export async function GET(): Promise<Response> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const [sid, token] = await Promise.all([
    getPlatformSetting("whatsapp.twilio.account_sid"),
    getPlatformSetting("whatsapp.twilio.auth_token"),
  ]);
  if (!sid || !token) {
    return NextResponse.json({ error: "Twilio não configurado" }, { status: 400 });
  }

  const authHeader = "Basic " + Buffer.from(`${sid}:${token}`).toString("base64");
  const r = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json?PageSize=15`,
    { headers: { Authorization: authHeader }, cache: "no-store" },
  );
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    return NextResponse.json(
      { error: `Twilio ${r.status}: ${text.slice(0, 300)}` },
      { status: 502 },
    );
  }
  const data = (await r.json()) as {
    messages: Array<{
      sid: string;
      from: string;
      to: string;
      body: string;
      status: string;
      error_code: number | null;
      error_message: string | null;
      date_sent: string;
      date_created: string;
      direction: string;
    }>;
  };
  return NextResponse.json({
    messages: data.messages.map((m) => ({
      sid: m.sid,
      direction: m.direction,
      from: m.from,
      to: m.to,
      body: m.body?.slice(0, 80),
      status: m.status,
      errorCode: m.error_code,
      errorMessage: m.error_message,
      dateSent: m.date_sent,
      dateCreated: m.date_created,
    })),
  });
}
