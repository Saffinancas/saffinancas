import IORedis from "ioredis";
import { env } from "../env.js";

/**
 * Conexão Redis compartilhada. BullMQ exige `maxRetriesPerRequest: null` em
 * conexões de consumer — ver docs.
 */
export const redis = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});
