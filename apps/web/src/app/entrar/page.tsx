import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { auth } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar" };

export default async function SignInPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    const role = (session.user as { role?: string }).role;
    if (role === "admin" || role === "operator" || role === "support") {
      redirect("/admin");
    }
    redirect("/app");
  }

  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden bg-[var(--color-bg-muted)] px-4 py-12">
      {/* glow ambiente — mesma linguagem do PageHeader/landing */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[480px]"
      >
        <div className="absolute left-1/2 top-0 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-[var(--color-primary)]/14 blur-[110px]" />
        <div className="absolute right-1/3 top-24 h-[280px] w-[280px] rounded-full bg-[var(--color-income)]/10 blur-[90px]" />
      </div>

      <div className="w-full max-w-sm">
        <Link href="/" aria-label="Voltar para a home" className="inline-flex">
          <BrandMark />
        </Link>

        <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-7 shadow-soft ring-1 ring-transparent transition-all duration-300 hover:shadow-pop">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
            Acesso · Cliente
          </p>
          <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight">
            Bem-vindo de <span className="display-serif italic">volta</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-fg-muted)]">
            Acesso pra você ver o que rolou na sua família.
          </p>
          <LoginForm />
        </div>

        <p className="mt-4 text-center text-xs text-[var(--color-fg-subtle)]">
          Não tem conta?{" "}
          <Link href="/assinar" className="underline-offset-4 hover:underline">
            Começar {BRAND.pricing.trialDays} dias grátis
          </Link>
        </p>
      </div>
    </main>
  );
}
