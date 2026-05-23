import { CardForm } from "./card-form";

export const metadata = { title: "Adicionar cartão" };

export default function CartaoPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Adicionar cartão</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
          Em modo simulado: <strong>nenhum dado é enviado pra Pagar.me</strong> ainda. Use
          qualquer número de cartão válido pra testar o fluxo.
        </p>
      </div>

      <CardForm />
    </div>
  );
}
