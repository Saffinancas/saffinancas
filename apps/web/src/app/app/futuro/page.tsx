import { listFutureIncomes, forecastCashflow } from "@/lib/future";
import { FuturoClient } from "./client";

export const dynamic = "force-dynamic";

export default async function FuturoPage() {
  const [incomes, forecast] = await Promise.all([
    listFutureIncomes(),
    forecastCashflow(12),
  ]);
  return <FuturoClient incomes={incomes} forecast={forecast} />;
}
