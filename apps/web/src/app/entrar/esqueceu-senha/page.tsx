import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { ForgotPasswordForm } from "./forgot-form";

export const metadata = { title: "Esqueceu a senha" };

export default function ForgotPasswordPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--color-bg-muted)] px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" aria-label="Voltar para a home" className="inline-flex">
          <BrandMark />
        </Link>

        <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-7 shadow-soft">
          <h1 className="text-xl font-semibold tracking-tight">Esqueceu a senha?</h1>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
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
