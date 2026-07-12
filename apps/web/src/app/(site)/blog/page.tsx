import Link from "next/link";
import { PenLine, ArrowRight } from "lucide-react";
import { BRAND } from "@/lib/brand";

export const metadata = { title: "Blog" };

export default function BlogPage() {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
        Blog
      </p>
      <h1 className="mt-3 text-balance text-[2.25rem] leading-[1.05] tracking-tight sm:text-[2.75rem]">
        Ideias sobre dinheiro em{" "}
        <span className="display-serif italic">família</span>
      </h1>
      <p className="mt-4 max-w-xl text-pretty text-[15.5px] leading-relaxed text-[var(--color-fg-muted)]">
        Estamos preparando os primeiros textos — sobre organização financeira,
        automação com IA e como conversar sobre dinheiro em casa sem briga.
      </p>

      <div className="mt-10 flex flex-col items-start gap-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-muted)] p-8">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <PenLine className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold tracking-tight">Nada publicado ainda</h2>
          <p className="mt-1.5 max-w-md text-sm leading-relaxed text-[var(--color-fg-muted)]">
            O primeiro post sai em breve. Enquanto isso, o melhor jeito de
            conhecer o {BRAND.name} é começar a usar.
          </p>
        </div>
        <Link
          href="/assinar"
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)]"
        >
          Experimentar o {BRAND.shortName}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
