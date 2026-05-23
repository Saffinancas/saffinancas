"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn.email({
        email,
        password,
        callbackURL: "/admin",
      });
      if (res.error) {
        setError(res.error.message ?? "Não conseguimos entrar com esses dados.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-fg-muted)]">E-mail</span>
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-10 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/30"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-fg-muted)]">Senha</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-10 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/30"
        />
      </label>

      {error && (
        <p className="rounded-[var(--radius)] border border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)] px-3 py-2 text-xs text-[var(--color-expense)]">
          {error}
        </p>
      )}

      <Button type="submit" disabled={loading} className="mt-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {loading ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
