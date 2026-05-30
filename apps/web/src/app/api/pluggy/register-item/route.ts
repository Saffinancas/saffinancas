import { NextResponse } from "next/server";
import { registerConnectedItem } from "@/lib/pluggy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  let body: { itemId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.itemId) {
    return NextResponse.json({ error: "itemId obrigatório" }, { status: 400 });
  }
  const r = await registerConnectedItem(body.itemId);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, connectionId: r.connectionId });
}
