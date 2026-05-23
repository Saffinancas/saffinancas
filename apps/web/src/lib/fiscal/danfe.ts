/**
 * Gera o DANFE da NFSe em HTML. Em produção, este HTML pode ser convertido em
 * PDF via Puppeteer/Playwright (server-side). Por ora, devolvemos o HTML
 * direto — navegador imprime em PDF com Ctrl+P sem perder fidelidade.
 *
 * Layout inspirado no DANFE oficial ABRASF, mas adaptado pra impressão A4.
 */
import type { NfseInvoice, FiscalProfile, NfseRecipient } from "@cofre/db";

function fmt(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDoc(s: string, type: string): string {
  const d = s.replace(/\D/g, "");
  if (type === "PJ" && d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }
  if (d.length === 11) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  return s;
}

export function buildDanfeHtml(opts: {
  invoice: NfseInvoice;
  profile: FiscalProfile;
  recipient: NfseRecipient | null;
}): string {
  const { invoice, profile, recipient } = opts;
  const valorServicos = Number(invoice.serviceValueCents);
  const valorIss = Number(invoice.issValueCents);
  const valorLiquido = valorServicos - (invoice.issWithheld ? valorIss : 0);

  const provAddress = (profile.address as Record<string, string>) ?? {};
  const recAddress = (recipient?.address as Record<string, string>) ?? {};

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>DANFE NFSe ${invoice.nfseNumber ?? invoice.rpsNumber}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #222; line-height: 1.35; }
  h1 { font-size: 14px; margin: 0 0 4px; }
  .header { border: 1px solid #000; padding: 8px; display: flex; justify-content: space-between; align-items: flex-start; }
  .header .meta { text-align: right; font-size: 10px; }
  .meta strong { font-size: 13px; }
  .section { border: 1px solid #000; border-top: 0; padding: 6px 8px; }
  .section h2 { font-size: 10px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.05em; color: #555; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; }
  .grid .field { margin-bottom: 4px; }
  .grid .field .label { font-size: 9px; color: #666; text-transform: uppercase; }
  .grid .field .value { font-weight: 600; }
  .totals { background: #f4f4f0; }
  .totals .row { display: flex; justify-content: space-between; padding: 2px 0; }
  .totals .row.final { font-size: 14px; font-weight: 700; border-top: 1px solid #000; margin-top: 4px; padding-top: 6px; }
  .desc { padding: 10px; white-space: pre-wrap; min-height: 80px; }
  .footer { margin-top: 10px; font-size: 9px; color: #666; text-align: center; }
  .verification { display: inline-block; background: #f4f4f0; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
  @media print { .no-print { display: none } }
</style>
</head>
<body>
  <div class="no-print" style="margin-bottom:10px;text-align:right">
    <button onclick="window.print()" style="padding:8px 14px;background:#0A5C42;color:white;border:none;border-radius:4px;cursor:pointer">Imprimir / Salvar como PDF</button>
  </div>

  <div class="header">
    <div>
      <h1>${profile.legalName}</h1>
      <div>${profile.documentType === "PJ" ? "CNPJ" : "CPF"}: ${fmtDoc(profile.documentNumber, profile.documentType)}</div>
      ${profile.municipalInscription ? `<div>IM: ${profile.municipalInscription}</div>` : ""}
      <div>${provAddress.street ?? ""}, ${provAddress.number ?? ""} ${
        provAddress.complement ? "— " + provAddress.complement : ""
      }</div>
      <div>${provAddress.district ?? ""} — ${profile.cityName}/${profile.stateCode} — CEP ${provAddress.zipCode ?? ""}</div>
    </div>
    <div class="meta">
      <div><strong>NFS-e Nº ${invoice.nfseNumber ?? "(pendente)"}</strong></div>
      <div>${profile.cityName.toUpperCase()}</div>
      <div>Emitida em ${invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleString("pt-BR") : "—"}</div>
      ${invoice.verificationCode ? `<div>Verificação: <span class="verification">${invoice.verificationCode}</span></div>` : ""}
      <div style="margin-top:4px">RPS ${invoice.rpsSerie} ${invoice.rpsNumber}</div>
    </div>
  </div>

  <div class="section">
    <h2>Tomador do Serviço</h2>
    ${
      recipient
        ? `
    <div class="grid">
      <div class="field"><div class="label">Razão social</div><div class="value">${recipient.name}</div></div>
      <div class="field"><div class="label">${recipient.documentType === "PJ" ? "CNPJ" : "CPF"}</div><div class="value">${fmtDoc(recipient.documentNumber, recipient.documentType)}</div></div>
      <div class="field" style="grid-column:1/-1"><div class="label">Endereço</div><div class="value">${recAddress.street ?? "—"}, ${recAddress.number ?? ""} — ${recAddress.district ?? ""} — ${recAddress.cityName ?? ""}/${recAddress.stateCode ?? ""}</div></div>
      ${recipient.email ? `<div class="field" style="grid-column:1/-1"><div class="label">E-mail</div><div class="value">${recipient.email}</div></div>` : ""}
    </div>`
        : "<div>—</div>"
    }
  </div>

  <div class="section">
    <h2>Discriminação do Serviço</h2>
    <div class="desc">${invoice.serviceDescription}</div>
    <div class="grid" style="margin-top:6px">
      <div class="field"><div class="label">Item LC 116</div><div class="value">${invoice.serviceCode}</div></div>
      ${invoice.cnae ? `<div class="field"><div class="label">CNAE</div><div class="value">${invoice.cnae}</div></div>` : ""}
      <div class="field"><div class="label">Município da prestação</div><div class="value">${profile.cityName} (${profile.cityCode})</div></div>
      <div class="field"><div class="label">Competência</div><div class="value">${new Date(invoice.competenceDate).toLocaleDateString("pt-BR")}</div></div>
    </div>
  </div>

  <div class="section totals">
    <div class="row"><span>Valor dos serviços</span><span>R$ ${fmt(valorServicos)}</span></div>
    <div class="row"><span>Alíquota ISS (${(invoice.issRateBps / 100).toFixed(2)}%)</span><span>R$ ${fmt(valorIss)}</span></div>
    ${
      invoice.issWithheld
        ? '<div class="row"><span>ISS retido pelo tomador</span><span>Sim</span></div>'
        : '<div class="row"><span>ISS retido</span><span>Não</span></div>'
    }
    <div class="row final"><span>Valor líquido</span><span>R$ ${fmt(valorLiquido)}</span></div>
  </div>

  <div class="footer">
    Documento auxiliar emitido pela plataforma Saf Finanças. Em caso de divergência, prevalecem os
    dados do XML autenticado pela Prefeitura.
  </div>
</body>
</html>`;
}
