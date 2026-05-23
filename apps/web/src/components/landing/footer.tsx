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
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg-muted)]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <BrandMark />
            <p className="mt-4 max-w-xs text-sm text-[var(--color-fg-muted)]">
              {BRAND.tagline}
            </p>
            <p className="mt-5 text-xs text-[var(--color-fg-subtle)]">
              DPO: <a className="underline-offset-4 hover:underline" href={`mailto:${BRAND.email.dpo}`}>
                {BRAND.email.dpo}
              </a>
            </p>
          </div>

          {cols.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <p className="text-xs font-medium uppercase tracking-wider text-[var(--color-fg-subtle)]">
                {c.title}
              </p>
              <ul className="mt-3 space-y-2">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-fg-subtle)] sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {BRAND.legalName}. Todos os direitos reservados.
          </p>
          <p>
            Feito no Brasil 🇧🇷 · {BRAND.email.support}
          </p>
        </div>
      </div>
    </footer>
  );
}
