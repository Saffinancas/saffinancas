import { BRAND } from "@/lib/brand";

export const metadata = { title: "LGPD" };

export default function LgpdPage() {
  return (
    <>
      <h1>LGPD — Seus direitos</h1>
      <p>
        A Lei Geral de Proteção de Dados (Lei nº 13.709/2018) garante uma série de direitos
        sobre seus dados pessoais. Aqui está como você exerce cada um deles no {BRAND.name}.
      </p>

      <h2>Acesso e portabilidade</h2>
      <p>
        Você pode baixar <strong>todos</strong> os seus dados a qualquer momento em{" "}
        <a href="/api/me/export">/api/me/export</a>. O retorno é um JSON contendo: conta,
        família, assinatura, transações, categorias, metas, previsões, sessão WhatsApp e
        audit logs.
      </p>

      <h2>Correção e atualização</h2>
      <p>
        Edite seus dados de família e categorias direto em{" "}
        <a href="/app/config">/app/config</a>. Para correções em audit logs ou transações
        importadas, abra um chamado.
      </p>

      <h2>Exclusão (direito ao apagamento)</h2>
      <p>
        Envie um POST para <code>/api/me/delete</code> (ou use a opção em{" "}
        <a href="/app/config">Configurações &gt; Zona de Perigo</a>). Agendamos a exclusão
        para 30 dias depois. Durante esse período você pode cancelar a solicitação. Após o
        prazo, fazemos hard delete em cascata.
      </p>

      <h2>Revogação de consentimento</h2>
      <p>
        Desconecte o WhatsApp em <a href="/app/whatsapp">/app/whatsapp</a> para deixar de
        monitorar mensagens. As já capturadas continuam disponíveis até a exclusão completa.
      </p>

      <h2>Oposição e portabilidade</h2>
      <p>
        Não usamos seus dados para qualquer finalidade fora do que está na{" "}
        <a href="/privacidade">política de privacidade</a>. Você pode se opor a qualquer
        tratamento entrando em contato com o DPO.
      </p>

      <h2>Encarregado de dados (DPO)</h2>
      <p>
        <a href={`mailto:${BRAND.email.dpo}`}>{BRAND.email.dpo}</a>.
      </p>

      <h2>Autoridade Nacional</h2>
      <p>
        Você também pode registrar reclamação junto à ANPD em{" "}
        <a href="https://www.gov.br/anpd">gov.br/anpd</a>.
      </p>
    </>
  );
}
