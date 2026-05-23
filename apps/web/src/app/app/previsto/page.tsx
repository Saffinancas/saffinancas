import { ComingSoon } from "@/components/coming-soon";

export default function PrevistoPage() {
  return (
    <ComingSoon
      title="Previsto"
      description="Checklist do mês corrente e do próximo: o que vai sair e o que já foi pago."
      bullets={[
        "Lançar itens previstos (aluguel, água, luz, escola)",
        "Marcar como pago → vira despesa real no mês",
        "Recorrência mensal/anual clonada automaticamente no dia 1",
        "Comparativo previsto vs realizado por categoria",
      ]}
    />
  );
}
