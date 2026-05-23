"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Check, TrendingUp, RefreshCw } from "lucide-react";
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
import { formatBRL } from "@/lib/utils";
import {
  createHolding,
  deleteHolding,
  createDividend,
  deleteDividend,
  markDividendReceived,
} from "@/lib/investments";
import { refreshB3Quotes } from "@/lib/quotes";

type Holding = {
  id: string;
  assetClass: "stock" | "fii" | "etf" | "fixed_income" | "fund" | "other";
  ticker: string;
  name: string;
  brokerage: string;
  quantity: number;
  avgCostCents: number;
  currentPriceCents: number | null;
};

type Dividend = {
  id: string;
  ticker: string;
  kind: "dividend" | "jcp" | "rent" | "amortization" | "other";
  amountCents: number;
  payableAt: string;
  status: "pending" | "received" | "canceled";
};

export function B3Client({
  holdings,
  dividends,
}: {
  holdings: Holding[];
  dividends: Dividend[];
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<"posicoes" | "proventos">("posicoes");
  const [addHolding, setAddHolding] = React.useState(false);
  const [addDividend, setAddDividend] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [refreshResult, setRefreshResult] = React.useState<string | null>(null);

  async function refresh() {
    setRefreshing(true);
    setRefreshResult(null);
    try {
      const res = await refreshB3Quotes();
      const msg = `${res.updated} cotação(ões) atualizadas via Brapi.dev${
        res.failed.length > 0 ? ` · ${res.failed.length} não encontradas: ${res.failed.join(", ")}` : ""
      }`;
      setRefreshResult(msg);
      router.refresh();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Renda variável + fixa (B3)</h1>
          <p className="mt-1 text-sm text-[var(--color-fg-muted)]">
            Ações, FIIs, ETFs, Tesouro, CDB, fundos. Proventos viram receita quando recebidos.
          </p>
        </div>
        {holdings.length > 0 && (
          <Button variant="secondary" size="sm" onClick={refresh} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar cotações
          </Button>
        )}
      </div>

      {refreshResult && (
        <div className="rounded-[var(--radius)] border border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)]/60 px-3 py-2 text-xs text-[var(--color-primary)]">
          {refreshResult}
        </div>
      )}

      <div className="flex gap-2 border-b border-[var(--color-border)]">
        <TabButton active={tab === "posicoes"} onClick={() => setTab("posicoes")}>
          Posições ({holdings.length})
        </TabButton>
        <TabButton active={tab === "proventos"} onClick={() => setTab("proventos")}>
          Proventos ({dividends.length})
        </TabButton>
      </div>

      {tab === "posicoes" ? (
        <PosicoesTab holdings={holdings} onAdd={() => setAddHolding(true)} />
      ) : (
        <ProventosTab dividends={dividends} onAdd={() => setAddDividend(true)} />
      )}

      <HoldingDialog open={addHolding} onOpenChange={setAddHolding} />
      <DividendDialog
        open={addDividend}
        onOpenChange={setAddDividend}
        holdings={holdings.map((h) => ({ id: h.id, ticker: h.ticker }))}
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "border-b-2 px-3 py-2 text-sm font-medium transition-colors " +
        (active
          ? "border-[var(--color-primary)] text-[var(--color-primary)]"
          : "border-transparent text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]")
      }
    >
      {children}
    </button>
  );
}

function PosicoesTab({ holdings, onAdd }: { holdings: Holding[]; onAdd: () => void }) {
  const router = useRouter();
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4" /> Lançar posição
        </Button>
      </div>
      {holdings.length === 0 ? (
        <EmptyHint
          title="Nenhuma posição registrada"
          desc="Lance manualmente ou conecte sua corretora via Pluggy (em breve)."
        />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
                <th className="px-4 py-2.5 font-medium">Ticker</th>
                <th className="px-4 py-2.5 font-medium">Tipo</th>
                <th className="px-4 py-2.5 text-right font-medium">Qtd</th>
                <th className="px-4 py-2.5 text-right font-medium">Preço médio</th>
                <th className="px-4 py-2.5 text-right font-medium">Cotação</th>
                <th className="px-4 py-2.5 text-right font-medium">Posição</th>
                <th className="px-4 py-2.5 text-right font-medium">L/P</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => {
                const cost = h.quantity * h.avgCostCents;
                const market = h.quantity * (h.currentPriceCents ?? h.avgCostCents);
                const profit = market - cost;
                return (
                  <tr key={h.id} className="border-b border-[var(--color-border)] last:border-b-0">
                    <td className="px-4 py-2.5 font-medium">
                      {h.ticker}
                      <p className="text-[10px] text-[var(--color-fg-subtle)]">{h.name}</p>
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      <Badge variant="default">{labelClass(h.assetClass)}</Badge>
                    </td>
                    <td className="num px-4 py-2.5 text-right">{h.quantity}</td>
                    <td className="num px-4 py-2.5 text-right text-xs text-[var(--color-fg-muted)]">
                      {formatBRL(h.avgCostCents)}
                    </td>
                    <td className="num px-4 py-2.5 text-right text-xs">
                      {h.currentPriceCents != null ? formatBRL(h.currentPriceCents) : "—"}
                    </td>
                    <td className="num px-4 py-2.5 text-right font-semibold">
                      {formatBRL(Math.round(market))}
                    </td>
                    <td
                      className={
                        "num px-4 py-2.5 text-right text-xs font-medium " +
                        (profit >= 0
                          ? "text-[var(--color-income)]"
                          : "text-[var(--color-expense)]")
                      }
                    >
                      {profit >= 0 ? "+" : ""}
                      {formatBRL(Math.round(profit))}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={async () => {
                          if (confirm(`Apagar ${h.ticker}?`)) {
                            await deleteHolding(h.id);
                            router.refresh();
                          }
                        }}
                        aria-label="Apagar"
                        className="text-[var(--color-fg-subtle)] hover:text-[var(--color-expense)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProventosTab({
  dividends,
  onAdd,
}: {
  dividends: Dividend[];
  onAdd: () => void;
}) {
  const router = useRouter();
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4" /> Lançar provento
        </Button>
      </div>
      {dividends.length === 0 ? (
        <EmptyHint
          title="Nenhum provento registrado"
          desc="Dividendos, JCP e rendimentos de FII aparecem aqui. Marque como 'recebido' e vira receita automaticamente no dashboard."
        />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-left text-[10px] uppercase tracking-wider text-[var(--color-fg-subtle)]">
                <th className="px-4 py-2.5 font-medium">Pagamento</th>
                <th className="px-4 py-2.5 font-medium">Ticker</th>
                <th className="px-4 py-2.5 font-medium">Tipo</th>
                <th className="px-4 py-2.5 text-right font-medium">Valor</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {dividends.map((d) => (
                <tr key={d.id} className="border-b border-[var(--color-border)] last:border-b-0">
                  <td className="px-4 py-2.5 text-xs">
                    {new Date(d.payableAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-2.5 font-medium">{d.ticker}</td>
                  <td className="px-4 py-2.5 text-xs">
                    <Badge variant="default">{labelDividendKind(d.kind)}</Badge>
                  </td>
                  <td className="num px-4 py-2.5 text-right font-semibold text-[var(--color-income)]">
                    +{formatBRL(d.amountCents)}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {d.status === "received" ? (
                      <Badge variant="income">
                        <Check className="h-3 w-3" /> recebido
                      </Badge>
                    ) : d.status === "pending" ? (
                      <Badge variant="warning">a receber</Badge>
                    ) : (
                      <Badge variant="default">cancelado</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {d.status === "pending" && (
                        <button
                          onClick={async () => {
                            await markDividendReceived(d.id);
                            router.refresh();
                          }}
                          aria-label="Marcar como recebido"
                          className="text-[var(--color-fg-muted)] hover:text-[var(--color-income)]"
                          title="Marcar como recebido (gera receita)"
                        >
                          <TrendingUp className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          if (confirm(`Apagar provento de ${d.ticker}?`)) {
                            await deleteDividend(d.id);
                            router.refresh();
                          }
                        }}
                        aria-label="Apagar"
                        className="text-[var(--color-fg-subtle)] hover:text-[var(--color-expense)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EmptyHint({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-[var(--color-fg-muted)]">{desc}</p>
    </div>
  );
}

function HoldingDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const router = useRouter();
  const [ticker, setTicker] = React.useState("");
  const [name, setName] = React.useState("");
  const [assetClass, setAssetClass] = React.useState<Holding["assetClass"]>("stock");
  const [brokerage, setBrokerage] = React.useState("xp");
  const [quantity, setQuantity] = React.useState("");
  const [avgCost, setAvgCost] = React.useState("");
  const [currentPrice, setCurrentPrice] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setTicker("");
      setName("");
      setAssetClass("stock");
      setBrokerage("xp");
      setQuantity("");
      setAvgCost("");
      setCurrentPrice("");
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const q = Number(quantity.replace(",", "."));
    const ac = parseAmountToCents(avgCost);
    const cp = currentPrice ? parseAmountToCents(currentPrice) : null;
    if (!q || q <= 0 || ac == null) {
      setError("Confira valores.");
      return;
    }
    setLoading(true);
    try {
      await createHolding({
        ticker,
        name: name || ticker,
        assetClass,
        brokerage: brokerage as Holding["brokerage"] as never,
        quantity: q,
        avgCostCents: ac,
        currentPriceCents: cp,
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
          <DialogTitle>Nova posição</DialogTitle>
          <DialogDescription>
            Lance manualmente. Quando a integração com Pluggy entrar, sincroniza sozinha.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="h-ticker">Ticker</Label>
              <Input
                id="h-ticker"
                required
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="PETR4 / HGLG11 / IVVB11"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="h-class">Tipo</Label>
              <select
                id="h-class"
                value={assetClass}
                onChange={(e) => setAssetClass(e.target.value as Holding["assetClass"])}
                className="h-10 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
              >
                <option value="stock">Ação</option>
                <option value="fii">FII</option>
                <option value="etf">ETF</option>
                <option value="fixed_income">Renda fixa</option>
                <option value="fund">Fundo</option>
                <option value="other">Outro</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="h-name">Nome (opcional)</Label>
            <Input
              id="h-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Petrobras PN"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="h-qty">Quantidade</Label>
              <Input
                id="h-qty"
                inputMode="decimal"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="100"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="h-broker">Corretora</Label>
              <select
                id="h-broker"
                value={brokerage}
                onChange={(e) => setBrokerage(e.target.value)}
                className="h-10 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
              >
                <option value="xp">XP</option>
                <option value="rico">Rico</option>
                <option value="clear">Clear</option>
                <option value="btg">BTG</option>
                <option value="nuinvest">NuInvest</option>
                <option value="inter">Inter</option>
                <option value="itau">Itaú</option>
                <option value="bradesco">Bradesco</option>
                <option value="warren">Warren</option>
                <option value="other">Outro</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="h-cost">Preço médio (R$)</Label>
              <Input
                id="h-cost"
                inputMode="decimal"
                required
                value={avgCost}
                onChange={(e) => setAvgCost(e.target.value)}
                placeholder="35,40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="h-price">Cotação atual (opcional)</Label>
              <Input
                id="h-price"
                inputMode="decimal"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                placeholder="38,90"
              />
            </div>
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
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DividendDialog({
  open,
  onOpenChange,
  holdings,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  holdings: Array<{ id: string; ticker: string }>;
}) {
  const router = useRouter();
  const [holdingId, setHoldingId] = React.useState<string>("");
  const [ticker, setTicker] = React.useState("");
  const [kind, setKind] = React.useState<Dividend["kind"]>("dividend");
  const [amount, setAmount] = React.useState("");
  const [payableAt, setPayableAt] = React.useState(new Date().toISOString().slice(0, 10));
  const [received, setReceived] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setHoldingId("");
      setTicker("");
      setKind("dividend");
      setAmount("");
      setReceived(true);
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cents = parseAmountToCents(amount);
    if (!cents) {
      setError("Valor inválido.");
      return;
    }
    const usedTicker = holdingId
      ? holdings.find((h) => h.id === holdingId)?.ticker ?? ticker
      : ticker;
    if (!usedTicker) {
      setError("Informe o ticker.");
      return;
    }
    setLoading(true);
    try {
      await createDividend({
        holdingId: holdingId || null,
        ticker: usedTicker,
        kind,
        amountCents: cents,
        payableAt,
        status: received ? "received" : "pending",
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
          <DialogTitle>Lançar provento</DialogTitle>
          <DialogDescription>
            Dividendo, JCP ou rendimento de FII. Marcado como recebido → vira receita.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="d-holding">Posição (opcional)</Label>
            <select
              id="d-holding"
              value={holdingId}
              onChange={(e) => setHoldingId(e.target.value)}
              className="h-10 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">(informar ticker manualmente)</option>
              {holdings.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.ticker}
                </option>
              ))}
            </select>
          </div>
          {!holdingId && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="d-ticker">Ticker</Label>
              <Input
                id="d-ticker"
                required
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="PETR4"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="d-kind">Tipo</Label>
              <select
                id="d-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as Dividend["kind"])}
                className="h-10 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 text-sm outline-none focus:border-[var(--color-primary)]"
              >
                <option value="dividend">Dividendo</option>
                <option value="jcp">JCP</option>
                <option value="rent">Rendimento FII</option>
                <option value="amortization">Amortização</option>
                <option value="other">Outro</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="d-amount">Valor (R$)</Label>
              <Input
                id="d-amount"
                inputMode="decimal"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="125,00"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="d-date">Data do pagamento</Label>
            <Input
              id="d-date"
              type="date"
              required
              value={payableAt}
              onChange={(e) => setPayableAt(e.target.value)}
            />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={received}
              onChange={(e) => setReceived(e.target.checked)}
              className="mt-0.5 h-4 w-4"
            />
            <span>
              Já recebi este valor — gerar transação de receita agora.
              <br />
              <span className="text-xs text-[var(--color-fg-subtle)]">
                Se desmarcar, fica como &ldquo;a receber&rdquo; — você marca depois.
              </span>
            </span>
          </label>
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
              Salvar
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

function labelClass(c: Holding["assetClass"]): string {
  return (
    { stock: "Ação", fii: "FII", etf: "ETF", fixed_income: "RF", fund: "Fundo", other: "Outro" }[
      c
    ] ?? c
  );
}

function labelDividendKind(k: Dividend["kind"]): string {
  return (
    { dividend: "Dividendo", jcp: "JCP", rent: "Rendimento", amortization: "Amortização", other: "Outro" }[
      k
    ] ?? k
  );
}
