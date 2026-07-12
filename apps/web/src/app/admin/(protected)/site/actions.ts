"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { setPlatformSetting } from "@/lib/platform-settings";
import {
  FOOTER_SETTING_KEY,
  normalizeFooter,
  isSafeHref,
  FOOTER_LIMITS,
  type FooterConfig,
} from "@/lib/site-footer";

async function requireAdmin(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Não autenticado.");
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") throw new Error("Sem permissão.");
  return session.user.id;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateFooterAction(input: FooterConfig): Promise<ActionResult> {
  try {
    const userId = await requireAdmin();

    if (!input || !Array.isArray(input.columns) || input.columns.length === 0) {
      return { ok: false, error: "O rodapé precisa de ao menos uma coluna." };
    }
    if (input.columns.length > FOOTER_LIMITS.columns) {
      return { ok: false, error: `Máximo de ${FOOTER_LIMITS.columns} colunas.` };
    }

    // Validação explícita pra devolver erro claro (o normalize só descarta em silêncio).
    for (const col of input.columns) {
      if (!col.title?.trim()) {
        return { ok: false, error: "Toda coluna precisa de um título." };
      }
      if (!Array.isArray(col.links) || col.links.length === 0) {
        return { ok: false, error: `A coluna "${col.title}" precisa de ao menos um link.` };
      }
      for (const link of col.links) {
        if (!link.label?.trim()) {
          return { ok: false, error: `Há um link sem texto na coluna "${col.title}".` };
        }
        if (!isSafeHref(link.href ?? "")) {
          return {
            ok: false,
            error: `Link inválido em "${link.label}": use caminho interno (/…), âncora (#…), mailto: ou https://`,
          };
        }
      }
    }

    // Normaliza (trim + limites) antes de persistir.
    const normalized = normalizeFooter(input);
    await setPlatformSetting(FOOTER_SETTING_KEY, JSON.stringify(normalized), {
      encrypted: false,
      updatedByUserId: userId,
    });

    // O rodapé aparece em toda rota sob o layout raiz — revalida tudo.
    revalidatePath("/", "layout");

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro inesperado." };
  }
}
