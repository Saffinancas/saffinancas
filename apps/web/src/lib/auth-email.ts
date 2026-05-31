"use server";

import { BRAND } from "@/lib/brand";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM = process.env.EMAIL_FROM ?? `${BRAND.name} <${BRAND.email.noReply}>`;

type ResetEmailOpts = {
  to: string;
  resetUrl: string;
  userName?: string | null;
};

export async function sendPasswordResetEmail(opts: ResetEmailOpts): Promise<void> {
  const greeting = opts.userName ? `Olá, ${opts.userName.split(" ")[0]}` : "Olá";
  const subject = `${BRAND.name} — redefinição de senha`;
  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #18181b;">
      <h1 style="font-size: 18px; margin: 0 0 12px;">${greeting},</h1>
      <p style="font-size: 14px; line-height: 1.5; margin: 0 0 16px;">
        Recebemos um pedido pra redefinir sua senha no <strong>${BRAND.name}</strong>.
        Clique no botão abaixo pra escolher uma nova senha. O link expira em 1 hora.
      </p>
      <p style="margin: 24px 0;">
        <a href="${opts.resetUrl}" style="display: inline-block; padding: 12px 20px; background: #18181b; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500;">Redefinir senha</a>
      </p>
      <p style="font-size: 12px; line-height: 1.5; color: #71717a; margin: 0 0 8px;">
        Se o botão não funcionar, copie e cole no navegador:
      </p>
      <p style="font-size: 12px; line-height: 1.5; color: #71717a; word-break: break-all; margin: 0 0 24px;">
        ${opts.resetUrl}
      </p>
      <p style="font-size: 12px; line-height: 1.5; color: #71717a; margin: 0;">
        Se você não pediu, ignore este email — sua senha continua a mesma.
      </p>
    </div>
  `;

  if (!process.env.RESEND_API_KEY) {
    console.log(
      `[auth-email][sim] Reset password → ${opts.to}\n  URL: ${opts.resetUrl}`,
    );
    return;
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: opts.to, subject, html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[auth-email] Resend ${res.status}: ${body.slice(0, 200)}`);
    }
  } catch (e) {
    console.error("[auth-email] erro ao enviar reset", e);
  }
}
