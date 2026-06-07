import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getActiveProvider, getActiveProviderId } from "@/lib/whatsapp-providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Envio de teste outbound pelo provider WhatsApp ativo. Admin-only.
 *
 * Body: { to: "+5511..." | "whatsapp:+5511...", body?: string }
 * Resp: { ok: true, providerId, sentTo } | { ok: false, error }
 */
export async function POST(req: Request): Promise<Response> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let payload: { to?: string; body?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const to = payload.to?.trim();
  const body = payload.body?.trim() || "Teste do Saf Finanças — envio outbound ok.";

  if (!to || !/^(\+|whatsapp:\+)\d{10,15}$/.test(to)) {
    return NextResponse.json(
      { error: "to inválido — use +55XXYYYYYYYYY ou whatsapp:+55XXYYYYYYYYY" },
      { status: 400 },
    );
  }

  const providerId = await getActiveProviderId();
  const provider = await getActiveProvider();

  try {
    await provider.sendMessage({ to, body });
    return NextResponse.json({ ok: true, providerId, sentTo: to, body });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, providerId, error: msg }, { status: 502 });
  }
}
