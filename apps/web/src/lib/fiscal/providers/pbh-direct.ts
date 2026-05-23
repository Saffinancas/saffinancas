/**
 * Adapter PBH Direct — SOAP direto com o BHISSDigital da Prefeitura de
 * Belo Horizonte. STUB documentado.
 *
 * Sem custo por nota (apenas o ISS) mas exige bastante código:
 *
 *  - Layout: ABRASF 2.04 com adaptações de BH
 *  - Endpoint produção: https://nfse.pbh.gov.br/bhissdigitalws/nfse.asmx
 *  - Endpoint homologação: https://hom.pbh.gov.br/bhissdigitalws/nfse.asmx
 *  - WSDL: https://nfse.pbh.gov.br/bhissdigitalws/nfse.asmx?wsdl
 *
 * Operações SOAP:
 *  - RecepcionarLoteRps        — envia lote (até 50 RPS)
 *  - ConsultarSituacaoLoteRps  — consulta lote
 *  - ConsultarLoteRps          — pega notas emitidas do lote
 *  - ConsultarNfsePorRps       — consulta nota individual por RPS
 *  - CancelarNfse              — cancela
 *
 * Requisitos técnicos:
 *  1. Certificado digital A1 (.pfx) carregado pra assinar XML com XMLDSig
 *     (canonicalização exclusiva-c14n, hash SHA1, RSA-SHA1)
 *  2. SOAP 1.1 com Content-Type: application/soap+xml; charset=utf-8
 *  3. XML interno (assinado) embutido como string em <nfseDadosMsg>
 *
 * Bibliotecas Node sugeridas:
 *  - `node-forge` pra ler/manipular o PFX
 *  - `xml-crypto` pra XMLDSig
 *  - `xmlbuilder2` pra montar o XML
 *  - `node-fetch` ou nativo pra SOAP
 *
 * Referências:
 *  - https://github.com/pablopdomingos/nfse (PHP — espelhar lógica)
 *  - Manual técnico BHISSDigital: https://prodabel.pbh.gov.br/nfse/manual.pdf
 */
import type { InvoiceRequest, InvoiceResult, NFSeProviderAdapter } from "../types";

export const PBHDirectProvider: NFSeProviderAdapter = {
  id: "pbh_direct",

  async issue(req: InvoiceRequest): Promise<InvoiceResult> {
    if (!req.certificate) {
      return {
        ok: false,
        error: {
          code: "CERTIFICATE_REQUIRED",
          message:
            "Emissão direta na PBH exige certificado digital A1. Faça upload em /app/fiscal/perfil.",
          retriable: false,
        },
      };
    }
    // TODO Fase 5:
    //  1. Decrypt certificate.pfxBase64 + password
    //  2. Carregar com node-forge: forge.pkcs12.pkcs12FromAsn1(...)
    //  3. Montar XML <InfDeclaracaoPrestacaoServico> conforme ABRASF 2.04
    //  4. Assinar com xml-crypto (XMLDSig)
    //  5. Embrulhar em <EnviarLoteRpsSincronoEnvio>
    //  6. POST SOAP ao endpoint
    //  7. Parsear resposta, extrair NumeroNfse + CodigoVerificacao
    //  8. Retornar XML decodificado da prefeitura
    return {
      ok: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message:
          "PBH direct ainda não implementado. Recomendamos usar Focus NFe ou PlugNotas como gateway nesta fase.",
        retriable: false,
      },
    };
  },

  async cancel(_opts) {
    return { ok: false, error: "PBH cancel — não implementado." };
  },
};
