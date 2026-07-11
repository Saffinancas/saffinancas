"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ListChecks,
  Target,
  TrendingUp,
  Landmark,
  MessageSquare,
  Settings,
  Receipt,
  LogOut,
  LineChart,
  Building2,
  FileCheck,
  FileSignature,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TrialBanner } from "./trial-banner";
import { signOut } from "@/lib/auth-client";
import type { TrialState } from "@/lib/subscription";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/app", label: "Dashboard", icon: Activity },
  { href: "/app/transacoes", label: "Transações", icon: Receipt },
  { href: "/app/previsto", label: "Previsto", icon: ListChecks },
  { href: "/app/metas", label: "Metas", icon: Target },
  { href: "/app/futuro", label: "Futuro", icon: TrendingUp },
  { href: "/app/investimentos", label: "Investimentos", icon: LineChart },
  { href: "/app/patrimonio", label: "Patrimônio", icon: Building2 },
  { href: "/app/contas", label: "Contas bancárias", icon: Landmark },
  { href: "/app/imposto-de-renda", label: "Imposto de renda", icon: FileCheck },
  { href: "/app/fiscal", label: "Fiscal · NFSe", icon: FileSignature },
  { href: "/app/whatsapp", label: "WhatsApp", icon: MessageSquare },
  { href: "/app/config", label: "Configurações", icon: Settings },
];

type Props = {
  user: { name?: string | null; email: string };
  family: { id: string; name: string } | null;
  trialState: TrialState;
  children: React.ReactNode;
};

export function AppShell({ user, family, trialState, children }: Props) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    await signOut();
    router.push("/entrar");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-[var(--color-bg)] pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            {/* Mobile: logo abre o drawer; Desktop: logo volta pro dashboard */}
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Abrir menu"
                  className="flex items-center gap-2 rounded-[var(--radius-sm)] px-1 py-0.5 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] md:hidden"
                >
                  <BrandMark />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <BrandMark />
                  </SheetTitle>
                  <SheetDescription>
                    {family ? family.name : user.name ?? user.email}
                  </SheetDescription>
                </SheetHeader>

                <nav
                  aria-label="Menu mobile"
                  className="flex-1 overflow-y-auto px-2 py-3"
                >
                  {nav.map((item) => {
                    const active =
                      pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileNavOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-sm transition-colors",
                          active
                            ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-medium"
                            : "text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-fg)]",
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>

                <div className="border-t border-[var(--color-border)] px-3 py-3">
                  <div className="mb-2 px-1 text-[10px] text-[var(--color-fg-subtle)]">
                    <p className="truncate">{user.name ?? user.email}</p>
                    {user.name && <p className="truncate">{user.email}</p>}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMobileNavOpen(false);
                      handleSignOut();
                    }}
                    className="w-full justify-start"
                  >
                    <LogOut className="h-4 w-4" /> Sair
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <Link
              href="/app"
              aria-label="Voltar ao dashboard"
              className="hidden items-center gap-2 md:flex"
            >
              <BrandMark />
              {family && (
                <span className="text-xs text-[var(--color-fg-subtle)]">
                  · {family.name}
                </span>
              )}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <TrialBanner state={trialState} />

      <div className="mx-auto grid max-w-7xl gap-6 px-3 py-6 sm:px-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden md:block">
          <nav aria-label="App navigation" className="sticky top-20 flex flex-col gap-0.5">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-[var(--radius)] px-3 py-2 text-sm transition-colors duration-200",
                    active
                      ? "bg-[var(--color-primary-soft)]/70 font-medium text-[var(--color-primary)]"
                      : "text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-fg)]",
                  )}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-[var(--color-primary)]"
                    />
                  )}
                  <item.icon
                    className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      active ? "scale-110" : "group-hover:scale-105",
                    )}
                  />
                  {item.label}
                </Link>
              );
            })}

            <div className="mt-5 border-t border-[var(--color-border)] pt-4 text-[10.5px] leading-relaxed text-[var(--color-fg-subtle)]">
              <p className="truncate font-medium text-[var(--color-fg-muted)]">
                {user.name ?? user.email}
              </p>
              {user.name && <p className="truncate">{user.email}</p>}
            </div>
          </nav>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>

      {/* Bottom nav mobile — 5 items com labels compactos + safe-area iOS */}
      <nav
        aria-label="App navigation mobile"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[var(--color-border)] bg-[var(--color-bg)]/95 pb-[max(env(safe-area-inset-bottom),0px)] backdrop-blur md:hidden"
      >
        {nav.slice(0, 5).map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-1 px-1 py-2.5 text-center text-[9.5px] leading-tight transition-colors duration-200",
                active
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]",
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-[var(--color-primary)]"
                />
              )}
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              <span className="line-clamp-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
