/**
 * Seed do admin inicial.
 *
 * Usa uma instância Better Auth **sem o plugin nextCookies**, pra rodar fora
 * do contexto Next.js (via tsx) sem quebrar ao tentar setar cookies.
 *
 * Comportamento:
 *  - Se já existir user com o email → só promove role='admin'.
 *  - Senão → cria via signUpEmail (hash de senha correto) e promove a admin.
 *
 * Uso:
 *   pnpm seed:admin
 *
 * Variáveis opcionais:
 *   SEED_ADMIN_EMAIL    (default: ti@cmosdrake.com.br)
 *   SEED_ADMIN_PASSWORD (default: gera senha aleatória e imprime)
 *   SEED_ADMIN_NAME     (default: "Admin Saf")
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, schema } from "@cofre/db";

const EMAIL = process.env.SEED_ADMIN_EMAIL ?? "ti@cmosdrake.com.br";
const NAME = process.env.SEED_ADMIN_NAME ?? "Admin Saf";
const PASSWORD =
  process.env.SEED_ADMIN_PASSWORD ?? randomBytes(9).toString("base64url");

const seedAuth = betterAuth({
  baseURL: "http://localhost:3000",
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "dev-only-not-for-prod-please-set-BETTER_AUTH_SECRET-in-env",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "customer", input: false },
      familyId: { type: "string", required: false, input: false },
      phone: { type: "string", required: false },
      twoFactorEnabled: { type: "boolean", required: false, defaultValue: false, input: false },
    },
  },
  // sem plugins (sem nextCookies)
});

async function main() {
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, EMAIL))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(schema.users)
      .set({ role: "admin", emailVerified: true, updatedAt: new Date() })
      .where(eq(schema.users.email, EMAIL));
    console.log("");
    console.log(`[seed-admin] '${EMAIL}' já existia → promovido para role='admin'.`);
    console.log("[seed-admin] Senha NÃO foi alterada.");
    console.log("");
    return;
  }

  const res = await seedAuth.api.signUpEmail({
    body: { email: EMAIL, password: PASSWORD, name: NAME },
  });

  if (!res || !("user" in res)) {
    throw new Error(`Better Auth signUpEmail falhou: ${JSON.stringify(res)}`);
  }

  await db
    .update(schema.users)
    .set({ role: "admin", emailVerified: true, updatedAt: new Date() })
    .where(eq(schema.users.email, EMAIL));

  console.log("");
  console.log("================ ADMIN CRIADO ================");
  console.log(` E-mail:  ${EMAIL}`);
  console.log(` Senha:   ${PASSWORD}`);
  console.log(` Nome:    ${NAME}`);
  console.log(" Role:    admin");
  console.log("==============================================");
  console.log(" Acesse em http://localhost:3000/admin/login");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed-admin] falhou:", err);
    process.exit(1);
  });
