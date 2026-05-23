import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { bootstrapFamilyForUser } from "@/lib/families";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { familyName?: string } | null;
  const familyName = body?.familyName?.trim();
  if (!familyName || familyName.length < 2) {
    return NextResponse.json({ error: "Nome da família inválido." }, { status: 400 });
  }

  const res = await bootstrapFamilyForUser({
    userId: session.user.id,
    familyName,
  });

  if (!res.ok) {
    if (res.reason === "already_bootstrapped") {
      return NextResponse.json({ ok: true, alreadyBootstrapped: true });
    }
    return NextResponse.json({ error: res.reason }, { status: 500 });
  }
  return NextResponse.json({ ok: true, familyId: res.familyId });
}
