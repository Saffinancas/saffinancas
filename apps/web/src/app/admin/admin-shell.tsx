"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Users, Receipt, Activity, Settings, Shield, BrainCircuit, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/lib/auth-client";

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
  const router = useRouter();

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
            <Link href="/admin" aria-label="Painel admin">
              <BrandMark />
            </Link>
            <span className="hidden rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary)] sm:inline-block">
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
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 md:grid-cols-[220px_1fr]">
        <aside className="hidden md:block">
          <nav aria-label="Admin navigation" className="sticky top-20 flex flex-col gap-0.5">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-[var(--radius)] px-3 py-2 text-sm text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-fg)]"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
