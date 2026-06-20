import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { requireSharedSecret } from "./auth.js";
import { sessionsRouter } from "./sessions.js";
import { safSessionRouter } from "./saf-session.js";
import { log } from "../log.js";

export function buildApp(): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "256kb" }));

  // Liveness probe minimalista — apenas confirma que o processo está rodando.
  // Detalhes operacionais (activeSessions, uptime) ficam atrás do bearer em
  // /sessions e /saf-session/* pra não vazarem pra qualquer scanner.
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/sessions", requireSharedSecret, sessionsRouter);
  app.use("/saf-session", requireSharedSecret, safSessionRouter);

  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    log.error({ err, path: req.path }, "Erro na rota");
    res.status(500).json({ error: "internal_error", message: err.message });
  });

  return app;
}
