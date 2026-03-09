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
  // Change amount (vTroco)
  changeAmount?: number; // cents
  // Payment card details (one per detPag that has card info)
  paymentCardDetails?: Array<{
    integType?: string; // tpIntegra: 1=integrated, 2=not integrated
    cardTaxId?: string; // CNPJ of card processor
    cardBrand?: string; // tBand code
    authCode?: string; // cAut authorization code
  }>;
  // Contingency
  contingency?: {
    type: ContingencyType;
    reason: string;
    at: Date;
  };
  // IDE group overrides (defaults match legacy behavior)
  /** tpNF: 0=inbound, 1=outbound. Default: 1 */
  operationType?: number;
  /** finNFe: 1=normal, 2=complementary, 3=adjustment, 4=return. Default: 1 */
  purposeCode?: number;
  /** indIntermed: 0=no intermediary, 1=marketplace, etc. Default: "0" */
  intermediaryIndicator?: string;
  /** procEmi: 0=own app, 1=Avulsa, etc. Default: "0" */
  emissionProcess?: string;
  /** indFinal: 0=normal, 1=final consumer */
  consumerType?: string;
  /** indPres: 0=not applicable, 1=in-person, etc. */
  buyerPresence?: string;
  /** tpImp: 1=portrait DANFE, 4=NFC-e DANFCE, etc. */
  printFormat?: string;
  // Referenced documents (NFref inside ide)
  references?: Array<
    | { type: "nfe"; accessKey: string }
    | { type: "nf"; stateCode: string; yearMonth: string; taxId: string; model: string; series: string; number: string }
    | { type: "nfp"; stateCode: string; yearMonth: string; taxId: string; model: string; series: string; number: string }
    | { type: "cte"; accessKey: string }
    | { type: "ecf"; model: string; ecfNumber: string; cooNumber: string }
  >;
  // Transport
  transport?: {
    freightMode: string; // modFrete: 0-9
    carrier?: {
      taxId?: string; // CNPJ or CPF
      name?: string;
      stateTaxId?: string;
      stateCode?: string;
      address?: string;
    };
    vehicle?: { plate: string; stateCode: string; rntc?: string };
    trailers?: Array<{ plate: string; stateCode: string; rntc?: string }>;
    volumes?: Array<{
      quantity?: number;
      species?: string;
      brand?: string;
      number?: string;
      netWeight?: number;
      grossWeight?: number;
      seals?: string[];
    }>;
    retainedIcms?: {
      vBCRet: number;
      pICMSRet: number;
      vICMSRet: number;
      cfop: string;
      cityCode: string;
    };
  };
  // Billing (cobr)
  billing?: {
    invoice?: {
      number: string;
      originalValue: number; // cents
      discountValue?: number; // cents
      netValue: number; // cents
    };
    installments?: Array<{
      number: string;
      dueDate: string; // YYYY-MM-DD
      value: number; // cents
    }>;
  };
  // Withdrawal location (retirada)
  withdrawal?: {
    taxId: string;
    name?: string;
    street: string;
    number: string;
    complement?: string;
    district: string;
    cityCode: string;
    cityName: string;
    stateCode: string;
    zipCode?: string;
  };
  // Delivery location (entrega)
  delivery?: {
    taxId: string;
    name?: string;
    street: string;
    number: string;
    complement?: string;
    district: string;
    cityCode: string;
    cityName: string;
    stateCode: string;
    zipCode?: string;
  };
  // Authorized XML download (autXML)
  authorizedXml?: Array<{ taxId: string }>;
  // Additional info (infAdic)
  additionalInfo?: {
    taxpayerNote?: string; // infCpl
    taxAuthorityNote?: string; // infAdFisco
    contributorObs?: Array<{ field: string; text: string }>; // obsCont
    fiscalObs?: Array<{ field: string; text: string }>; // obsFisco
    processRefs?: Array<{ number: string; origin: string }>; // procRef
  };
  // Intermediary (infIntermed)
  intermediary?: {
    taxId: string; // CNPJ
    idCadIntTran?: string;
  };
  // Retained taxes (retTrib inside total)
  retTrib?: RetTribData;
  // Tech responsible (infRespTec)
  techResponsible?: {
    taxId: string; // CNPJ
    contact: string; // xContato
    email: string;
    phone?: string; // fone
  };
  // Purchase (compra)
  purchase?: {
    orderNumber?: string; // xPed
    contractNumber?: string; // xCont
    purchaseNote?: string; // xNEmp
  };
  // Export (exporta)
  export?: {
    exitState: string; // UFSaidaPais
    exportLocation: string; // xLocExporta
    dispatchLocation?: string; // xLocDespacho
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
  // Product optional fields
  cEAN?: string;
  cEANTrib?: string;
  cest?: string; // CEST code
  vFrete?: number; // freight cents
  vSeg?: number; // insurance cents
  vDesc?: number; // discount cents
  vOutro?: number; // other costs cents
  // Origin
  orig?: string; // 0=national, 1-8=imported variants
  // ICMS fields (all optional, defaults handled by tax-icms module)
  icmsCst: string;
  icmsRate: number; // percentage x100 (e.g., 1800 = 18%)
  icmsAmount: number; // in cents
  icmsModBC?: number;
  icmsRedBC?: number; // reduction percentage x100
  icmsModBCST?: number;
  icmsPMVAST?: number; // MVA percentage x100
  icmsRedBCST?: number;
  icmsVBCST?: number;
  icmsPICMSST?: number;
  icmsVICMSST?: number;
  icmsVICMSDeson?: number;
  icmsMotDesICMS?: number;
  icmsPFCP?: number;
  icmsVFCP?: number;
  icmsVBCFCP?: number;
  icmsPFCPST?: number;
  icmsVFCPST?: number;
  icmsVBCFCPST?: number;
  icmsPCredSN?: number; // Simples Nacional credit rate
  icmsVCredICMSSN?: number; // Simples Nacional credit value
  icmsVICMSSubstituto?: number;
  // PIS fields
  pisCst: string;
  pisVBC?: number;
  pisPPIS?: number;
  pisVPIS?: number;
  pisQBCProd?: number;
  pisVAliqProd?: number;
  // COFINS fields
  cofinsCst: string;
  cofinsVBC?: number;
  cofinsPCOFINS?: number;
  cofinsVCOFINS?: number;
  cofinsQBCProd?: number;
  cofinsVAliqProd?: number;
  // IPI fields (optional)
  ipiCst?: string;
  ipiCEnq?: string;
  ipiVBC?: number;
  ipiPIPI?: number;
  ipiVIPI?: number;
  ipiQUnid?: number;
  ipiVUnid?: number;
  // II fields (optional, import only)
  iiVBC?: number;
  iiVDespAdu?: number;
  iiVII?: number;
  iiVIOF?: number;
  // Product-specific options (inside <prod>)
  rastro?: RastroData[];
  veicProd?: VeicProdData;
  med?: MedData;
  arma?: ArmaData[];
  nRECOPI?: string;
  // Per-item additional info (inside <det>, after imposto)
  infAdProd?: string;
  obsItem?: ObsItemData;
  dfeReferenciado?: DFeReferenciadoData;
}

/** Batch tracking (rastro) — up to 500 per item, inside prod */
export interface RastroData {
  nLote: string;
  qLote: number; // quantity in lot (3 decimal)
  dFab: string; // manufacture date YYYY-MM-DD
  dVal: string; // expiration date YYYY-MM-DD
  cAgreg?: string; // aggregation code (optional)
}

/** Vehicle details (veicProd) — inside prod */
export interface VeicProdData {
  tpOp: string;
  chassi: string;
  cCor: string;
  xCor: string;
  pot: string;
  cilin: string;
  pesoL: string;
  pesoB: string;
  nSerie: string;
  tpComb: string;
  nMotor: string;
  CMT: string;
  dist: string;
  anoMod: string;
  anoFab: string;
  tpPint: string;
  tpVeic: string;
  espVeic: string;
  VIN: string;
  condVeic: string;
  cMod: string;
  cCorDENATRAN: string;
  lota: string;
  tpRest: string;
}

/** Medicine details (med) — inside prod */
export interface MedData {
  cProdANVISA?: string;
  xMotivoIsencao?: string;
  vPMC: number; // max consumer price in cents
}

/** Weapon details (arma) — inside prod, up to 500 per item */
export interface ArmaData {
  tpArma: string;
  nSerie: string;
  nCano: string;
  descr: string;
}

/** Per-item observations (obsItem) — inside det */
export interface ObsItemData {
  obsCont?: { xCampo: string; xTexto: string };
  obsFisco?: { xCampo: string; xTexto: string };
}

/** Referenced DFe per item (DFeReferenciado) — inside det, PL_010 schema */
export interface DFeReferenciadoData {
  chaveAcesso: string;
  nItem?: string;
}

/** Retained taxes (retTrib) — inside total */
export interface RetTribData {
  vRetPIS?: number; // cents
  vRetCOFINS?: number; // cents
  vRetCSLL?: number; // cents
  vBCIRRF?: number; // cents
  vIRRF?: number; // cents
  vBCRetPrev?: number; // cents
  vRetPrev?: number; // cents
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
