import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { listHoldings, listDividends } from "@/lib/investments";
import { B3Client } from "./client";

export const dynamic = "force-dynamic";

export default async function B3Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  const familyId = (session?.user as { familyId?: string | null })?.familyId;
  if (!familyId) return null;

  const [holdings, dividends] = await Promise.all([
    listHoldings(familyId),
    listDividends(familyId, { limit: 100 }),
  ]);

  return (
    <B3Client
      holdings={holdings.map((h) => ({
        id: h.id,
        assetClass: h.assetClass,
        ticker: h.ticker,
        name: h.name,
        brokerage: h.brokerage,
        quantity: Number(h.quantity),
        avgCostCents: Number(h.avgCostCents),
        currentPriceCents: h.currentPriceCents != null ? Number(h.currentPriceCents) : null,
      }))}
      dividends={dividends.map((d) => ({
        id: d.id,
        ticker: d.ticker,
        kind: d.kind,
        amountCents: Number(d.amountCents),
        payableAt: d.payableAt.toISOString(),
        status: d.status,
      }))}
    />
  );
}
