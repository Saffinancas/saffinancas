"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateDemoUsage, clearDemoUsage } from "./demo-action";

export function GenerateDemoData() {
  const router = useRouter();
  const [loading, setLoading] = React.useState<"gen" | "clr" | null>(null);

  async function gen() {
    setLoading("gen");
    try {
      const res = await generateDemoUsage();
      alert(
        `${res.inserted} eventos de uso de IA criados em ${res.families} famílias (mês atual). Atualize a página.`,
      );
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function clr() {
    if (!confirm("Apagar todos os eventos de IA do mês atual?")) return;
    setLoading("clr");
    try {
      await clearDemoUsage();
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={gen} disabled={loading !== null}>
          {loading === "gen" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Popular dados de demo
        </Button>
        <Button variant="ghost" size="sm" onClick={clr} disabled={loading !== null}>
          {loading === "clr" && <Loader2 className="h-4 w-4 animate-spin" />}
          Limpar
        </Button>
      </div>
      <p className="text-[10px] text-[var(--color-fg-subtle)]">
        Só pra dev: insere ai_usage_events sintéticos.
      </p>
    </div>
  );
}
