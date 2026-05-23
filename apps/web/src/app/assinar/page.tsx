import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { BRAND } from "@/lib/brand";
import { auth } from "@/lib/auth";
import { SignupForm } from "./signup-form";

export const metadata = { title: `Começar grátis — ${BRAND.pricing.trialDays} dias` };

export default async function SubscribePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/app");

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--color-bg-muted)] px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" aria-label="Voltar para a home" className="inline-flex">
          <BrandMark />
        </Link>

        <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-7 shadow-soft">
          <h1 className="text-xl font-semibold tracking-tight">Criar sua conta</h1>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            {BRAND.pricing.trialDays} dias grátis. Sem cartão de crédito agora.
          </p>

          <SignupForm />
        </div>

        <p className="mt-4 text-center text-xs text-[var(--color-fg-subtle)]">
          Já tem conta?{" "}
          <Link href="/entrar" className="underline-offset-4 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
