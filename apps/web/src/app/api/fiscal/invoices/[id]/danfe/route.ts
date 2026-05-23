import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getInvoiceById } from "@/lib/fiscal/invoices";
import { buildDanfeHtml } from "@/lib/fiscal/danfe";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const familyId = (session?.user as { familyId?: string | null })?.familyId;
  if (!familyId) return new NextResponse("Não autenticado.", { status: 401 });

  const data = await getInvoiceById(id, familyId);
  if (!data?.invoice || !data.profile) {
    return new NextResponse("Não encontrada.", { status: 404 });
  }

  const html = buildDanfeHtml({
    invoice: data.invoice,
    profile: data.profile,
    recipient: data.recipient,
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
