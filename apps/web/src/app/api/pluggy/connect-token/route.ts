import { NextResponse } from "next/server";
import { createConnectToken } from "@/lib/pluggy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  const r = await createConnectToken();
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ token: r.token });
}
