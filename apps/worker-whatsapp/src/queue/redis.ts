import IORedis from "ioredis";
import { env } from "../env.js";

/**
 * Conexão Redis compartilhada. BullMQ exige `maxRetriesPerRequest: null` em
 * conexões de consumer — ver docs.
 *
 * keepAlive evita ECONNRESET frequente do Upstash (que dropa conexões idle).
 */
export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  keepAlive: 30_000,
  // Reconecta com backoff exponencial. Sem isso, ECONNRESET espalha logs.
  retryStrategy: (times) => Math.min(times * 200, 2000),
  reconnectOnError: () => true,
});

redis.on("error", (err) => {
  // Só loga "real" — ECONNRESET de keepalive não interessa.
  if ((err as { code?: string }).code !== "ECONNRESET") {
    console.error("[redis]", err.message);
  }
});
