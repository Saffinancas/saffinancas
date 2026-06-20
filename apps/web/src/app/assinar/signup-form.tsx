"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/auth-client";
import { BRAND } from "@/lib/brand";

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [familyName, setFamilyName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [agree, setAgree] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!agree) {
      setError("Você precisa aceitar os termos.");
      return;
    }
    setLoading(true);
    try {
      // Better Auth signUp.email — após sucesso, autoSignIn deixa o cookie pronto.
      const res = await signUp.email({
        name,
        email,
        password,
        callbackURL: "/app",
      });
      if (res.error) {
        setError(res.error.message ?? "Não conseguimos criar sua conta.");
        setLoading(false);
        return;
      }

      // Bootstrap server-side da família e da assinatura.
      const bootstrapRes = await fetch("/api/bootstrap-family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyName }),
      });
      if (!bootstrapRes.ok) {
        const j = await bootstrapRes.json().catch(() => ({}));
        setError(j.error ?? "Cadastro feito, mas falhou ao criar família. Tente entrar.");
        setLoading(false);
        return;
      }

      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="su-name">Seu nome</Label>
        <Input
          id="su-name"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Camila"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="su-family">Como vocês chamam a família?</Label>
        <Input
          id="su-family"
          required
          value={familyName}
          onChange={(e) => setFamilyName(e.target.value)}
          placeholder="Família"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="su-email">E-mail</Label>
        <Input
          id="su-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@exemplo.com"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="su-pwd">Senha</Label>
        <Input
          id="su-pwd"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
        />
      </div>

      <label className="mt-1 flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-[var(--color-fg-muted)]">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-0.5 h-4 w-4 cursor-pointer rounded-[3px] border border-[var(--color-border-strong)] accent-[var(--color-primary)] transition-colors"
        />
        <span>
          Li e aceito os{" "}
          <Link
            href="/termos"
            className="link-underline text-[var(--color-fg)] hover:text-[var(--color-primary)]"
          >
            termos de uso
          </Link>{" "}
          e a{" "}
          <Link
            href="/privacidade"
            className="link-underline text-[var(--color-fg)] hover:text-[var(--color-primary)]"
          >
            política de privacidade
          </Link>
          .
        </span>
      </label>

      {error && (
        <p
          role="alert"
          className="reveal flex items-start gap-2 rounded-[var(--radius)] border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] px-3 py-2.5 text-xs leading-relaxed text-[var(--color-danger)]"
        >
          <span aria-hidden className="mt-0.5">⚠</span>
          <span>{error}</span>
        </p>
      )}

      <Button type="submit" disabled={loading} className="mt-3 shadow-pop" size="lg">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading
          ? "Criando sua conta..."
          : `Começar ${BRAND.pricing.trialDays} dias grátis`}
      </Button>

      <p className="text-center text-[10.5px] text-[var(--color-fg-subtle)]">
        Não cobramos cartão de crédito agora. Você decide depois.
      </p>
    </form>
  );
}
