"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { BRAND } from "@/lib/brand";

const items = [
  {
    q: "Vocês leem todas as minhas mensagens?",
    a: `Só as mensagens que cada membro vinculado manda diretamente pro número da Saf (DM 1:1). Nada de conversas pessoais, nada de grupos. O conteúdo bruto fica criptografado e é descartado após 90 dias — só a transação estruturada (valor, data, categoria) permanece. Você pode pedir exclusão total a qualquer momento — direito garantido pela LGPD.`,
  },
  {
    q: "Como funciona a parte de investimentos?",
    a: `Você cadastra manualmente suas posições (ações, FIIs, ETFs, CDB, Tesouro, fundos) e proventos. As cotações se atualizam com um clique via APIs gratuitas (Brapi.dev pra B3, CoinGecko pra cripto). Quando o suporte ao Pluggy Investments entrar, a sincronização passa a ser automática para XP, Rico, Clear, BTG, NuInvest, Inter, Itaú, Bradesco, Warren e mais. Dividendos e rendimentos de FII recebidos viram receita no dashboard automaticamente.`,
  },
  {
    q: "Posso registrar criptomoedas?",
    a: `Sim. Bitcoin, Ethereum, stablecoins e qualquer altcoin que tenha cotação em BRL. Saldo em exchanges (Binance, Mercado Bitcoin, Coinbase, Foxbit, Kraken, Bitso, NovaDAX) ou em carteira própria (self-custody, informando o endereço público). Cotação refresh manual via CoinGecko, sem precisar de chave.`,
  },
  {
    q: "Dá pra controlar imóveis e aluguéis?",
    a: `Dá. Cadastre cada bem (imóvel, veículo, obra de arte) com custo de aquisição e valor atual. A cada vez que você reavalia, fica um snapshot na timeline mostrando a variação. Para imóveis alugados, cadastre o contrato (valor, dia do vencimento, índice de reajuste — IGP-M / IPCA / INPC) e registre cada pagamento recebido — vira receita automaticamente.`,
  },
  {
    q: "Vocês ajudam com o Imposto de Renda?",
    a: `O painel de IR mostra a sua restituição estimada em tempo real, com cálculo da alíquota marginal e cap de 6% nas doações. Você clica em cada categoria dedutível (Saúde, Educação, Previdência PGBL, etc.) e vê quanto cada gasto vai te economizar de imposto. Bens, investimentos e cripto entram na ficha "Bens e Direitos" pré-organizados. Tem export em JSON pra copiar pro programa da Receita. Importação direta no IRPF ainda não — o formato .DEC é proprietário.`,
  },
  {
    q: "Funciona com o meu banco?",
    a: `A captura via WhatsApp funciona com qualquer banco — basta alguém da família mencionar o gasto. Para saldo e extrato em tempo real, conectamos via Open Finance (Pluggy): Nubank, Inter, Itaú, Bradesco, Santander, Banco do Brasil, Caixa, C6 e outros. Essa parte é opcional.`,
  },
  {
    q: "Posso cancelar quando quiser?",
    a: `Sim, em dois cliques. Sem ligação, sem retenção, sem multa. ${BRAND.pricing.trialDays} dias de garantia integral — se mudar de ideia nesse período, devolvemos 100% sem perguntas.`,
  },
  {
    q: "Posso usar a minha própria chave de IA?",
    a: `Sim, sob liberação da equipe Saf. No modelo padrão, o custo da IA está embutido na sua mensalidade e você nem vê qual motor estamos usando. Se você prefere pagar a IA direto na Anthropic, OpenAI ou Google (em geral mais barato pra quem tem volume baixo), peça pra gente habilitar BYOK na sua conta — você cadastra a chave, a Saf usa exclusivamente ela pra processar suas mensagens.`,
  },
  {
    q: "Tem plano gratuito?",
    a: `Não existe plano gratuito público — todo mundo começa com ${BRAND.pricing.trialDays} dias de trial e depois entra no plano pago. Em casos especiais (parceiros, indicadores, casos sociais), a administração da Saf pode conceder acesso gratuito vitalício individualmente. Não tente pedir só pra economizar a mensalidade.`,
  },
  {
    q: "Meus dados ficam seguros?",
    a: `Criptografia em trânsito (TLS 1.3) e em repouso. Chaves de API armazenadas com AES-256-GCM. Princípio do menor privilégio. Logs de auditoria. Conformidade com a LGPD — temos DPO designado e canal aberto pra solicitações de titulares.`,
  },
  {
    q: "E se eu não usar WhatsApp?",
    a: `O produto foi pensado pra famílias que já usam um grupo no WhatsApp como ponto central. Se a sua não tem esse hábito, você ainda usa todo o resto: lança transações manualmente, conecta contas via Open Finance, registra investimentos, patrimônio e gera o relatório de IR. O WhatsApp é o diferencial, não o único valor.`,
  },
  {
    q: "Posso instalar como app no celular?",
    a: `Sim. ${BRAND.name} é um PWA — abra no navegador, toque em "Adicionar à tela inicial" e tem um ícone como qualquer outro app. App nativo (iOS e Android) está no roadmap.`,
  },
];

function FaqItem({ q, a, defaultOpen = false }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="border-b border-[var(--color-border)] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-[15.5px] font-medium text-[var(--color-fg)]">{q}</span>
        <ChevronDown
          className={
            "h-5 w-5 shrink-0 text-[var(--color-fg-muted)] transition-transform " +
            (open ? "rotate-180" : "")
          }
          aria-hidden
        />
      </button>
      <div
        className={
          "grid overflow-hidden transition-[grid-template-rows] duration-300 " +
          (open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")
        }
      >
        <div className="overflow-hidden">
          <p className="pb-5 pr-8 text-[14.5px] leading-relaxed text-[var(--color-fg-muted)]">
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FAQ() {
  return (
    <section id="faq" className="border-t border-[var(--color-border)] py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-primary)]">
            Perguntas frequentes
          </p>
          <h2 className="mt-3 text-balance text-3xl tracking-tight sm:text-4xl lg:text-[2.4rem] lg:leading-[1.1]">
            O que toda família pergunta{" "}
            <span className="display-serif italic">antes de assinar</span>
          </h2>
        </div>

        <div className="mt-12 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 shadow-soft">
          {items.map((it, i) => (
            <FaqItem key={it.q} q={it.q} a={it.a} defaultOpen={i === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}
