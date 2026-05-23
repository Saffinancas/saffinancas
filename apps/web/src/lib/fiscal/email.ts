"use server";

/**
 * Envio de email com XML+DANFE quando uma NFSe é emitida.
 *
 * Implementação:
 *  - Se `RESEND_API_KEY` estiver presente, usa Resend (https://resend.com)
 *  - Senão, **registra no console** e segue (modo dev)
 *
 * Anexos:
 *  - `nfse-<numero>.xml` (texto, mime application/xml)
 *  - `nfse-<numero>.html` (DANFE, mime text/html — abre em navegador)
 *
 * Pra plugar de verdade:
 *   1. Crie conta em resend.com (free tier: 100 emails/dia)
 *   2. Verifique seu domínio
 *   3. Adicione RESEND_API_KEY no .env
 *   4. (Opcional) ajuste EMAIL_FROM pra um endereço do seu domínio
 */

type SendOpts = {
  to: string[];
  subject: string;
  invoiceNumber: number | null;
  xml: string;
  danfeHtml: string;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM = process.env.EMAIL_FROM ?? "Saf Finanças <no-reply@saffinancas.com.br>";

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

  if (!process.env.RESEND_API_KEY) {
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
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
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
