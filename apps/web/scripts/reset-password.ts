/**
 * Reset de senha programático.
 *
 * Hasha a nova senha usando o mesmo algoritmo do Better Auth (via
 * `auth.$context.password.hash`) e atualiza a linha em `accounts`
 * (provider='credential') do usuário alvo.
 *
 * Não dispara email — é uma operação administrativa direta.
 *
 * Uso:
 *   pnpm --filter @cofre/web run reset:password user@x.com Nova@Senha123
 *   pnpm --filter @cofre/web run reset:password user@x.com Nova@Senha123 --create "Nome Opcional"
 *   tsx scripts/reset-password.ts user@x.com Nova@Senha123
 *
 * Flag --create cria o usuário (role=customer) se ele não existir.
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db, schema } from "@cofre/db";

const rawArgs = process.argv.slice(2);
const createIdx = rawArgs.indexOf("--create");
const createFlag = createIdx !== -1;
const createName = createFlag ? rawArgs[createIdx + 1] : undefined;
const positional = rawArgs.filter((_, i) => {
  if (i === createIdx) return false;
  if (createFlag && i === createIdx + 1 && createName) return false;
  return true;
});

if (!positional[0] || !positional[1]) {
  console.error("");
  console.error('Uso: tsx scripts/reset-password.ts <email> <novaSenha> [--create "Nome"]');
  console.error("");
  process.exit(1);
}

const emailArg: string = positional[0];
const passwordArg: string = positional[1];

if (passwordArg.length < 8) {
  console.error("[reset-password] senha precisa ter no mínimo 8 caracteres.");
  process.exit(1);
}

const resetAuth = betterAuth({
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
});

async function main() {
  const email = emailArg.toLowerCase().trim();

  let userRow = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  if (userRow.length === 0) {
    if (!createFlag) {
      console.error(`[reset-password] usuário não encontrado: ${email}`);
      console.error(`  use --create "Nome" pra criar como customer`);
      process.exit(1);
    }
    const name = createName ?? email.split("@")[0] ?? email;
    const signupRes = await resetAuth.api.signUpEmail({
      body: { email, password: passwordArg, name },
    });
    if (!signupRes || !("user" in signupRes)) {
      throw new Error(`signUpEmail falhou: ${JSON.stringify(signupRes)}`);
    }
    console.log(`[reset-password] usuário criado: ${email} (role=customer)`);
    userRow = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    if (userRow.length === 0) {
      throw new Error("user não apareceu no banco após signup");
    }
    // signUpEmail já gravou a senha — só sair limpo.
    console.log("");
    console.log(`[reset-password] senha definida para '${email}'.`);
    console.log("");
    return;
  }

  const user = userRow[0]!;

  const ctx = await resetAuth.$context;
  const hashed = await ctx.password.hash(passwordArg);

  const existingAccount = await db
    .select()
    .from(schema.accounts)
    .where(
      and(
        eq(schema.accounts.userId, user.id),
        eq(schema.accounts.providerId, "credential"),
      ),
    )
    .limit(1);

  if (existingAccount.length > 0) {
    await db
      .update(schema.accounts)
      .set({ password: hashed, updatedAt: new Date() })
      .where(eq(schema.accounts.id, existingAccount[0]!.id));
    console.log("");
    console.log(`[reset-password] senha atualizada para '${email}'.`);
    console.log("");
    return;
  }

  // Não existia linha credential — cria uma nova.
  await db.insert(schema.accounts).values({
    id: randomUUID(),
    accountId: user.id,
    providerId: "credential",
    userId: user.id,
    password: hashed,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log("");
  console.log(`[reset-password] conta credential criada e senha definida para '${email}'.`);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[reset-password] falhou:", err);
    process.exit(1);
  });
