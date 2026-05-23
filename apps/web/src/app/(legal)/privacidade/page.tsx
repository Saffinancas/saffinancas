import { BRAND } from "@/lib/brand";

export const metadata = { title: "Política de Privacidade" };

export default function PrivacidadePage() {
  return (
    <>
      <h1>Política de Privacidade</h1>
      <p>
        <strong>Última atualização:</strong> 18 de maio de 2026.
      </p>

      <p>
        Esta política descreve como o {BRAND.name} ({BRAND.legalName}) coleta, usa, armazena
        e descarta seus dados pessoais. Ela é uma extensão da{" "}
        <a href="/lgpd">página de LGPD</a> e dos{" "}
        <a href="/termos">termos de uso</a>.
      </p>

      <h2>1. O que coletamos</h2>
      <ul>
        <li>
          <strong>Dados de cadastro:</strong> nome, e-mail e (opcionalmente) telefone.
        </li>
        <li>
          <strong>Dados de uso:</strong> mensagens enviadas no grupo de WhatsApp que você
          autorizou monitorar; transações lançadas manualmente; transações importadas via
          Open Finance, quando você conectar uma conta bancária.
        </li>
        <li>
          <strong>Metadados de sessão:</strong> IP, navegador, dispositivo. Usamos para
          segurança e auditoria.
        </li>
      </ul>

      <h2>2. Para que usamos</h2>
      <ul>
        <li>Classificar transações com IA (Claude, OpenAI ou Gemini — sua escolha).</li>
        <li>Exibir relatórios financeiros para a sua família.</li>
        <li>Processar a sua assinatura via Pagar.me.</li>
        <li>Atender solicitações de suporte e fraude.</li>
      </ul>

      <h2>3. Retenção</h2>
      <p>
        Mensagens brutas do WhatsApp são mantidas por <strong>90 dias</strong> e descartadas
        após esse período. Apenas a transação estruturada (valor, data, categoria) permanece.
      </p>
      <p>
        Audit logs ficam por 24 meses, com IP anonimizado após 90 dias.
      </p>

      <h2>4. Compartilhamento</h2>
      <p>
        Compartilhamos dados estritamente com nossos processadores:
      </p>
      <ul>
        <li>
          <strong>Pagar.me</strong> — dados de cobrança e cartão.
        </li>
        <li>
          <strong>Anthropic / OpenAI / Google</strong> — apenas o conteúdo da mensagem a
          classificar. Usamos as APIs com <em>opt-out de treinamento</em> habilitado.
        </li>
        <li>
          <strong>Pluggy</strong> — caso você conecte conta bancária via Open Finance.
        </li>
        <li>
          <strong>Resend</strong> — envio de e-mail transacional.
        </li>
      </ul>
      <p>Não vendemos seus dados. Nunca.</p>

      <h2>5. Seus direitos (LGPD)</h2>
      <ul>
        <li>Acesso e portabilidade — exporte tudo em <a href="/api/me/export">/api/me/export</a>.</li>
        <li>Exclusão — agende em até 30 dias, cancelável durante o período.</li>
        <li>Correção, oposição e revogação de consentimento.</li>
      </ul>
      <p>
        Encarregado de dados (DPO):{" "}
        <a href={`mailto:${BRAND.email.dpo}`}>{BRAND.email.dpo}</a>.
      </p>

      <h2>6. Segurança</h2>
      <ul>
        <li>TLS 1.3 em trânsito. Encryption at-rest em todos os bancos.</li>
        <li>2FA obrigatório para acesso administrativo e para contas com Open Finance.</li>
        <li>Princípio do menor privilégio nas chaves de IA e de pagamento.</li>
      </ul>

      <h2>7. Contato</h2>
      <p>
        Dúvidas sobre privacidade: <a href={`mailto:${BRAND.email.dpo}`}>{BRAND.email.dpo}</a>.
        Suporte geral: <a href={`mailto:${BRAND.email.support}`}>{BRAND.email.support}</a>.
      </p>
    </>
  );
}
