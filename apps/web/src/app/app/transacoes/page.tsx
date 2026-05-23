import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  listTransactionsForFamily,
  listCategoriesForFamily,
} from "@/lib/transactions";
import { TransactionsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  const familyId = (session?.user as { familyId?: string | null })?.familyId;
  if (!familyId) return null;

  const [transactions, categories] = await Promise.all([
    listTransactionsForFamily(familyId, { limit: 500 }),
    listCategoriesForFamily(familyId),
  ]);

  return (
    <TransactionsClient
      initialOpen={sp.new === "1"}
      transactions={transactions.map((t) => ({
        ...t,
        occurredAt: t.occurredAt.toISOString(),
      }))}
      categories={categories}
    />
  );
}
