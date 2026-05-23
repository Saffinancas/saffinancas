import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { listInvoices, getDecryptedXml, getInvoiceById } from "@/lib/fiscal/invoices";
import { buildDanfeHtml } from "@/lib/fiscal/danfe";

/**
 * Exporta todas as NFSe do período em um JSON estruturado contendo:
 *  - Lista de notas com metadados
 *  - XMLs embutidos (string)
 *  - DANFEs em HTML (cliente imprime cada um)
 *
 * Pra contabilidade, baixa esse JSON e usa o XML diretamente — o formato é
 * o padrão ABRASF 2.04 que a maioria dos contadores conhece.
 *
 * Em fase futura, gerar ZIP de verdade com cada arquivo separado (precisa de
 * uma lib como `jszip` ou stream nativo). Por ora, JSON é prático.
 */
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  const familyId = (session?.user as { familyId?: string | null })?.familyId;
  if (!familyId) return new NextResponse("Não autenticado.", { status: 401 });

  const url = new URL(req.url);
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  const from = fromStr ? new Date(fromStr) : undefined;
  const to = toStr ? new Date(toStr) : undefined;

  const invoices = await listInvoices(familyId, { from, to, limit: 1000 });

  const items: Array<{
    nfseNumber: number | null;
    rpsNumber: number;
    rpsSerie: string;
    verificationCode: string | null;
    competenceDate: string;
    serviceValueCents: number;
    issValueCents: number;
    serviceDescription: string;
    recipientName: string | null;
    status: string;
    xml: string | null;
    danfe: string | null;
  }> = [];

  for (const inv of invoices) {
    if (inv.status !== "issued") continue;
    const full = await getInvoiceById(inv.id, familyId);
    const xml = await getDecryptedXml(inv.id, familyId);
    const danfe =
      full?.invoice && full.profile
        ? buildDanfeHtml({
            invoice: full.invoice,
            profile: full.profile,
            recipient: full.recipient,
          })
        : null;

    items.push({
      nfseNumber: inv.nfseNumber != null ? Number(inv.nfseNumber) : null,
      rpsNumber: inv.rpsNumber,
      rpsSerie: inv.rpsSerie,
      verificationCode: inv.verificationCode,
      competenceDate: inv.competenceDate.toISOString(),
      serviceValueCents: Number(inv.serviceValueCents),
      issValueCents: Number(inv.issValueCents),
      serviceDescription: inv.serviceDescription,
      recipientName: inv.recipientName,
      status: inv.status,
      xml,
      danfe,
    });
  }

  const payload = {
    exported_at: new Date().toISOString(),
    period: { from: fromStr, to: toStr },
    count: items.length,
    items,
  };

  const filename = `nfse-export-${(fromStr ?? "inicio")}-a-${toStr ?? "hoje"}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
