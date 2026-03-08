/** NF-e model: 55 = NF-e (B2B), 65 = NFC-e (consumer) */
export type InvoiceModel = 55 | 65;

/** Invoice status lifecycle */
export type InvoiceStatus =
  | "pending"
  | "authorized"
  | "rejected"
  | "cancelled"
  | "denied"
  | "contingency"
  | "voided";

/** SEFAZ environment */
export type SefazEnvironment = 1 | 2; // 1=production, 2=homologation

/** Emission type (tpEmis) */
export type EmissionType = 1 | 6 | 7 | 9;
// 1=normal, 6=SVC-AN, 7=SVC-RS, 9=offline contingency

/** Contingency type */
export type ContingencyType = "svc-an" | "svc-rs" | "offline";

/** Tax regime (CRT) */
export type TaxRegime = 1 | 2 | 3;
// 1=Simples Nacional, 2=Simples excess, 3=Normal

/** SEFAZ web service names */
export type SefazService =
  | "NfeStatusServico"
  | "NfeAutorizacao"
  | "NfeRetAutorizacao"
  | "NfeConsultaProtocolo"
  | "NfeInutilizacao"
  | "RecepcaoEvento";

/** Certificate loaded from PFX */
export interface CertificateData {
  privateKey: string; // PEM
  certificate: string; // PEM
  pfxBuffer: Buffer;
  passphrase: string;
}

/** Certificate info for display */
export interface CertificateInfo {
  commonName: string;
  validFrom: Date;
  validUntil: Date;
  serialNumber: string;
  issuer: string;
}

/** Fiscal settings from database (without raw PFX) */
export interface FiscalSettings {
  id: number;
  userUid: string;
  companyName: string;
  tradeName: string | null;
  taxId: string; // CNPJ
  stateTaxId: string; // IE
  taxRegime: TaxRegime;
  stateCode: string; // UF
  cityCode: string; // IBGE
  cityName: string;
  street: string;
  streetNumber: string;
  district: string;
  zipCode: string;
  addressComplement: string | null;
  environment: SefazEnvironment;
  nfeSeries: number;
  nfceSeries: number;
  nextNfeNumber: number;
  nextNfceNumber: number;
  cscId: string | null;
  cscToken: string | null;
  certificatePfx: Buffer | null;
  certificatePassword: string | null;
  certificateValidUntil: Date | null;
  defaultNcm: string;
  defaultCfop: string;
  defaultIcmsCst: string;
  defaultPisCst: string;
  defaultCofinsCst: string;
}

/** Data needed to build an invoice XML */
export interface InvoiceBuildData {
  model: InvoiceModel;
  series: number;
  number: number;
  emissionType: EmissionType;
  environment: SefazEnvironment;
  issuedAt: Date;
  operationNature: string;
  // Issuer (from fiscal settings)
  issuer: {
    taxId: string;
    stateTaxId: string;
    companyName: string;
    tradeName: string | null;
    taxRegime: TaxRegime;
    stateCode: string;
    cityCode: string;
    cityName: string;
    street: string;
    streetNumber: string;
    district: string;
    zipCode: string;
    addressComplement: string | null;
  };
  // Recipient (optional for NFC-e under R$200)
  recipient?: {
    taxId: string; // CPF or CNPJ
    name: string;
    stateCode?: string;
    stateTaxId?: string;
  };
  // Items
  items: InvoiceItemData[];
  // Payment
  payments: PaymentData[];
  // Contingency
  contingency?: {
    type: ContingencyType;
    reason: string;
    at: Date;
  };
}

/** Item data for XML building */
export interface InvoiceItemData {
  itemNumber: number;
  productCode: string;
  description: string;
  ncm: string;
  cfop: string;
  unitOfMeasure: string;
  quantity: number; // actual quantity (will be formatted as 4 decimal)
  unitPrice: number; // in cents
  totalPrice: number; // in cents
  icmsCst: string;
  icmsRate: number; // percentage x100 (e.g., 1800 = 18%)
  icmsAmount: number; // in cents
  pisCst: string;
  cofinsCst: string;
}

/** Payment data */
export interface PaymentData {
  method: string; // tPag code (01=cash, 03=card, etc.)
  amount: number; // cents
}

/** SEFAZ response after processing */
export interface SefazResponse {
  success: boolean;
  statusCode: number; // cStat
  statusMessage: string; // xMotivo
  protocolNumber?: string;
  protocolXml?: string;
  responseXml: string;
  authorizedAt?: Date;
}

/** Access key components */
export interface AccessKeyParams {
  stateCode: string; // 2 digits UF IBGE
  yearMonth: string; // AAMM
  taxId: string; // CNPJ 14 digits
  model: InvoiceModel;
  series: number;
  number: number;
  emissionType: EmissionType;
  numericCode: string; // 8 random digits
}
