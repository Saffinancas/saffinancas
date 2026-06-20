import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { BRAND } from "@/lib/brand";

const cols = [
  {
    title: "Produto",
    links: [
      { href: "#como-funciona", label: "Como funciona" },
      { href: "#diferenciais", label: "Diferenciais" },
      { href: "#precos", label: "Preço" },
      { href: "/status", label: "Status" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/contato", label: "Contato" },
      { href: "/imprensa", label: "Imprensa" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/termos", label: "Termos de uso" },
      { href: "/privacidade", label: "Privacidade" },
      { href: "/lgpd", label: "LGPD" },
      { href: "/cookies", label: "Cookies" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-[var(--color-border)] bg-[var(--color-bg-muted)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-grain" />

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <BrandMark />
            <p className="display-serif mt-5 max-w-xs text-xl italic leading-snug text-[var(--color-fg)]">
              {BRAND.tagline}
            </p>
            <p className="mt-6 text-xs text-[var(--color-fg-subtle)]">
              DPO ·{" "}
              <a
                className="link-underline text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                href={`mailto:${BRAND.email.dpo}`}
              >
                {BRAND.email.dpo}
              </a>
            </p>
          </div>

          {cols.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg-subtle)]">
                {c.title}
              </p>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="link-underline text-sm text-[var(--color-fg-muted)] transition-colors duration-200 hover:text-[var(--color-fg)]"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-fg-subtle)] sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {BRAND.legalName}. Todos os direitos
            reservados.
          </p>
          <p className="flex items-center gap-1.5">
            Feito no Brasil
            <span aria-hidden className="display-serif italic">
              ·
            </span>
            <a
              href={`mailto:${BRAND.email.support}`}
              className="link-underline hover:text-[var(--color-fg)]"
            >
              {BRAND.email.support}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
