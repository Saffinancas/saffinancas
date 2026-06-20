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
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden bg-[var(--color-bg-muted)] px-4 py-12">
      <div aria-hidden className="aurora -z-10" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-grain" />

      <div className="reveal w-full max-w-md">
        <Link
          href="/"
          aria-label="Voltar para a home"
          className="inline-flex transition-transform duration-200 hover:scale-[1.02]"
        >
          <BrandMark />
        </Link>

        <div className="card-hover mt-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-7 shadow-soft backdrop-blur-sm">
          <p className="eyebrow">Trial · {BRAND.pricing.trialDays} dias</p>
          <h1 className="mt-3 text-[1.75rem] font-medium tracking-[-0.02em]">
            Criar sua{" "}
            <span className="display-serif italic font-normal">conta</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-fg-muted)]">
            {BRAND.pricing.trialDays} dias grátis. Sem cartão de crédito agora.
          </p>

          <SignupForm />
        </div>

        <p className="mt-5 text-center text-xs text-[var(--color-fg-subtle)]">
          Já tem conta?{" "}
          <Link
            href="/entrar"
            className="link-underline text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
          >
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
