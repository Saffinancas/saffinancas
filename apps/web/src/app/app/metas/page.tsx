import { listGoals } from "@/lib/goals";
import { MetasClient } from "./client";

export const dynamic = "force-dynamic";

export default async function MetasPage() {
  const goals = await listGoals();
  return <MetasClient initial={goals} />;
}
