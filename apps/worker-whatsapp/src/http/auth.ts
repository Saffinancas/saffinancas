import type { Request, Response, NextFunction } from "express";
import { env } from "../env.js";

/**
 * Auth simples por header: a web manda `Authorization: Bearer <WORKER_SHARED_SECRET>`.
 * Comparação em tempo constante evita timing attacks.
 */
export function requireSharedSecret(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!provided || !timingSafeEqual(provided, env.WORKER_SHARED_SECRET)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}
