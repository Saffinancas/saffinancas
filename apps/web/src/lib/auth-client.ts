"use client";

import { createAuthClient } from "better-auth/react";

// Sem baseURL: o Better Auth usa window.location.origin no browser. Isso evita
// que builds com NEXT_PUBLIC_APP_URL apontando pra outro host (ex.: URL técnica
// do Vercel) batam em outra origem e quebrem com CORS.
export const authClient = createAuthClient();

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  requestPasswordReset,
  resetPassword,
} = authClient;
