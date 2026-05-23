import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata valor monetário em BRL, recebendo centavos (int) para evitar drift de
 * ponto flutuante. Tabular-nums já é garantido por CSS via .num/.tabular.
 */
export function formatBRL(amountCents: number, opts?: { signed?: boolean }) {
  const value = amountCents / 100;
  const formatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  if (!opts?.signed) return formatted;
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `−${formatted}`;
  return formatted;
}

export function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" }).format(date);
}
