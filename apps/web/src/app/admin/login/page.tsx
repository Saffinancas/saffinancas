import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { BrandMark } from "@/components/brand-mark";
import { AdminLoginForm } from "./login-form";

export const metadata = { title: "Entrar no admin" };

type SearchParams = Promise<{ error?: string }>;

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    const role = (session.user as { role?: string }).role;
    if (role && ["admin", "operator", "support"].includes(role)) {
      redirect("/admin");
    }
  }

  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden bg-[var(--color-bg-muted)] px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[480px]"
      >
        <div className="absolute left-1/2 top-0 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-[var(--color-warning)]/14 blur-[110px]" />
        <div className="absolute right-1/3 top-24 h-[260px] w-[260px] rounded-full bg-[var(--color-expense)]/8 blur-[90px]" />
      </div>

      <div className="w-full max-w-sm">
        <Link href="/" aria-label="Voltar para a home" className="inline-flex">
          <BrandMark />
        </Link>

        <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-7 shadow-soft ring-1 ring-transparent transition-all duration-300 hover:shadow-pop">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-warning)]">
            Plataforma · Admin
          </p>
          <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight">
            Entrar no <span className="display-serif italic">painel</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-fg-muted)]">
            Acesso restrito. Tentativas de login são auditadas.
          </p>

          {error === "forbidden" && (
            <div className="mt-5 rounded-[var(--radius)] border border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)] px-3 py-2 text-xs text-[var(--color-expense)]">
              Sua conta não tem permissão de admin.
            </div>
          )}

          <AdminLoginForm />
        </div>

        <p className="mt-4 text-center text-xs text-[var(--color-fg-subtle)]">
          Não é admin?{" "}
          <Link href="/entrar" className="underline-offset-4 hover:underline">
            Entrar como cliente
          </Link>
        </p>
      </div>
    </main>
  );
}
