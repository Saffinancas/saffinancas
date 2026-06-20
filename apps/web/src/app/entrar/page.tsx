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
      <div aria-hidden className="aurora -z-10" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-grain" />

      <div className="reveal w-full max-w-sm" style={{ ["--d" as string]: "0ms" }}>
        <Link
          href="/"
          aria-label="Voltar para a home"
          className="inline-flex transition-transform duration-200 hover:scale-[1.02]"
        >
          <BrandMark />
        </Link>

        <div className="card-hover mt-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-7 shadow-soft ring-1 ring-transparent backdrop-blur-sm">
          <p className="eyebrow">Acesso · Cliente</p>
          <h1 className="mt-3 text-balance text-[1.75rem] font-medium leading-tight tracking-[-0.02em]">
            Bem-vindo de{" "}
            <span className="display-serif italic font-normal">volta</span>
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-[var(--color-fg-muted)]">
            Acesso pra você ver o que rolou na sua família.
          </p>
          <LoginForm />
        </div>

        <p className="mt-5 text-center text-xs text-[var(--color-fg-subtle)]">
          Não tem conta?{" "}
          <Link
            href="/assinar"
            className="link-underline text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
          >
            Começar {BRAND.pricing.trialDays} dias grátis
          </Link>
        </p>
      </div>
    </main>
  );
}
