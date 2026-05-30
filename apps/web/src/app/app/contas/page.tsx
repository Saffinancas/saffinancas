import { listConnectedBanks, pluggyMode } from "@/lib/pluggy";
import { ContasClient } from "./client";

export const dynamic = "force-dynamic";

export default async function ContasPage() {
  const [banks, mode] = await Promise.all([listConnectedBanks(), pluggyMode()]);
  return <ContasClient initial={banks} pluggyEnabled={mode === "real"} />;
}
