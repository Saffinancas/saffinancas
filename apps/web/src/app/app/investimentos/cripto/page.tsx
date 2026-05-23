import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { listCryptoHoldings } from "@/lib/investments";
import { CryptoClient } from "./client";

export const dynamic = "force-dynamic";

export default async function CriptoPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const familyId = (session?.user as { familyId?: string | null })?.familyId;
  if (!familyId) return null;

  const holdings = await listCryptoHoldings(familyId);

  return (
    <CryptoClient
      holdings={holdings.map((h) => ({
        id: h.id,
        symbol: h.symbol,
        name: h.name,
        venue: h.venue,
        quantity: Number(h.quantity),
        avgCostCents: Number(h.avgCostCents),
        currentPriceCents: h.currentPriceCents != null ? Number(h.currentPriceCents) : null,
        walletAddress: h.walletAddress,
      }))}
    />
  );
}
