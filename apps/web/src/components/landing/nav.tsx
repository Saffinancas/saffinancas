"use client";

import Link from "next/link";
import * as React from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#plataforma", label: "Plataforma" },
  { href: "#precos", label: "Preço" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNav() {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)]/60 bg-[var(--color-bg)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Início" className="shrink-0">
          <BrandMark />
        </Link>

        <nav className="hidden gap-7 md:flex" aria-label="Navegação principal">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/entrar">Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/assinar">Começar agora</Link>
          </Button>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            className="grid h-10 w-10 place-items-center rounded-[var(--radius)] hover:bg-[var(--color-surface-muted)] text-[var(--color-fg)]"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-[var(--color-border)] md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-[var(--radius)] px-3 py-2.5 text-sm text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-fg)]"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex gap-2">
              <Button asChild variant="secondary" className="flex-1">
                <Link href="/entrar">Entrar</Link>
              </Button>
              <Button asChild className="flex-1">
                <Link href="/assinar">Começar agora</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
