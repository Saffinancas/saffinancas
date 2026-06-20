import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db, schema } from "@cofre/db";
import { BRAND } from "@/lib/brand";
import { sendPasswordResetEmail } from "@/lib/auth-email";

/**
 * Better Auth — single instance compartilhada por cliente final e admin.
 *
 *  - O DRY/role-check fica do lado do app (`session.user.role`).
 *  - PGlite ou Postgres real, transparente — o `db` faz a escolha por env.
 *  - Em dev, deixamos `autoSignIn=true` no signUpEmail pra não precisar de
 *    fluxo de magic link.
 */
const publicUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

const trustedOrigins = Array.from(
  new Set(
    [
      publicUrl,
      `https://${BRAND.domain}`,
      `https://www.${BRAND.domain}`,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
      process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : null,
    ].filter((v): v is string => Boolean(v)),
  ),
);

export const auth = betterAuth({
  appName: BRAND.name,
  baseURL: publicUrl,
  trustedOrigins,
  secret: (() => {
    const s = process.env.BETTER_AUTH_SECRET;
    if (!s) {
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "BETTER_AUTH_SECRET ausente em produção. Configure na Vercel — sem secret, " +
            "tokens de sessão são forjáveis.",
        );
      }
      // Em dev, retorna um valor estável SÓ pra desenvolvimento — nunca usar em prod.
      return "dev-only-not-for-prod-please-set-BETTER_AUTH_SECRET-in-env";
    }
    return s;
  })(),

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
    autoSignIn: true,
    minPasswordLength: 8,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        to: user.email,
        userName: user.name ?? null,
        resetUrl: url,
      });
    },
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hora
  },

  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "customer", input: false },
      familyId: { type: "string", required: false, input: false },
      phone: { type: "string", required: false },
      twoFactorEnabled: { type: "boolean", required: false, defaultValue: false, input: false },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 dias
    updateAge: 60 * 60 * 24, // renova token diariamente
    // cookieCache desabilitado: mudanças no user record (ex.: familyId após
    // bootstrap) precisam refletir imediatamente sem aguardar TTL.
    cookieCache: { enabled: false },
  },

  advanced: {
    cookiePrefix: "saf",
  },

  plugins: [nextCookies()],
});

export type Auth = typeof auth;
