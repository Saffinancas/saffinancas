import Link from "next/link";
import { Mail, ShieldCheck, MessageSquare, ArrowRight } from "lucide-react";
import { BRAND } from "@/lib/brand";

export const metadata = { title: "Contato" };

const channels = [
  {
    icon: Mail,
    title: "Suporte",
    desc: "Dúvidas sobre a conta, cobrança ou uso do produto. Respondemos em até 1 dia útil.",
    action: BRAND.email.support,
    href: `mailto:${BRAND.email.support}`,
  },
  {
    icon: ShieldCheck,
    title: "Privacidade & dados (DPO)",
    desc: "Pedidos de acesso, correção ou exclusão de dados pessoais, conforme a LGPD.",
    action: BRAND.email.dpo,
    href: `mailto:${BRAND.email.dpo}`,
  },
];

export default function ContatoPage() {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
        Contato
      </p>
      <h1 className="mt-3 text-balance text-[2.25rem] leading-[1.05] tracking-tight sm:text-[2.75rem]">
        Fale com a <span className="display-serif italic">gente</span>
      </h1>
      <p className="mt-4 max-w-xl text-pretty text-[15.5px] leading-relaxed text-[var(--color-fg-muted)]">
        Somos um time pequeno e atento. Escolha o canal certo e a mensagem chega
        direto em quem resolve.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {channels.map((c) => (
          <a
            key={c.title}
            href={c.href}
            className="group rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-soft transition-colors hover:border-[var(--color-primary)]/40"
          >
            <c.icon className="h-5 w-5 text-[var(--color-primary)]" />
            <h2 className="mt-4 text-base font-semibold tracking-tight">{c.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-fg-muted)]">
              {c.desc}
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)]">
              {c.action}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </a>
        ))}
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-6">
        <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-income)]" />
        <div>
          <h2 className="text-base font-semibold tracking-tight">Já é cliente?</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-fg-muted)]">
            Grande parte do suporte acontece pelo próprio WhatsApp que você já usa
            com a família. Ainda não tem conta?{" "}
            <Link href="/assinar" className="link-underline font-medium text-[var(--color-fg)]">
              Comece por aqui
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
