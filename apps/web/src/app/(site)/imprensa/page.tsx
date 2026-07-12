import { Mail, Quote } from "lucide-react";
import { BRAND } from "@/lib/brand";

export const metadata = { title: "Imprensa" };

const facts = [
  { label: "Nome", value: BRAND.name },
  { label: "Categoria", value: "Finanças familiares · IA + WhatsApp" },
  { label: "Onde", value: "Brasil" },
  { label: "Contato de imprensa", value: BRAND.email.support },
];

export default function ImprensaPage() {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">
        Imprensa
      </p>
      <h1 className="mt-3 text-balance text-[2.25rem] leading-[1.05] tracking-tight sm:text-[2.75rem]">
        Kit de <span className="display-serif italic">imprensa</span>
      </h1>
      <p className="mt-4 max-w-xl text-pretty text-[15.5px] leading-relaxed text-[var(--color-fg-muted)]">
        Materiais e informações para jornalistas e criadores de conteúdo. Precisa
        de algo específico? Escreva pra gente.
      </p>

      <div className="mt-10 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-soft">
        <Quote className="h-5 w-5 text-[var(--color-primary)]" />
        <p className="mt-3 display-serif text-xl italic leading-snug text-[var(--color-fg)]">
          {BRAND.oneLiner}
        </p>
      </div>

      <dl className="mt-6 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-border)] sm:grid-cols-2">
        {facts.map((f) => (
          <div key={f.label} className="bg-[var(--color-surface)] p-5">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
              {f.label}
            </dt>
            <dd className="mt-1 text-sm font-medium text-[var(--color-fg)]">{f.value}</dd>
          </div>
        ))}
      </dl>

      <a
        href={`mailto:${BRAND.email.support}`}
        className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary)]"
      >
        <Mail className="h-4 w-4" />
        Falar com a imprensa
      </a>
    </div>
  );
}
