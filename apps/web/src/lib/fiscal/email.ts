"use server";

/**
 * Envio de email com XML+DANFE quando uma NFSe é emitida.
 *
 * Lê API key + from de `platform_settings` (com fallback para env).
 */

import { getPlatformSetting } from "@/lib/platform-settings";

type SendOpts = {
  to: string[];
  subject: string;
  invoiceNumber: number | null;
  xml: string;
  danfeHtml: string;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export async function sendInvoiceEmail(opts: SendOpts): Promise<{ ok: boolean; error?: string }> {
  if (opts.to.length === 0) return { ok: true };

  const filenameBase = `nfse-${opts.invoiceNumber ?? "rps"}`;
  const attachments = [
    {
      filename: `${filenameBase}.xml`,
      content: Buffer.from(opts.xml, "utf-8").toString("base64"),
    },
    {
      filename: `${filenameBase}.html`,
      content: Buffer.from(opts.danfeHtml, "utf-8").toString("base64"),
    },
  ];

  const apiKey = await getPlatformSetting("email.resend_api_key");
  const from =
    (await getPlatformSetting("email.from")) ?? "Saf Finanças <no-reply@saffinancas.com.br>";

  if (!apiKey) {
    console.log(
      `[email][sim] To: ${opts.to.join(", ")} · Subject: "${opts.subject}" · Anexos: ${attachments
        .map((a) => a.filename)
        .join(", ")}`,
    );
    return { ok: true };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: opts.to,
        subject: opts.subject,
        html: `<p>Segue em anexo a NFSe Nº <strong>${opts.invoiceNumber ?? "(provisório)"}</strong>.</p><p>XML e DANFE anexos.</p><p>Enviado automaticamente pela Saf Finanças.</p>`,
        attachments,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
