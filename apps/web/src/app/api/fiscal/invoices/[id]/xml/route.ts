import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getDecryptedXml, getInvoiceById } from "@/lib/fiscal/invoices";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const familyId = (session?.user as { familyId?: string | null })?.familyId;
  if (!familyId) return new NextResponse("Não autenticado.", { status: 401 });

  const invoice = await getInvoiceById(id, familyId);
  if (!invoice) return new NextResponse("Não encontrada.", { status: 404 });

  const xml = await getDecryptedXml(id, familyId);
  if (!xml) return new NextResponse("Sem XML armazenado.", { status: 404 });

  const filename = `nfse-${invoice.invoice.nfseNumber ?? invoice.invoice.rpsNumber}.xml`;
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
