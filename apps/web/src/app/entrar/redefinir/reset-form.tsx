"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/lib/auth-client";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Link inválido ou expirado. Peça um novo em 'esqueceu a senha'.");
      return;
    }
    if (password.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword({ newPassword: password, token });
      if (res.error) {
        setError(res.error.message ?? "Não foi possível redefinir.");
        setLoading(false);
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/entrar"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao redefinir.");
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <p className="mt-6 rounded-[var(--radius)] border border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)] px-3 py-2 text-xs text-[var(--color-expense)]">
        Link inválido ou expirado. Peça um novo em &ldquo;esqueceu a senha&rdquo;.
      </p>
    );
  }

  if (done) {
    return (
      <div className="mt-6 rounded-[var(--radius)] border border-[var(--color-income)]/30 bg-[var(--color-income-soft)] px-3 py-3 text-sm text-[var(--color-income)]">
        Senha redefinida. Redirecionando pra tela de entrar...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rp-pwd">Nova senha</Label>
        <Input
          id="rp-pwd"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rp-pwd2">Confirmar nova senha</Label>
        <Input
          id="rp-pwd2"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>

      {error && (
        <p className="rounded-[var(--radius)] border border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)] px-3 py-2 text-xs text-[var(--color-expense)]">
          {error}
        </p>
      )}

      <Button type="submit" disabled={loading} className="mt-2">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? "Salvando..." : "Salvar nova senha"}
      </Button>
    </form>
  );
}
