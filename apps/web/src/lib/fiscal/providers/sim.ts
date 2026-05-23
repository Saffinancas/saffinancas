/**
 * Provider SIMULADO — usado em dev/demo e quando a família ainda não plugou
 * provider real. Sempre retorna sucesso, gera número fictício e XML
 * estruturalmente válido em ABRASF 2.04.
 */
import { randomBytes } from "node:crypto";
import type { InvoiceRequest, InvoiceResult, NFSeProviderAdapter } from "../types";
import { buildABRASFXml } from "../xml-builder";

let counter = 100000;

function nextNfseNumber(): number {
  return ++counter;
}

function makeVerificationCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

export const SimProvider: NFSeProviderAdapter = {
  id: "sim",

  async issue(req: InvoiceRequest): Promise<InvoiceResult> {
    // Simula latência da prefeitura.
    await new Promise((r) => setTimeout(r, 250));

    const nfseNumber = nextNfseNumber();
    const verificationCode = makeVerificationCode();
    const confirmedAt = new Date().toISOString();
    const xml = buildABRASFXml({
      ...req,
      result: { nfseNumber, verificationCode, confirmedAt },
    });

    return {
      ok: true,
      nfseNumber,
      verificationCode,
      xml,
      confirmedAt,
      rawResponse: { simulated: true, message: "Sim provider — sempre OK" },
    };
  },

  async cancel(_opts) {
    await new Promise((r) => setTimeout(r, 150));
    return { ok: true };
  },
};
