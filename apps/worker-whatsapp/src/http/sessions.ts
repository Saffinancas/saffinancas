import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, schema } from "@cofre/db";
import { sessionManager } from "../wa/manager.js";
import { log } from "../log.js";

export const sessionsRouter: Router = Router();

const familyIdParam = z.object({ familyId: z.string().min(1) });

/** POST /sessions/:familyId/pair  →  inicia (ou reanima) sessão; devolve estado */
sessionsRouter.post("/:familyId/pair", async (req, res) => {
  const { familyId } = familyIdParam.parse(req.params);
  await ensureSessionRowExists(familyId);
  const session = await sessionManager.getOrCreate(familyId);
  res.json(stateView(session));
});

/** GET /sessions/:familyId  →  estado atual */
sessionsRouter.get("/:familyId", async (req, res) => {
  const { familyId } = familyIdParam.parse(req.params);
  const session = sessionManager.get(familyId);
  if (!session) {
    res.json({
      familyId,
      status: "disconnected",
      qrDataUrl: null,
      qrExpiresAt: null,
      pairedPhone: null,
    });
    return;
  }
  res.json(stateView(session));
});

/** GET /sessions/:familyId/groups  →  lista grupos disponíveis */
sessionsRouter.get("/:familyId/groups", async (req, res) => {
  const { familyId } = familyIdParam.parse(req.params);
  const session = sessionManager.get(familyId);
  if (!session || session.state.status !== "connected") {
    res.status(409).json({ error: "not_connected" });
    return;
  }
  const groups = await session.listGroups();
  res.json({ groups });
});

/** POST /sessions/:familyId/group  →  define grupo monitorado */
const selectGroupBody = z.object({ groupId: z.string().min(1), groupName: z.string().min(1) });
sessionsRouter.post("/:familyId/group", async (req, res) => {
  const { familyId } = familyIdParam.parse(req.params);
  const body = selectGroupBody.parse(req.body);
  await db
    .update(schema.whatsappSessions)
    .set({
      monitoredGroupId: body.groupId,
      monitoredGroupName: body.groupName,
      updatedAt: new Date(),
    })
    .where(eq(schema.whatsappSessions.familyId, familyId));
  log.info({ familyId, ...body }, "Grupo monitorado definido");
  res.json({ ok: true });
});

/** DELETE /sessions/:familyId  →  desconecta e remove sessão */
sessionsRouter.delete("/:familyId", async (req, res) => {
  const { familyId } = familyIdParam.parse(req.params);
  await sessionManager.remove(familyId);
  await db
    .update(schema.whatsappSessions)
    .set({
      status: "unpaired",
      pairedPhone: null,
      monitoredGroupId: null,
      monitoredGroupName: null,
      qrPayload: null,
      qrExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.whatsappSessions.familyId, familyId));
  res.json({ ok: true });
});

function stateView(session: ReturnType<typeof sessionManager.get> & object) {
  return {
    familyId: session.familyId,
    status: session.state.status,
    qrDataUrl: session.state.qrDataUrl,
    qrExpiresAt: session.state.qrExpiresAt?.toISOString() ?? null,
    pairedPhone: session.state.pairedPhone,
  };
}

async function ensureSessionRowExists(familyId: string): Promise<void> {
  const [existing] = await db
    .select({ id: schema.whatsappSessions.id })
    .from(schema.whatsappSessions)
    .where(eq(schema.whatsappSessions.familyId, familyId))
    .limit(1);
  if (existing) return;
  await db.insert(schema.whatsappSessions).values({
    id: `was_${Math.random().toString(36).slice(2, 12)}`,
    familyId,
    status: "unpaired",
  });
}
