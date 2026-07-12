"use client";

import * as React from "react";
import { Loader2, Check, AlertCircle, Plus, Trash2, Link2, Link2Off } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  isSafeHref,
  FOOTER_LIMITS,
  type FooterColumn,
  type FooterConfig,
} from "@/lib/site-footer";
import { updateFooterAction } from "./actions";

type Props = { initial: FooterConfig };

export function FooterEditor({ initial }: Props) {
  const [columns, setColumns] = React.useState<FooterColumn[]>(initial.columns);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  const changed = React.useMemo(
    () => JSON.stringify(columns) !== JSON.stringify(initial.columns),
    [columns, initial.columns],
  );

  const firstInvalid = React.useMemo(() => {
    for (const col of columns) {
      if (!col.title.trim()) return "Toda coluna precisa de um título.";
      if (col.links.length === 0) return `A coluna "${col.title || "sem título"}" precisa de um link.`;
      for (const l of col.links) {
        if (!l.label.trim()) return `Há um link sem texto na coluna "${col.title}".`;
        if (!isSafeHref(l.href)) return `Link inválido: "${l.label || l.href || "vazio"}".`;
      }
    }
    return null;
  }, [columns]);

  function mutateColumn(ci: number, fn: (c: FooterColumn) => FooterColumn) {
    setColumns((prev) => prev.map((c, i) => (i === ci ? fn(c) : c)));
    setSaved(false);
  }

  function updateTitle(ci: number, title: string) {
    mutateColumn(ci, (c) => ({ ...c, title }));
  }
  function addColumn() {
    if (columns.length >= FOOTER_LIMITS.columns) return;
    setColumns((prev) => [...prev, { title: "Nova coluna", links: [{ label: "", href: "" }] }]);
    setSaved(false);
  }
  function removeColumn(ci: number) {
    setColumns((prev) => prev.filter((_, i) => i !== ci));
    setSaved(false);
  }
  function updateLink(ci: number, li: number, patch: Partial<{ label: string; href: string }>) {
    mutateColumn(ci, (c) => ({
      ...c,
      links: c.links.map((l, i) => (i === li ? { ...l, ...patch } : l)),
    }));
  }
  function addLink(ci: number) {
    mutateColumn(ci, (c) =>
      c.links.length >= FOOTER_LIMITS.linksPerColumn
        ? c
        : { ...c, links: [...c.links, { label: "", href: "" }] },
    );
  }
  function removeLink(ci: number, li: number) {
    mutateColumn(ci, (c) => ({ ...c, links: c.links.filter((_, i) => i !== li) }));
  }

  function onSave() {
    setError(null);
    if (firstInvalid) {
      setError(firstInvalid);
      return;
    }
    startTransition(async () => {
      const r = await updateFooterAction({ columns });
      if (!r.ok) {
        setError(r.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    });
  }

  function onReset() {
    setColumns(initial.columns);
    setError(null);
    setSaved(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
      {/* Editor */}
      <div className="space-y-4">
        {columns.map((col, ci) => (
          <div
            key={ci}
            className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-soft"
          >
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor={`col-${ci}`} className="text-xs">
                  Título da coluna
                </Label>
                <Input
                  id={`col-${ci}`}
                  value={col.title}
                  maxLength={FOOTER_LIMITS.title}
                  onChange={(e) => updateTitle(ci, e.target.value)}
                  placeholder="Ex.: Empresa"
                  className="mt-1 font-medium"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeColumn(ci)}
                aria-label={`Remover coluna ${col.title}`}
                className="text-[var(--color-expense)] hover:bg-[var(--color-expense-soft)]"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <ul className="mt-4 space-y-2.5">
              {col.links.map((l, li) => {
                const hrefOk = isSafeHref(l.href);
                return (
                  <li key={li} className="grid grid-cols-[1fr_1.3fr_auto] items-center gap-2">
                    <Input
                      value={l.label}
                      maxLength={FOOTER_LIMITS.label}
                      onChange={(e) => updateLink(ci, li, { label: e.target.value })}
                      placeholder="Texto"
                      aria-label="Texto do link"
                    />
                    <div className="relative">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">
                        {hrefOk ? (
                          <Link2 className="h-3.5 w-3.5 text-[var(--color-income)]" />
                        ) : (
                          <Link2Off className="h-3.5 w-3.5 text-[var(--color-fg-subtle)]" />
                        )}
                      </span>
                      <Input
                        value={l.href}
                        onChange={(e) => updateLink(ci, li, { href: e.target.value })}
                        placeholder="/pagina, /#secao, mailto:…"
                        aria-label="Destino do link"
                        aria-invalid={l.href.length > 0 && !hrefOk}
                        className={
                          "pl-8 " +
                          (l.href.length > 0 && !hrefOk
                            ? "border-[var(--color-expense)]/50"
                            : "")
                        }
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLink(ci, li)}
                      aria-label="Remover link"
                      className="text-[var(--color-fg-subtle)] hover:text-[var(--color-expense)]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>

            {col.links.length < FOOTER_LIMITS.linksPerColumn && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addLink(ci)}
                className="mt-3 text-[var(--color-primary)]"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar link
              </Button>
            )}
          </div>
        ))}

        {columns.length < FOOTER_LIMITS.columns && (
          <Button variant="secondary" onClick={addColumn} className="w-full">
            <Plus className="h-4 w-4" /> Adicionar coluna
          </Button>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button onClick={onSave} disabled={pending || !changed || !!firstInvalid}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4 text-[var(--color-income)]" />
            ) : null}
            {saved ? "Salvo" : "Salvar rodapé"}
          </Button>
          {changed && (
            <Button variant="ghost" onClick={onReset} disabled={pending}>
              Descartar
            </Button>
          )}
          {!changed && (
            <Badge variant="default" className="text-[10px]">
              Sem alterações
            </Badge>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-[var(--radius)] border border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)] p-3 text-xs text-[var(--color-expense)]">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
          Preview · como aparece no site
        </p>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-6">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
            {columns.map((col, ci) => (
              <div key={ci}>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg-subtle)]">
                  {col.title || "—"}
                </p>
                <ul className="mt-3 space-y-2">
                  {col.links.map((l, li) => (
                    <li
                      key={li}
                      className="truncate text-sm text-[var(--color-fg-muted)]"
                      title={l.href}
                    >
                      {l.label || <span className="italic opacity-60">sem texto</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-[var(--color-fg-subtle)]">
          Dica: use <code className="text-[var(--color-fg-muted)]">/#precos</code> para rolar
          até uma seção da home a partir de qualquer página. Links externos abrem em nova aba.
        </p>
      </div>
    </div>
  );
}
