import Link from "next/link";
import { Sparkles, AlertTriangle, Gift } from "lucide-react";
import type { TrialState } from "@/lib/subscription";

export function TrialBanner({ state }: { state: TrialState }) {
  if (state.kind === "active") return null;

  if (state.kind === "free") {
    return (
      <div className="border-b border-[var(--color-income)]/20 bg-[var(--color-income-soft)]/60">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-2 text-xs text-[var(--color-income)] sm:px-6">
          <Gift className="h-3.5 w-3.5" />
          <span>
            <strong>Plano gratuito vitalício.</strong> Concedido pela administração — sem
            cobrança nem trial.
          </span>
        </div>
      </div>
    );
  }

  if (state.kind === "trialing") {
    return (
      <div className="border-b border-[var(--color-primary)]/20 bg-[var(--color-primary-soft)]/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 text-xs sm:px-6">
          <p className="flex items-center gap-2 text-[var(--color-primary)]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>
              {state.daysLeft === 0
                ? "Seu trial termina hoje."
                : state.daysLeft === 1
                  ? "Mais 1 dia de trial grátis."
                  : `Mais ${state.daysLeft} dias de trial grátis.`}
            </span>
          </p>
          <Link
            href="/app/cobranca"
            className="font-medium text-[var(--color-primary)] underline-offset-4 hover:underline"
          >
            Adicionar pagamento →
          </Link>
        </div>
      </div>
    );
  }

  if (state.kind === "past_due") {
    return (
      <div className="border-b border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 text-xs sm:px-6">
          <p className="flex items-center gap-2 text-[var(--color-expense)]">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>
              {state.daysUntilBlock === 0
                ? "Pagamento pendente. O acesso será suspenso a qualquer momento."
                : `Pagamento pendente. Acesso será suspenso em ${state.daysUntilBlock} dia${state.daysUntilBlock > 1 ? "s" : ""}.`}
            </span>
          </p>
          <Link
            href="/app/cobranca"
            className="font-semibold text-[var(--color-expense)] underline-offset-4 hover:underline"
          >
            Regularizar agora →
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
