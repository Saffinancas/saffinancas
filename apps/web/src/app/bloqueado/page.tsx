import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { auth } from "@/lib/auth";
import { describeSubscription, isBlocked } from "@/lib/subscription";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { Lock } from "lucide-react";
import { SignOutButton } from "./sign-out-button";

export default async function BlockedPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/entrar");

  const u = session.user as { familyId?: string | null };
  if (!u.familyId) redirect("/onboarding");

  const [sub] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.familyId, u.familyId))
    .limit(1);

  const state = describeSubscription(sub);
  if (!isBlocked(state)) redirect("/app");

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--color-bg-muted)] px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto inline-flex">
          <BrandMark />
        </div>
        <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 shadow-soft">
          <span className="mx-auto inline-grid h-12 w-12 place-items-center rounded-full bg-[var(--color-expense-soft)] text-[var(--color-expense)]">
            <Lock className="h-5 w-5" />
          </span>
          <h1 className="mt-5 text-xl font-semibold tracking-tight">Plataforma pausada</h1>
          <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
            Seu acesso foi suspenso por falta de pagamento. Regularize e voltamos imediatamente —
            seus dados ficam preservados por 60 dias.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button asChild size="lg">
              <Link href="/app/cobranca">Regularizar pagamento</Link>
            </Button>
            <SignOutButton />
          </div>
        </div>
        <p className="mt-4 text-xs text-[var(--color-fg-subtle)]">
          Precisa de ajuda? Fale com a gente.
        </p>
      </div>
    </main>
  );
}
