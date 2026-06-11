import { Router } from "express";
import { z } from "zod";
import { sessionManager } from "../wa/manager.js";
import { SAF_GLOBAL_ID } from "../wa/session.js";
import { log } from "../log.js";

export const safSessionRouter: Router = Router();

/**
 * Status atual da sessão Saf global (1 número operacional Saf usado em todos
 * os grupos das famílias clientes).
 */
safSessionRouter.get("/status", (_req, res) => {
  const session = sessionManager.get(SAF_GLOBAL_ID);
  if (!session) {
    res.json({
      status: "disconnected",
      pairedPhone: null,
      qrDataUrl: null,
      lastSeenAt: null,
    });
    return;
  }
  res.json({
    status: session.state.status,
    pairedPhone: session.state.pairedPhone,
    qrDataUrl: session.state.qrDataUrl,
    qrExpiresAt: session.state.qrExpiresAt?.toISOString() ?? null,
  });
});

/**
 * Inicia (ou reanima) a sessão Saf. Se já houver LocalAuth salvo no volume,
 * reconecta sem precisar de pareamento.
 */
safSessionRouter.post("/start", async (_req, res) => {
  const session = await sessionManager.getOrCreate(SAF_GLOBAL_ID);
  res.json({
    status: session.state.status,
    pairedPhone: session.state.pairedPhone,
  });
});

/**
 * Gera um pairing code de 8 caracteres pra parear com um telefone novo.
 * O dono digita esse código no WhatsApp do celular Saf em:
 * Configurações → Aparelhos conectados → Vincular com número de telefone.
 */
const pairBody = z.object({
  phone: z.string().regex(/^\+?\d{10,15}$/, "telefone inválido (use +55DDXXXXXXXXX)"),
});

safSessionRouter.post("/pair-by-phone", async (req, res) => {
  const parsed = pairBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_phone", details: parsed.error.flatten() });
    return;
  }
  try {
    const session = await sessionManager.getOrCreate(SAF_GLOBAL_ID);
    if (session.state.status === "connected") {
      res.status(409).json({
        error: "already_connected",
        pairedPhone: session.state.pairedPhone,
      });
      return;
    }
    const code = await session.requestPairingCode(parsed.data.phone);
    res.json({
      pairingCode: code,
      expiresInSeconds: 60,
      instructions:
        "No WhatsApp do celular Saf: Configurações → Aparelhos conectados → Vincular com número de telefone → digite este código.",
    });
  } catch (err) {
    log.error({ err }, "pair-by-phone falhou");
    res.status(500).json({
      error: "pairing_failed",
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

/**
 * Desconecta a sessão Saf. Apaga LocalAuth do volume.
 */
safSessionRouter.delete("/", async (_req, res) => {
  await sessionManager.remove(SAF_GLOBAL_ID);
  res.json({ ok: true });
});

/**
 * Envia mensagem texto pra um chat (grupo ou DM). Usado pela web pra responder
 * em grupo quando o agente IA decide reagir.
 */
const sendBody = z.object({
  to: z.string().min(3),
  body: z.string().min(1).max(4096),
});

safSessionRouter.post("/send", async (req, res) => {
  const parsed = sendBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
    return;
  }
  const session = sessionManager.get(SAF_GLOBAL_ID);
  if (!session || session.state.status !== "connected") {
    res.status(409).json({ error: "not_connected" });
    return;
  }
  try {
    await session.sendText(parsed.data.to, parsed.data.body);
    res.json({ ok: true });
  } catch (err) {
    log.error({ err }, "send falhou");
    res.status(500).json({
      error: "send_failed",
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

/**
 * Últimos 30 eventos message_create vistos pela sessão Saf. Pra debug do
 * /admin/integracoes/whatsapp/diagnostico — sem precisar de fly logs.
 */
safSessionRouter.get("/events", (_req, res) => {
  const session = sessionManager.get(SAF_GLOBAL_ID);
  if (!session) {
    res.json({ events: [] });
    return;
  }
  res.json({ events: session.events });
});

/**
 * Lista grupos onde a sessão Saf está presente. Útil pra debug.
 */
safSessionRouter.get("/groups", async (_req, res) => {
  const session = sessionManager.get(SAF_GLOBAL_ID);
  if (!session || session.state.status !== "connected") {
    res.status(409).json({ error: "not_connected" });
    return;
  }
  const groups = await session.listGroups();
  res.json({ groups });
});
