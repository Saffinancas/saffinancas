import { NextResponse } from "next/server";
import { runDueSchedules } from "@/lib/fiscal/schedules";

/**
 * Cron endpoint pro Vercel Cron (configurado em `vercel.json`).
 * Roda diariamente às 8h UTC = 5h BRT. Processa todos os schedules ativos com
 * `nextRunAt <= now()`.
 *
 * Proteção: Vercel adiciona o header `Authorization: Bearer <CRON_SECRET>`
 * quando configurado. Sem o header certo, retornamos 401 — assim ninguém
 * de fora consegue acionar emissões em massa.
 *
 * Configurar:
 *   1. Setar `CRON_SECRET` nos env vars do Vercel
 *   2. Adicionar em vercel.json:
 *      { "crons": [{ "path": "/api/cron/nfse-schedules", "schedule": "0 8 * * *" }] }
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDueSchedules(new Date());
    return NextResponse.json({
      ok: true,
      processedAt: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Erro inesperado." },
      { status: 500 },
    );
  }
}

// Permite POST com a mesma lógica — alguns crons preferem POST.
export const POST = GET;
