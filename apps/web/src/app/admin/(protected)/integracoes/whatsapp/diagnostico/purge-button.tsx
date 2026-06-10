"use client";

import * as React from "react";
import { Loader2, AlertCircle, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { purgeLegacySessionsAction, listWorkerSessionsAction } from "./actions";

export function PurgeLegacyButton() {
  const [pending, startTransition] = React.useTransition();
  const [result, setResult] = React.useState<
    | { ok: true; removed: string[] }
    | { ok: false; error: string }
    | null
  >(null);
  const [sessions, setSessions] = React.useState<
    | { familyId: string; status: string; pairedPhone: string | null; isSafGlobal: boolean }[]
    | null
  >(null);

  React.useEffect(() => {
    listWorkerSessionsAction().then((r) => {
      if (r.ok) setSessions((r.data as { sessions: typeof sessions }).sessions ?? null);
    });
  }, []);

  function onClick() {
    if (
      !confirm(
        "Vai matar TODAS as sessões whatsapp-web.js exceto a Saf global. Tem certeza?",
      )
    ) {
      return;
    }
    setResult(null);
    startTransition(async () => {
      const r = await purgeLegacySessionsAction();
      if (r.ok) {
        const d = r.data as { removed: string[] };
        setResult({ ok: true, removed: d.removed });
        // Refresh list
        const l = await listWorkerSessionsAction();
        if (l.ok) setSessions((l.data as { sessions: typeof sessions }).sessions ?? null);
      } else {
        setResult({ ok: false, error: r.error });
      }
    });
  }

  const legacyCount = sessions?.filter((s) => !s.isSafGlobal).length ?? 0;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-soft">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
        Manutenção
      </p>
      <h3 className="mt-1 text-base font-semibold tracking-tight">
        Sessões whatsapp-web.js ativas
      </h3>

      {sessions ? (
        <ul className="mt-3 space-y-1 text-xs">
          {sessions.map((s) => (
            <li
              key={s.familyId}
              className={
                "flex items-center justify-between rounded-[var(--radius)] px-2 py-1 font-mono " +
                (s.isSafGlobal
                  ? "bg-[var(--color-income-soft)]/40 text-[var(--color-fg)]"
                  : "bg-[var(--color-warning-soft)]/40 text-[var(--color-fg-muted)]")
              }
            >
              <span>{s.familyId}</span>
              <span className="text-[10px]">
                {s.isSafGlobal ? "saf-global ✓" : "LEGADO"} · {s.status} ·{" "}
                {s.pairedPhone ?? "—"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-[var(--color-fg-muted)]">Carregando…</p>
      )}

      {legacyCount > 0 && (
        <p className="mt-3 text-xs text-[var(--color-warning)]">
          ⚠ {legacyCount} sessão(ões) legada(s) detectada(s). Podem interferir na
          captura.
        </p>
      )}

      <div className="mt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClick}
          disabled={pending || legacyCount === 0}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Matar legadas
        </Button>
      </div>

      {result && result.ok && (
        <div className="mt-3 flex items-start gap-2 rounded-[var(--radius)] border border-[var(--color-income)]/30 bg-[var(--color-income-soft)] p-3 text-xs text-[var(--color-income)]">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Removidas: {result.removed.length === 0 ? "nenhuma" : result.removed.join(", ")}
          </span>
        </div>
      )}
      {result && !result.ok && (
        <div className="mt-3 flex items-start gap-2 rounded-[var(--radius)] border border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)] p-3 text-xs text-[var(--color-expense)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{result.error}</span>
        </div>
      )}
    </div>
  );
}
