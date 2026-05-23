import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { Footer } from "@/components/landing/footer";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-[var(--color-border)]">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="Voltar para a home">
            <BrandMark />
          </Link>
          <Link
            href="/"
            className="text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
          >
            ← Voltar
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <article className="prose-saf">{children}</article>
      </main>
      <Footer />
    </>
  );
}
