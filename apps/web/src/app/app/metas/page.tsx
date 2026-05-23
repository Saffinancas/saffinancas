import { ComingSoon } from "@/components/coming-soon";

export default function MetasPage() {
  return (
    <ComingSoon
      title="Metas"
      description="Reservar dinheiro pra objetivos concretos da família."
      bullets={[
        "Criar meta com valor alvo, prazo e foto",
        "Links externos (ex.: link da Webmotors com o modelo desejado)",
        "Anotações em markdown e aporte manual ou automático",
        "Projeção: 'no ritmo atual você atinge em março/2028'",
      ]}
    />
  );
}
