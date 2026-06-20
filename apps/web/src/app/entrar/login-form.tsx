"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/auth-client";

export function LoginForm() {
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
      const res = await signIn.email({ email, password });
      if (res.error) {
        setError(res.error.message ?? "E-mail ou senha incorretos.");
        setLoading(false);
        return;
      }
      // O roteamento real (admin vs cliente) é resolvido no /app vs /admin.
      // Mandamos pra /app; se for admin, o middleware redireciona.
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="li-email">E-mail</Label>
        <Input
          id="li-email"
          type="email"
          autoComplete="username"
          required
          aria-invalid={error ? true : undefined}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="li-pwd">Senha</Label>
          <Link
            href="/entrar/esqueceu-senha"
            className="link-underline text-[11px] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
          >
            Esqueceu a senha?
          </Link>
        </div>
        <Input
          id="li-pwd"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={error ? true : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && (
        <p
          role="alert"
          className="reveal flex items-start gap-2 rounded-[var(--radius)] border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] px-3 py-2.5 text-xs leading-relaxed text-[var(--color-danger)]"
        >
          <span aria-hidden className="mt-0.5">⚠</span>
          <span>{error}</span>
        </p>
      )}

      <Button type="submit" disabled={loading} className="mt-3 shadow-pop">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
