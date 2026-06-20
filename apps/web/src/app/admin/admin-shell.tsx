"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  Users,
  Receipt,
  Activity,
  Settings,
  Shield,
  BrainCircuit,
  MessageSquare,
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
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type Props = {
  user: { name: string | null; email: string; role: string };
  children: React.ReactNode;
};

const nav = [
  { href: "/admin", label: "Visão geral", icon: Activity },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/cobranca", label: "Cobrança", icon: Receipt },
  { href: "/admin/uso-ia", label: "Uso de IA", icon: BrainCircuit },
  { href: "/admin/integracoes/whatsapp", label: "WhatsApp", icon: MessageSquare },
  { href: "/admin/auditoria", label: "Auditoria", icon: Shield },
  { href: "/admin/config", label: "Configurações", icon: Settings },
];

export function AdminShell({ user, children }: Props) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    await signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-[var(--color-bg)]">
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Abrir menu"
                  className="flex items-center gap-2 rounded-[var(--radius-sm)] px-1 py-0.5 hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] md:hidden"
                >
                  <BrandMark />
                  <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                    Admin
                  </span>
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <BrandMark />
                    <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                      Admin
                    </span>
                  </SheetTitle>
                  <SheetDescription>
                    {user.name ?? user.email} · {user.role}
                  </SheetDescription>
                </SheetHeader>

                <nav aria-label="Menu admin mobile" className="flex-1 overflow-y-auto px-2 py-3">
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
                    <p className="truncate">{user.email}</p>
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

            <Link href="/admin" aria-label="Painel admin" className="hidden md:flex">
              <BrandMark />
            </Link>
            <span className="hidden rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary)] md:inline-block">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden text-right text-xs leading-tight sm:block">
              <p className="font-medium">{user.name ?? user.email.split("@")[0]}</p>
              <p className="text-[var(--color-fg-subtle)]">
                {user.email} · {user.role}
              </p>
            </div>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 md:grid-cols-[220px_1fr]">
        <aside className="hidden md:block">
          <nav aria-label="Admin navigation" className="sticky top-20 flex flex-col gap-0.5">
            {nav.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
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
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
