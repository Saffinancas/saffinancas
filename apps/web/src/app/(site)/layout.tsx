import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { Footer } from "@/components/landing/footer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-[var(--color-border)]">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
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
      <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">{children}</main>
      <Footer />
    </>
  );
}
