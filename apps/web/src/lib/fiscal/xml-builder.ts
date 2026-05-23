/**
 * Builder de XML em layout ABRASF 2.04 — usado pelo Simulator e como template
 * pros providers reais.
 *
 * Schema oficial: https://abrasf.org.br/biblioteca/modelo-conceitual
 * (procurar PDF "Modelo de NFS-e v2.04")
 *
 * Limitação: aqui não fazemos XMLDSig (XML Signature). Os providers reais
 * cuidam disso. Pro PBH direto, ver `providers/pbh-direct.ts` que precisa de
 * xml-crypto.
 */
import type { InvoiceRequest } from "./types";

type IssuedMeta = {
  nfseNumber: number;
  verificationCode: string;
  confirmedAt: string; // ISO
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function moneyFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

function bpsToRate(bps: number): string {
  return (bps / 10000).toFixed(4);
}

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

export function buildABRASFXml(opts: InvoiceRequest & { result: IssuedMeta }): string {
  const { provider: prov, recipient: tom, service: srv, rps, result } = opts;
  const competence = opts.competenceDate.slice(0, 19);

  const valorServicos = moneyFromCents(srv.valueCents);
  const aliquota = bpsToRate(srv.issRateBps);
  const issCents = Math.round((srv.valueCents * srv.issRateBps) / 10000);
  const valorIss = moneyFromCents(issCents);
  const valorLiquido = moneyFromCents(srv.valueCents - (srv.issWithheld ? issCents : 0));

  const docTypeProv = prov.documentType === "PJ" ? "Cnpj" : "Cpf";
  const docTypeTom = tom.documentType === "PJ" ? "Cnpj" : "Cpf";

  return `<?xml version="1.0" encoding="UTF-8"?>
<CompNfse xmlns="http://www.abrasf.org.br/nfse.xsd">
  <Nfse versao="2.04">
    <InfNfse Id="nfse_${result.nfseNumber}">
      <Numero>${result.nfseNumber}</Numero>
      <CodigoVerificacao>${result.verificationCode}</CodigoVerificacao>
      <DataEmissao>${result.confirmedAt}</DataEmissao>
      <NfseSubstituida>0</NfseSubstituida>
      <OutrasInformacoes>NFS-e emitida via plataforma Saf Finanças</OutrasInformacoes>
      <ValoresNfse>
        <BaseCalculo>${valorServicos}</BaseCalculo>
        <Aliquota>${aliquota}</Aliquota>
        <ValorIss>${valorIss}</ValorIss>
        <ValorLiquidoNfse>${valorLiquido}</ValorLiquidoNfse>
      </ValoresNfse>
      <PrestadorServico>
        <IdentificacaoPrestador>
          <CpfCnpj>
            <${docTypeProv}>${onlyDigits(prov.documentNumber)}</${docTypeProv}>
          </CpfCnpj>
          ${
            prov.municipalInscription
              ? `<InscricaoMunicipal>${escapeXml(prov.municipalInscription)}</InscricaoMunicipal>`
              : ""
          }
        </IdentificacaoPrestador>
        <RazaoSocial>${escapeXml(prov.legalName)}</RazaoSocial>
        <Endereco>
          <Endereco>${escapeXml(prov.address.street)}</Endereco>
          <Numero>${escapeXml(prov.address.number)}</Numero>
          ${
            prov.address.complement
              ? `<Complemento>${escapeXml(prov.address.complement)}</Complemento>`
              : ""
          }
          <Bairro>${escapeXml(prov.address.district)}</Bairro>
          <CodigoMunicipio>${prov.address.cityCode}</CodigoMunicipio>
          <Uf>${prov.address.stateCode}</Uf>
          <Cep>${onlyDigits(prov.address.zipCode)}</Cep>
        </Endereco>
      </PrestadorServico>
      <TomadorServico>
        <IdentificacaoTomador>
          <CpfCnpj>
            <${docTypeTom}>${onlyDigits(tom.documentNumber)}</${docTypeTom}>
          </CpfCnpj>
        </IdentificacaoTomador>
        <RazaoSocial>${escapeXml(tom.name)}</RazaoSocial>
        ${tom.email ? `<Contato><Email>${escapeXml(tom.email)}</Email></Contato>` : ""}
      </TomadorServico>
      <Servico>
        <Valores>
          <ValorServicos>${valorServicos}</ValorServicos>
          <ValorIss>${valorIss}</ValorIss>
          <Aliquota>${aliquota}</Aliquota>
        </Valores>
        <IssRetido>${srv.issWithheld ? "1" : "2"}</IssRetido>
        <ItemListaServico>${escapeXml(srv.code)}</ItemListaServico>
        ${srv.cnae ? `<CodigoCnae>${escapeXml(srv.cnae)}</CodigoCnae>` : ""}
        <Discriminacao>${escapeXml(srv.description)}</Discriminacao>
        <CodigoMunicipio>${prov.address.cityCode}</CodigoMunicipio>
      </Servico>
      <Rps>
        <IdentificacaoRps>
          <Numero>${rps.number}</Numero>
          <Serie>${escapeXml(rps.serie)}</Serie>
          <Tipo>1</Tipo>
        </IdentificacaoRps>
        <DataEmissao>${competence}</DataEmissao>
        <Status>1</Status>
      </Rps>
    </InfNfse>
  </Nfse>
</CompNfse>
`;
}
