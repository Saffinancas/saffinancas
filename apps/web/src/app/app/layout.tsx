import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { describeSubscription, isBlocked } from "@/lib/subscription";
import { AppShell } from "./app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/entrar");

  const u = session.user as { role?: string; familyId?: string | null };

  if (u.role === "admin" || u.role === "operator" || u.role === "support") {
    redirect("/admin");
  }

  if (!u.familyId) {
    // Conta criada mas família não foi bootstrappada (caso raro).
    redirect("/onboarding");
  }

  const [family] = await db
    .select()
    .from(schema.families)
    .where(eq(schema.families.id, u.familyId))
    .limit(1);

  const [subscription] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.familyId, u.familyId))
    .limit(1);

  const state = describeSubscription(subscription);

  // Wall — bloqueio total após D+10 / past_due > blockAfterDay.
  // Onboarding e bloqueio escapam do wall (pra deixar o user atualizar billing).
  if (isBlocked(state)) {
    redirect("/bloqueado");
  }

  return (
    <AppShell
      user={{ name: session.user.name, email: session.user.email }}
      family={family ? { id: family.id, name: family.name } : null}
      trialState={state}
    >
      {children}
    </AppShell>
  );
}
