/**
 * Tipos compartilhados entre os providers de NFSe.
 *
 * Cada provider (PBH direct, Focus NFe, PlugNotas, eNotas, sim) recebe um
 * `InvoiceRequest` e devolve um `InvoiceResult`. A abstração é fina pra não
 * vazar particularidades de nenhum provider — quem precisar de algo
 * município-específico (ex.: BHISSDigital exige RPS prévio com série A) trata
 * dentro do próprio adapter.
 */

export type FiscalProvider =
  | "sim"
  | "pbh_direct"
  | "focus_nfe"
  | "plugnotas"
  | "enotas";

export interface InvoiceRequest {
  /** Dados do prestador (CPF/CNPJ, IM, endereço). */
  provider: {
    documentType: "PF" | "PJ";
    documentNumber: string;
    legalName: string;
    municipalInscription?: string | null;
    cityCode: string;
    address: {
      street: string;
      number: string;
      complement?: string | null;
      district: string;
      cityCode: string;
      cityName: string;
      stateCode: string;
      zipCode: string;
    };
    regime: "mei" | "simples_nacional" | "lucro_presumido" | "lucro_real";
  };
  /** Dados do tomador. */
  recipient: {
    documentType: "PF" | "PJ";
    documentNumber: string;
    name: string;
    email?: string | null;
    municipalInscription?: string | null;
    address?: {
      street: string;
      number: string;
      complement?: string | null;
      district: string;
      cityCode: string;
      cityName: string;
      stateCode: string;
      zipCode: string;
    } | null;
  };
  /** Serviço. */
  service: {
    /** Código LC 116/03 (ex.: "1.05") */
    code: string;
    /** CNAE (5 dígitos) */
    cnae?: string | null;
    /** Descrição livre que aparece no XML. */
    description: string;
    /** Valor total do serviço em centavos. */
    valueCents: number;
    /** Alíquota de ISS em basis points (200 = 2%). */
    issRateBps: number;
    /** ISS retido na fonte pelo tomador? */
    issWithheld: boolean;
    /** Retenções federais e municipais opcionais. */
    withholdings?: {
      pisCents?: number;
      cofinsCents?: number;
      irrfCents?: number;
      inssCents?: number;
      csllCents?: number;
    };
  };
  /** RPS — controle interno do emissor. */
  rps: {
    number: number;
    serie: string;
  };
  /** Data de competência (geralmente o dia da emissão). */
  competenceDate: string; // ISO
  /** Ambiente: 'homologacao' | 'producao' */
  environment: "homologacao" | "producao";
  /** Certificado opcional (alguns providers exigem; sim+focus+plugnotas não). */
  certificate?: {
    pfxBase64: string;
    password: string;
  };
}

export interface InvoiceResult {
  ok: boolean;
  /** Número da NFSe atribuído (se sucesso). */
  nfseNumber?: number;
  /** Código de verificação retornado. */
  verificationCode?: string;
  /** XML retornado pelo provedor (base64 ou string crua). */
  xml?: string;
  /** PDF DANFE em base64, se o provedor já gerou. Senão, geramos depois. */
  pdfBase64?: string;
  /** Data confirmada pela prefeitura. */
  confirmedAt?: string;
  /** Erro estruturado quando ok=false. */
  error?: {
    code: string;
    message: string;
    retriable: boolean;
  };
  /** Payload bruto pra debug. */
  rawResponse?: unknown;
}

export interface NFSeProviderAdapter {
  readonly id: FiscalProvider;
  /** Emite a nota e retorna síncrono (ou faz polling internamente). */
  issue(req: InvoiceRequest): Promise<InvoiceResult>;
  /** Cancela uma nota emitida. */
  cancel(opts: {
    nfseNumber: number;
    verificationCode?: string;
    reason: string;
    environment: "homologacao" | "producao";
  }): Promise<{ ok: boolean; error?: string }>;
  /** Consulta status (útil quando o provider é assíncrono). */
  queryStatus?(opts: {
    rpsNumber: number;
    rpsSerie: string;
    environment: "homologacao" | "producao";
  }): Promise<InvoiceResult>;
}
