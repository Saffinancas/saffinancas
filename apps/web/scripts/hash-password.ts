/**
 * Imprime o hash scrypt da senha pra colar num UPDATE manual.
 *
 * Uso:
 *   pnpm --filter @cofre/web exec tsx scripts/hash-password.ts 'MinhaSenha'
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, schema } from "@cofre/db";

const password = process.argv[2];
if (!password) {
  console.error("Uso: tsx scripts/hash-password.ts '<senha>'");
  process.exit(1);
}

const a = betterAuth({
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
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
});

(async () => {
  const ctx = await a.$context;
  const hash = await ctx.password.hash(password);
  console.log(hash);
  process.exit(0);
})();
