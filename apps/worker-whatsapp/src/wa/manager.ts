import { WaSession } from "./session.js";
import { log } from "../log.js";

/**
 * Mantém uma sessão whatsapp-web.js por família, na memória do worker.
 *
 * Multi-tenant simples: cada familia tem seu Chromium headless. Em escala,
 * mover famílias inativas pra "frio" e reanimar sob demanda. Por enquanto,
 * todas ficam vivas.
 */
class SessionManager {
  private sessions = new Map<string, WaSession>();

  async getOrCreate(familyId: string): Promise<WaSession> {
    const existing = this.sessions.get(familyId);
    if (existing) return existing;
    const s = new WaSession(familyId);
    this.sessions.set(familyId, s);
    await s.start();
    return s;
  }

  get(familyId: string): WaSession | null {
    return this.sessions.get(familyId) ?? null;
  }

  async remove(familyId: string): Promise<void> {
    const s = this.sessions.get(familyId);
    if (!s) return;
    await s.logout();
    this.sessions.delete(familyId);
  }

  list(): WaSession[] {
    return Array.from(this.sessions.values());
  }

  async shutdown(): Promise<void> {
    log.info({ count: this.sessions.size }, "Encerrando sessões");
    await Promise.allSettled(this.list().map((s) => s.logout()));
    this.sessions.clear();
  }
}

export const sessionManager = new SessionManager();
