import { ComingSoon } from "@/components/coming-soon";

export default function ContasPage() {
  return (
    <ComingSoon
      title="Contas bancárias (Open Finance)"
      description="Conecte Nubank, Inter, Itaú e outros via Pluggy pra ver saldo e extrato real-time."
      bullets={[
        "Pluggy Connect embedado: autenticação no banco em poucos cliques",
        "Sync inicial dos últimos 90 dias",
        "Cada transação importada também passa pelo classificador de IA",
        "Deduplicação banco vs WhatsApp com merge manual quando necessário",
      ]}
    />
  );
}
