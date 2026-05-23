import { Construction } from "lucide-react";

export function ComingSoon({
  title,
  description,
  bullets,
}: {
  title: string;
  description: string;
  bullets: string[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-muted)]">{description}</p>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center shadow-soft">
        <span className="inline-grid h-12 w-12 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <Construction className="h-5 w-5" />
        </span>
        <h2 className="mt-4 text-base font-semibold">Em breve</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-fg-muted)]">
          O backend já está pronto pra isto — a UI vem na próxima entrega. O que entra aqui:
        </p>
        <ul className="mx-auto mt-4 max-w-md space-y-1.5 text-left text-sm text-[var(--color-fg-muted)]">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <span className="mt-1.5 inline-block h-1 w-1 rounded-full bg-[var(--color-primary)]" />
              {b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
