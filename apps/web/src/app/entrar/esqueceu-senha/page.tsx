import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { ForgotPasswordForm } from "./forgot-form";

export const metadata = { title: "Esqueceu a senha" };

export default function ForgotPasswordPage() {
  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden bg-[var(--color-bg-muted)] px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[480px]"
      >
        <div className="absolute left-1/2 top-0 h-[340px] w-[340px] -translate-x-1/2 rounded-full bg-[var(--color-warning)]/12 blur-[110px]" />
        <div className="absolute right-1/3 top-24 h-[260px] w-[260px] rounded-full bg-[var(--color-primary)]/8 blur-[90px]" />
      </div>

      <div className="w-full max-w-sm">
        <Link href="/" aria-label="Voltar para a home" className="inline-flex">
          <BrandMark />
        </Link>

        <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-7 shadow-soft ring-1 ring-transparent transition-all duration-300 hover:shadow-pop">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
            Acesso · Recuperação
          </p>
          <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight">
            Esqueceu a <span className="display-serif italic">senha?</span>
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-fg-muted)]">
            Informe seu e-mail e mandamos um link pra você redefinir.
          </p>
          <ForgotPasswordForm />
        </div>

        <p className="mt-4 text-center text-xs text-[var(--color-fg-subtle)]">
          Lembrou?{" "}
          <Link href="/entrar" className="underline-offset-4 hover:underline">
            Voltar para entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
