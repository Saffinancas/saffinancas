"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Loader2,
  Home,
  Car,
  Image as ImageIcon,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader, StatCard, Section } from "@/components/ui/page-header";
import { BentoCard } from "@/components/ui/bento";
import { createAsset } from "@/lib/patrimony";

type Asset = {
  id: string;
  name: string;
  type: "real_estate" | "vehicle" | "artwork" | "equipment" | "other";
  acquisitionDate: string;
  acquisitionCostCents: number;
  currentValueCents: number;
};

const TYPE_LABELS: Record<Asset["type"], { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  real_estate: { label: "Imóvel", icon: Home },
  vehicle: { label: "Veículo", icon: Car },
  artwork: { label: "Obra de arte", icon: ImageIcon },
  equipment: { label: "Equipamento", icon: Package },
  other: { label: "Outro", icon: Package },
};

export function PatrimonyClient({ assets }: { assets: Asset[] }) {
  const [open, setOpen] = React.useState(false);

  const totalValue = assets.reduce((acc, a) => acc + a.currentValueCents, 0);
  const totalCost = assets.reduce((acc, a) => acc + a.acquisitionCostCents, 0);
  const variation = totalValue - totalCost;
  const variationPct = totalCost > 0 ? (variation / totalCost) * 100 : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Plataforma · Patrimônio"
        title={
          <>
            Seus <span className="display-serif italic">bens</span> e a valorização deles
          </>
        }
        description="Imóveis, veículos e outros bens. Aluguéis viram receita recorrente e tudo conecta na ficha de Bens e Direitos do IR."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Cadastrar bem
          </Button>
        }
        tone="primary"
      />

      <div className="grid auto-rows-[minmax(120px,_auto)] grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <BentoCard
          span="col-span-2 lg:row-span-2"
          tone={variation >= 0 ? "primary" : "expense"}
          eyebrow="Valor atual"
          metric={
            <span className="num">
              <span className="text-base font-normal text-[var(--color-fg-muted)] align-top mr-1">
                R$
              </span>
              {(totalValue / 100).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          }
          footnote={
            <span className="inline-flex items-center gap-1.5">
              {variation >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-[var(--color-income)]" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-[var(--color-expense)]" />
              )}
              <span
                className={
                  variation >= 0
                    ? "text-[var(--color-income)] font-medium"
                    : "text-[var(--color-expense)] font-medium"
                }
              >
                {variation >= 0 ? "+" : ""}
                {variationPct.toFixed(1)}%
              </span>
              <span>vs. aquisição</span>
            </span>
          }
        >
          <p className="mt-2 text-[11px] text-[var(--color-fg-subtle)]">
            {assets.length} {assets.length === 1 ? "bem cadastrado" : "bens cadastrados"}
          </p>
        </BentoCard>

        <StatCard
          tone="default"
          label="Custo de aquisição"
          value={
            <span className="num">
              <span className="text-sm font-normal text-[var(--color-fg-muted)] align-top mr-1">
                R$
              </span>
              {(totalCost / 100).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          }
          icon={<Wallet className="h-4 w-4" />}
          trend="quanto você pagou"
        />

        <StatCard
          tone={variation >= 0 ? "income" : "expense"}
          label="Variação"
          value={
            <span className="num">
              <span className="text-sm font-normal text-[var(--color-fg-muted)] align-top mr-1">
                R$
              </span>
              {(Math.abs(variation) / 100).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          }
          icon={
            variation >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-[var(--color-income)]" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-[var(--color-expense)]" />
            )
          }
          trend={
            <span className="inline-flex items-center gap-1">
              <span
                className={
                  variation >= 0
                    ? "text-[var(--color-income)] font-medium"
                    : "text-[var(--color-expense)] font-medium"
                }
              >
                {variation >= 0 ? "+" : ""}
                {variationPct.toFixed(1)}%
              </span>
              <span>acumulada</span>
            </span>
          }
        />
      </div>

      {assets.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center shadow-soft">
          <p className="text-sm font-medium">Nenhum bem cadastrado ainda</p>
          <p className="mx-auto mt-2 max-w-sm text-xs text-[var(--color-fg-muted)]">
            Cadastre um imóvel pra começar a controlar valorização e aluguéis.
          </p>
          <Button className="mt-5" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Cadastrar bem
          </Button>
        </div>
      ) : (
        <Section eyebrow="Inventário" title="Bens cadastrados">
          <div className="grid gap-3 sm:grid-cols-2">
            {assets.map((a) => {
              const meta = TYPE_LABELS[a.type];
              const v = a.currentValueCents - a.acquisitionCostCents;
              const vPct = a.acquisitionCostCents > 0 ? (v / a.acquisitionCostCents) * 100 : 0;
              return (
                <Link
                  key={a.id}
                  href={`/app/patrimonio/${a.id}`}
                  className="group rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-pop hover:bg-[var(--color-surface-muted)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-[var(--radius)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                        <meta.icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-semibold">{a.name}</p>
                        <p className="text-xs text-[var(--color-fg-muted)]">{meta.label}</p>
                      </div>
                    </div>
                    <Badge variant={v >= 0 ? "income" : "expense"}>
                      {v >= 0 ? "+" : ""}
                      {vPct.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <p className="num tabular text-xl font-semibold">
                      <span className="text-xs font-normal text-[var(--color-fg-muted)]">R$</span>{" "}
                      {(a.currentValueCents / 100).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-[10px] text-[var(--color-fg-subtle)]">
                      Adquirido {new Date(a.acquisitionDate).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      <AssetDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function AssetDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<Asset["type"]>("real_estate");
  const [acqDate, setAcqDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [acqCost, setAcqCost] = React.useState("");
  const [curValue, setCurValue] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setName("");
      setType("real_estate");
      setAcqDate(new Date().toISOString().slice(0, 10));
      setAcqCost("");
      setCurValue("");
      setNotes("");
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const acqCents = parseAmountToCents(acqCost);
    const curCents = curValue ? parseAmountToCents(curValue) : acqCents;
    if (!acqCents) {
      setError("Valor de aquisição inválido.");
      return;
    }
    setLoading(true);
    try {
      await createAsset({
        name,
        type,
        acquisitionDate: acqDate,
        acquisitionCostCents: acqCents,
        currentValueCents: curCents ?? acqCents,
        notes: notes || null,
      });
      router.refresh();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar bem</DialogTitle>
          <DialogDescription>
            O bem entra na sua lista de patrimônio + ficha &ldquo;Bens e Direitos&rdquo; do IR.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="a-name">Nome</Label>
              <Input
                id="a-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Apartamento Vila Madalena"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="a-type">Tipo</Label>
              <select
                id="a-type"
                value={type}
                onChange={(e) => setType(e.target.value as Asset["type"])}
                className="h-10 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
              >
                <option value="real_estate">Imóvel</option>
                <option value="vehicle">Veículo</option>
                <option value="artwork">Obra de arte</option>
                <option value="equipment">Equipamento</option>
                <option value="other">Outro</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="a-date">Data de aquisição</Label>
              <Input
                id="a-date"
                type="date"
                required
                value={acqDate}
                onChange={(e) => setAcqDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="a-cost">Valor pago (R$)</Label>
              <Input
                id="a-cost"
                inputMode="decimal"
                required
                value={acqCost}
                onChange={(e) => setAcqCost(e.target.value)}
                placeholder="450.000,00"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="a-current">Valor atual (opcional)</Label>
            <Input
              id="a-current"
              inputMode="decimal"
              value={curValue}
              onChange={(e) => setCurValue(e.target.value)}
              placeholder="(deixe vazio pra usar o valor de aquisição)"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="a-notes">Notas (opcional)</Label>
            <Input
              id="a-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Matrícula 123.456, Cartório 5º"
            />
          </div>
          {error && (
            <p className="rounded-[var(--radius)] border border-[var(--color-expense)]/30 bg-[var(--color-expense-soft)] px-3 py-2 text-xs text-[var(--color-expense)]">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Cadastrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function parseAmountToCents(input: string): number | null {
  const cleaned = input.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

