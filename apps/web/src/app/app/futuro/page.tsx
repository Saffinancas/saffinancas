import { ComingSoon } from "@/components/coming-soon";

export default function FuturoPage() {
  return (
    <ComingSoon
      title="Receitas e dívidas futuras"
      description="O que vai entrar nos próximos meses e como isso impacta o fluxo de caixa."
      bullets={[
        "13º salário, freelances combinados, restituição de IR",
        "Empréstimo a receber com parcelas previstas",
        "Gráfico de fluxo de caixa 12 meses à frente",
        "Indicação de quando o resultado fica positivo/negativo",
      ]}
    />
  );
}
