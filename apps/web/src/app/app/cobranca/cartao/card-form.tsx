"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { attachCardAndActivate } from "@/lib/pagarme";

export function CardForm() {
  const router = useRouter();
  const [number, setNumber] = React.useState("");
  const [holder, setHolder] = React.useState("");
  const [exp, setExp] = React.useState("");
  const [cvv, setCvv] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const [mm, yy] = exp.split("/").map((s) => s.trim());
    if (!mm || !yy) {
      setError("Validade no formato MM/AA.");
      return;
    }
    setLoading(true);
    try {
      const res = await attachCardAndActivate({
        number,
        holder,
        expMonth: Number(mm),
        expYear: 2000 + Number(yy),
        cvv,
      });
      if (!res.ok) {
        setError(res.error);
        setLoading(false);
        return;
      }
      router.push("/app/cobranca?ok=1");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-soft"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cc-num">Número do cartão</Label>
        <Input
          id="cc-num"
          inputMode="numeric"
          required
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="0000 0000 0000 0000"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cc-holder">Nome impresso</Label>
        <Input
          id="cc-holder"
          required
          value={holder}
          onChange={(e) => setHolder(e.target.value)}
          placeholder="CAMILA M SOUSA"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cc-exp">Validade</Label>
          <Input
            id="cc-exp"
            required
            value={exp}
            onChange={(e) => setExp(e.target.value)}
            placeholder="MM/AA"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cc-cvv">CVV</Label>
          <Input
            id="cc-cvv"
            inputMode="numeric"
            required
            value={cvv}
            onChange={(e) => setCvv(e.target.value)}
            placeholder="123"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-[var(--radius)] border border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)] px-3 py-2 text-xs text-[var(--color-expense)]">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Lock className="h-4 w-4" />
        )}
        Salvar e ativar assinatura
      </Button>

      <p className="text-center text-[10px] text-[var(--color-fg-subtle)]">
        Pagamento processado pela Pagar.me. Nada de dados de cartão é armazenado por nós.
      </p>
    </form>
  );
}
