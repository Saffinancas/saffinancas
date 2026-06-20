import { BRAND } from "@/lib/brand";
import { getPricing } from "@/lib/pricing";

export const metadata = { title: "Termos de Uso" };

export default async function TermosPage() {
  const pricing = await getPricing();
  const monthlyFmt = (pricing.monthlyCents / 100).toFixed(2).replace(".", ",");
  return (
    <>
      <h1>Termos de Uso</h1>
      <p>
        <strong>Última atualização:</strong> 18 de maio de 2026.
      </p>

      <h2>1. Aceitação</h2>
      <p>
        Ao criar uma conta no {BRAND.name}, você concorda com estes termos e com a{" "}
        <a href="/privacidade">política de privacidade</a>. Se você não concorda, não use o
        produto.
      </p>

      <h2>2. O que oferecemos</h2>
      <p>
        Uma plataforma de finanças familiares que captura transações de um grupo de WhatsApp
        que você autorizou, classifica com IA e exibe num dashboard. Open Finance é opcional.
      </p>

      <h2>3. Sua responsabilidade</h2>
      <ul>
        <li>Manter o sigilo das suas credenciais de acesso.</li>
        <li>Garantir que os participantes do grupo de WhatsApp estão cientes do monitoramento.</li>
        <li>Não usar o produto para fins ilícitos.</li>
      </ul>

      <h2>4. Pagamento</h2>
      <ul>
        <li>Trial gratuito de {BRAND.pricing.trialDays} dias, sem necessidade de cartão.</li>
        <li>
          Após o trial: cobrança mensal de R${" "}
          {monthlyFmt} ou anual com desconto.
        </li>
        <li>Cancelamento a qualquer momento em /app/cobranca; valida até o fim do ciclo pago.</li>
      </ul>

      <h2>5. Suspensão</h2>
      <p>
        Falta de pagamento por mais de {BRAND.pricing.blockAfterDay} dias após o vencimento
        suspende o acesso. Seus dados permanecem por 60 dias para reativação; depois disso,
        seguimos a política de exclusão.
      </p>

      <h2>6. Limitações</h2>
      <ul>
        <li>
          A integração de WhatsApp depende de bibliotecas não-oficiais (em fase inicial) ou
          da WhatsApp Cloud API. Indisponibilidades momentâneas podem ocorrer.
        </li>
        <li>
          Classificação por IA não é 100% precisa. Transações com confiança abaixo de 85%
          ficam marcadas como &ldquo;pendentes de revisão&rdquo; pra você ajustar.
        </li>
      </ul>

      <h2>7. Limitação de responsabilidade</h2>
      <p>
        O {BRAND.name} é uma ferramenta auxiliar de controle financeiro. Não somos
        responsáveis por decisões financeiras tomadas com base nos relatórios. Recomendamos
        sempre conferir com extratos oficiais.
      </p>

      <h2>8. Contato</h2>
      <p>
        Dúvidas: <a href={`mailto:${BRAND.email.support}`}>{BRAND.email.support}</a>.
      </p>
    </>
  );
}
