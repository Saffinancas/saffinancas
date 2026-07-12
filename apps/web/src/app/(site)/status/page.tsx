import { CheckCircle2 } from "lucide-react";
import { BRAND } from "@/lib/brand";

export const metadata = { title: "Status da plataforma" };

const components = [
  { name: "Aplicativo web", desc: "Dashboard, login e cobrança" },
  { name: "Captura por WhatsApp", desc: "Ingestão de mensagens do grupo" },
  { name: "Classificação por IA", desc: "Categorização de transações" },
  { name: "Pagamentos", desc: "Assinaturas e faturamento" },
];

export default function StatusPage() {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
        Status
      </p>
      <h1 className="mt-3 text-balance text-[2.25rem] leading-[1.05] tracking-tight sm:text-[2.75rem]">
        Status da <span className="display-serif italic">plataforma</span>
      </h1>

      <div className="mt-8 flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-income)]/30 bg-[var(--color-income-soft)] p-5">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-income)] opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--color-income)]" />
        </span>
        <p className="text-sm font-medium text-[var(--color-income)]">
          Todos os sistemas operando normalmente
        </p>
      </div>

      <ul className="mt-6 divide-y divide-[var(--color-border)] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        {components.map((c) => (
          <li key={c.name} className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-sm font-medium">{c.name}</p>
              <p className="text-xs text-[var(--color-fg-subtle)]">{c.desc}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-income)]">
              <CheckCircle2 className="h-4 w-4" />
              Operacional
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs leading-relaxed text-[var(--color-fg-subtle)]">
        Incidentes e manutenções programadas serão publicados nesta página. Para
        relatar um problema, escreva para{" "}
        <a
          href={`mailto:${BRAND.email.support}`}
          className="link-underline text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
        >
          {BRAND.email.support}
        </a>
        .
      </p>
    </div>
  );
}
