"use client";

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

  async function handleSignOut() {
    await signOut();
    router.push("/entrar");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-[var(--color-bg)] pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/app" aria-label="Voltar ao dashboard" className="flex items-center gap-2">
            <BrandMark />
            {family && (
              <span className="hidden text-xs text-[var(--color-fg-subtle)] sm:inline-block">
                · {family.name}
              </span>
            )}
          </Link>
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

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 md:grid-cols-[220px_1fr]">
        <aside className="hidden md:block">
          <nav aria-label="App navigation" className="sticky top-20 flex flex-col gap-0.5">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-[var(--radius)] px-3 py-2 text-sm transition-colors",
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

            <div className="mt-4 border-t border-[var(--color-border)] pt-3 text-[10px] text-[var(--color-fg-subtle)]">
              <p>{user.name ?? user.email}</p>
              <p className="truncate">{user.email}</p>
            </div>
          </nav>
        </aside>

        <main>{children}</main>
      </div>

      {/* Bottom nav mobile */}
      <nav
        aria-label="App navigation mobile"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur md:hidden"
      >
        {nav.slice(0, 5).map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2.5 text-[10px]",
                active ? "text-[var(--color-primary)]" : "text-[var(--color-fg-muted)]",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
