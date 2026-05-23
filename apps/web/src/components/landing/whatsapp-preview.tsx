import { Check, CheckCheck } from "lucide-react";

type Msg = {
  from: string;
  initials: string;
  hue: number;
  text: string;
  time: string;
  receipt?: "sent" | "delivered" | "read";
  aiTag?: "expense" | "income";
  aiAmount?: string;
  aiCategory?: string;
};

const messages: Msg[] = [
  {
    from: "Camila",
    initials: "CM",
    hue: 200,
    text: "paguei 320 no mercado agora",
    time: "13:42",
    receipt: "read",
    aiTag: "expense",
    aiAmount: "R$ 320,00",
    aiCategory: "Mercado",
  },
  {
    from: "Pedro",
    initials: "PD",
    hue: 25,
    text: "caí com Pix do meu freelance, 1.850 ✨",
    time: "14:05",
    receipt: "read",
    aiTag: "income",
    aiAmount: "R$ 1.850,00",
    aiCategory: "Renda extra",
  },
  {
    from: "Vó Ana",
    initials: "VA",
    hue: 320,
    text: "comprei remédio da pressão, R$ 67,40",
    time: "16:18",
    receipt: "delivered",
    aiTag: "expense",
    aiAmount: "R$ 67,40",
    aiCategory: "Saúde",
  },
];

export function WhatsappPreview() {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-pop">
      {/* header estilo WhatsApp */}
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-3">
        <div
          aria-hidden
          className="grid h-9 w-9 place-items-center rounded-full bg-[oklch(85%_0.06_140)] text-sm font-semibold text-[oklch(30%_0.08_140)]"
        >
          🏠
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Família 🏠</p>
          <p className="truncate text-[11px] text-[var(--color-fg-subtle)]">
            Camila, Pedro, Vó Ana, Tia Bia
          </p>
        </div>
      </div>

      {/* mensagens */}
      <div className="flex flex-col gap-3 bg-[var(--color-bg-muted)] px-3 py-4">
        {messages.map((m, i) => (
          <div key={i} className="flex items-end gap-2">
            <Avatar initials={m.initials} hue={m.hue} />
            <div className="max-w-[78%]">
              <div className="rounded-2xl rounded-bl-[6px] bg-[var(--color-surface)] px-3 py-2 shadow-soft">
                <p className="text-[11px] font-semibold" style={{ color: `oklch(45% 0.12 ${m.hue})` }}>
                  {m.from}
                </p>
                <p className="mt-0.5 text-[13px] leading-snug">{m.text}</p>
                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[var(--color-fg-subtle)]">
                  <span>{m.time}</span>
                  {m.receipt === "read" ? (
                    <CheckCheck className="h-3 w-3 text-[oklch(60%_0.15_220)]" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                </div>
              </div>

              {m.aiTag && (
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 shadow-soft">
                  <span
                    aria-hidden
                    className={
                      "grid h-5 w-5 place-items-center rounded-full text-[11px] " +
                      (m.aiTag === "income"
                        ? "bg-[var(--color-income-soft)] text-[var(--color-income)]"
                        : "bg-[var(--color-expense-soft)] text-[var(--color-expense)]")
                    }
                  >
                    {m.aiTag === "income" ? "+" : "−"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium leading-tight">
                      <span className="tabular">{m.aiAmount}</span>{" "}
                      <span className="text-[var(--color-fg-muted)]">· {m.aiCategory}</span>
                    </p>
                    <p className="text-[10px] text-[var(--color-fg-subtle)]">
                      Classificado por IA · 96% confiança
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Avatar({ initials, hue }: { initials: string; hue: number }) {
  return (
    <div
      aria-hidden
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold"
      style={{
        background: `oklch(88% 0.06 ${hue})`,
        color: `oklch(30% 0.08 ${hue})`,
      }}
    >
      {initials}
    </div>
  );
}
