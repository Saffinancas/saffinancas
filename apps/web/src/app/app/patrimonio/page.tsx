import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { listAssets } from "@/lib/patrimony";
import { PatrimonyClient } from "./client";

export const dynamic = "force-dynamic";

export default async function PatrimonioPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const familyId = (session?.user as { familyId?: string | null })?.familyId;
  if (!familyId) return null;

  const assets = await listAssets(familyId);

  return (
    <PatrimonyClient
      assets={assets.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        acquisitionDate: a.acquisitionDate.toISOString(),
        acquisitionCostCents: Number(a.acquisitionCostCents),
        currentValueCents: Number(a.currentValueCents),
      }))}
    />
  );
}
