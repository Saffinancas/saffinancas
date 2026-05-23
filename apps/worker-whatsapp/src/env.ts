import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),

  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatório (Neon ou pglite:)"),
  REDIS_URL: z.string().min(1, "REDIS_URL é obrigatório pra BullMQ"),

  WORKER_SHARED_SECRET: z
    .string()
    .min(32, "WORKER_SHARED_SECRET precisa ter pelo menos 32 chars (openssl rand -hex 32)"),

  WA_SESSIONS_DIR: z.string().default("./.wwebjs_auth"),
  WA_MESSAGE_TTL_DAYS: z.coerce.number().int().positive().default(90),

  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  PLATFORM_ENCRYPTION_KEY: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

export const env: Env = (() => {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error("[worker-whatsapp] env inválido:", parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
})();
