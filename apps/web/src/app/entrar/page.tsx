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
    <main className="grid min-h-dvh place-items-center bg-[var(--color-bg-muted)] px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" aria-label="Voltar para a home" className="inline-flex">
          <BrandMark />
        </Link>

        <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-7 shadow-soft">
          <h1 className="text-xl font-semibold tracking-tight">Entrar</h1>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
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
