/**
 * NF-e model: 55 = NF-e (B2B), 65 = NFC-e (consumer)
 *
 * [pt-BR] Modelo da NF-e: 55 = NF-e (entre empresas), 65 = NFC-e (consumidor)
 */
export type InvoiceModel = 55 | 65;

/**
 * Invoice status lifecycle
 *
 * [pt-BR] Ciclo de vida do status da nota fiscal
 */
export type InvoiceStatus =
  | "pending"
  | "authorized"
  | "rejected"
  | "cancelled"
  | "denied"
  | "contingency"
  | "voided";

/**
 * SEFAZ environment: 1 = production, 2 = homologation
 *
 * [pt-BR] Ambiente SEFAZ: 1 = produção, 2 = homologação
 */
export type SefazEnvironment = 1 | 2;

/**
 * Emission type (tpEmis): 1=normal, 6=SVC-AN, 7=SVC-RS, 9=offline contingency
 *
 * [pt-BR] Tipo de emissão (tpEmis): 1=normal, 6=SVC-AN, 7=SVC-RS, 9=contingência offline
 */
export type EmissionType = 1 | 6 | 7 | 9;

/**
 * Contingency type for NF-e emission fallback
 *
 * [pt-BR] Tipo de contingência para emissão de NF-e em caso de falha
 */
export type ContingencyType = "svc-an" | "svc-rs" | "offline";

/**
 * Tax regime (CRT): 1=Simples Nacional, 2=Simples excess, 3=Normal
 *
 * [pt-BR] Código de Regime Tributário (CRT): 1=Simples Nacional, 2=Excesso Simples, 3=Normal
 */
export type TaxRegime = 1 | 2 | 3;

/**
 * SEFAZ web service names used for SOAP requests
 *
 * [pt-BR] Nomes dos web services SEFAZ usados nas requisições SOAP
 */
export type SefazService =
  | "NfeStatusServico"
  | "NfeAutorizacao"
  | "NfeRetAutorizacao"
  | "NfeConsultaProtocolo"
  | "NfeInutilizacao"
  | "RecepcaoEvento";

/**
 * Certificate loaded from PFX file
 *
 * [pt-BR] Certificado digital carregado de arquivo PFX
 */
export interface CertificateData {
  /** Private key in PEM format / [pt-BR] Chave privada em formato PEM */
  privateKey: string;
  /** Certificate in PEM format / [pt-BR] Certificado em formato PEM */
  certificate: string;
  /** Raw PFX file buffer / [pt-BR] Buffer bruto do arquivo PFX */
  pfxBuffer: Buffer;
  /** PFX decryption passphrase / [pt-BR] Senha de descriptografia do PFX */
  passphrase: string;
}

/**
 * Certificate info for display purposes
 *
 * [pt-BR] Informações do certificado digital para exibição
 */
export interface CertificateInfo {
  /** Certificate holder name / [pt-BR] Nome do titular do certificado */
  commonName: string;
  /** Certificate validity start date / [pt-BR] Data de início da validade */
  validFrom: Date;
  /** Certificate expiration date / [pt-BR] Data de expiração do certificado */
  validUntil: Date;
  /** Certificate serial number / [pt-BR] Número de série do certificado */
  serialNumber: string;
  /** Certificate issuing authority / [pt-BR] Autoridade certificadora emissora */
  issuer: string;
}

/**
 * Fiscal settings from database (without raw PFX)
 *
 * [pt-BR] Configurações fiscais do banco de dados (sem PFX bruto)
 */
export interface FiscalSettings {
  /** Record ID / [pt-BR] ID do registro */
  id: number;
  /** Multi-tenant user identifier / [pt-BR] Identificador do usuário multi-tenant */
  userUid: string;
  /** Legal company name (razão social) / [pt-BR] Razão social */
  companyName: string;
  /** Trade name (nome fantasia) / [pt-BR] Nome fantasia */
  tradeName: string | null;
  /** CNPJ (14 digits) / [pt-BR] CNPJ (14 dígitos) */
  taxId: string;
  /** State tax registration (IE) / [pt-BR] Inscrição Estadual (IE) */
  stateTaxId: string;
  /** Tax regime (CRT) / [pt-BR] Código de Regime Tributário (CRT) */
  taxRegime: TaxRegime;
  /** State code (UF, 2 chars) / [pt-BR] Código da UF (2 caracteres) */
  stateCode: string;
  /** City IBGE code / [pt-BR] Código IBGE do município */
  cityCode: string;
  /** City name / [pt-BR] Nome do município */
  cityName: string;
  /** Street address / [pt-BR] Logradouro */
  street: string;
  /** Street number / [pt-BR] Número do endereço */
  streetNumber: string;
  /** District/neighborhood / [pt-BR] Bairro */
  district: string;
  /** ZIP code (CEP) / [pt-BR] CEP */
  zipCode: string;
  /** Address complement / [pt-BR] Complemento do endereço */
  addressComplement: string | null;
  /** SEFAZ environment / [pt-BR] Ambiente SEFAZ */
  environment: SefazEnvironment;
  /** NF-e series number / [pt-BR] Número de série da NF-e */
  nfeSeries: number;
  /** NFC-e series number / [pt-BR] Número de série da NFC-e */
  nfceSeries: number;
  /** Next NF-e sequential number / [pt-BR] Próximo número sequencial da NF-e */
  nextNfeNumber: number;
  /** Next NFC-e sequential number / [pt-BR] Próximo número sequencial da NFC-e */
  nextNfceNumber: number;
  /** NFC-e CSC identifier / [pt-BR] Identificador do CSC da NFC-e */
  cscId: string | null;
  /** NFC-e CSC token / [pt-BR] Token CSC da NFC-e */
  cscToken: string | null;
  /** PFX certificate binary / [pt-BR] Certificado PFX binário */
  certificatePfx: Buffer | null;
  /** PFX certificate password / [pt-BR] Senha do certificado PFX */
  certificatePassword: string | null;
  /** Certificate expiration date / [pt-BR] Data de expiração do certificado */
  certificateValidUntil: Date | null;
  /** Default NCM code for items / [pt-BR] NCM padrão para itens */
  defaultNcm: string;
  /** Default CFOP code for items / [pt-BR] CFOP padrão para itens */
  defaultCfop: string;
  /** Default ICMS CST / [pt-BR] CST ICMS padrão */
  defaultIcmsCst: string;
  /** Default PIS CST / [pt-BR] CST PIS padrão */
  defaultPisCst: string;
  /** Default COFINS CST / [pt-BR] CST COFINS padrão */
  defaultCofinsCst: string;
}

/**
 * Data needed to build an invoice XML
 *
 * [pt-BR] Dados necessários para construir o XML da nota fiscal
 */
export interface InvoiceBuildData {
  /** Invoice model (55=NF-e, 65=NFC-e) [pt-BR] Modelo da nota (55=NF-e, 65=NFC-e) */
  model: InvoiceModel;
  /** Invoice series number [pt-BR] Número de série da nota */
  series: number;
  /** Invoice sequential number [pt-BR] Número sequencial da nota */
  number: number;
  /** Emission type (normal, contingency, etc.) [pt-BR] Tipo de emissão (normal, contingência, etc.) */
  emissionType: EmissionType;
  /** SEFAZ environment (1=production, 2=homologation) [pt-BR] Ambiente SEFAZ (1=produção, 2=homologação) */
  environment: SefazEnvironment;
  /** Date/time of issuance [pt-BR] Data/hora de emissão */
  issuedAt: Date;
  /** Nature of the fiscal operation (natOp) [pt-BR] Natureza da operação fiscal (natOp) */
  operationNature: string;
  /** Issuer data (from fiscal settings) [pt-BR] Dados do emitente (das configurações fiscais) */
  issuer: {
    /** CNPJ (14 digits) [pt-BR] CNPJ (14 dígitos) */
    taxId: string;
    /** State tax registration (IE) [pt-BR] Inscrição Estadual (IE) */
    stateTaxId: string;
    /** Legal company name (razão social) [pt-BR] Razão social */
    companyName: string;
    /** Trade name (nome fantasia) [pt-BR] Nome fantasia */
    tradeName: string | null;
    /** Tax regime (CRT) [pt-BR] Código de Regime Tributário (CRT) */
    taxRegime: TaxRegime;
    /** State code (UF, 2 chars) [pt-BR] Código da UF (2 caracteres) */
    stateCode: string;
    /** City IBGE code [pt-BR] Código IBGE do município */
    cityCode: string;
    /** City name [pt-BR] Nome do município */
    cityName: string;
    /** Street address [pt-BR] Logradouro */
    street: string;
    /** Street number [pt-BR] Número do endereço */
    streetNumber: string;
    /** District/neighborhood [pt-BR] Bairro */
    district: string;
    /** ZIP code (CEP) [pt-BR] CEP */
    zipCode: string;
    /** Address complement [pt-BR] Complemento do endereço */
    addressComplement: string | null;
  };
  /** Recipient data (optional for NFC-e under R$200) [pt-BR] Dados do destinatário (opcional para NFC-e abaixo de R$200) */
  recipient?: {
    /** CPF or CNPJ [pt-BR] CPF ou CNPJ */
    taxId: string;
    /** Recipient name [pt-BR] Nome do destinatário */
    name: string;
    /** State code (UF) [pt-BR] Código da UF */
    stateCode?: string;
    /** State tax registration (IE) [pt-BR] Inscrição Estadual (IE) */
    stateTaxId?: string;
    /** Street address (required for NF-e model 55) [pt-BR] Logradouro (obrigatório para NF-e modelo 55) */
    street?: string;
    /** Street number [pt-BR] Número do endereço */
    streetNumber?: string;
    /** District/neighborhood [pt-BR] Bairro */
    district?: string;
    /** City IBGE code [pt-BR] Código IBGE do município */
    cityCode?: string;
    /** City name [pt-BR] Nome do município */
    cityName?: string;
    /** ZIP code (CEP) [pt-BR] CEP */
    zipCode?: string;
    /** Address complement [pt-BR] Complemento do endereço */
    complement?: string;
  };
  /** Invoice items [pt-BR] Itens da nota fiscal */
  items: InvoiceItemData[];
  /** Payment methods and amounts [pt-BR] Formas e valores de pagamento */
  payments: PaymentData[];
  /** Change amount in cents (vTroco) [pt-BR] Valor do troco em centavos (vTroco) */
  changeAmount?: number;
  /** Payment card details (one per detPag with card info) [pt-BR] Detalhes do cartão de pagamento (um por detPag com info de cartão) */
  paymentCardDetails?: Array<{
    /** Integration type (tpIntegra: 1=integrated, 2=not integrated) [pt-BR] Tipo de integração (tpIntegra: 1=integrado, 2=não integrado) */
    integType?: string;
    /** Card processor CNPJ [pt-BR] CNPJ da credenciadora do cartão */
    cardTaxId?: string;
    /** Card brand code (tBand) [pt-BR] Código da bandeira do cartão (tBand) */
    cardBrand?: string;
    /** Authorization code (cAut) [pt-BR] Código de autorização (cAut) */
    authCode?: string;
  }>;
  /** Contingency data for fallback emission [pt-BR] Dados de contingência para emissão em modo de falha */
  contingency?: {
    /** Contingency type [pt-BR] Tipo de contingência */
    type: ContingencyType;
    /** Reason for contingency [pt-BR] Motivo da contingência */
    reason: string;
    /** Date/time contingency started [pt-BR] Data/hora de início da contingência */
    at: Date;
  };
  // IDE group overrides (defaults match legacy behavior)
  /** tpNF: 0=inbound, 1=outbound. Default: 1 / [pt-BR] tpNF: 0=entrada, 1=saída. Padrão: 1 */
  operationType?: number;
  /** finNFe: 1=normal, 2=complementary, 3=adjustment, 4=return. Default: 1 / [pt-BR] finNFe: 1=normal, 2=complementar, 3=ajuste, 4=devolução. Padrão: 1 */
  purposeCode?: number;
  /** indIntermed: 0=no intermediary, 1=marketplace, etc. Default: "0" / [pt-BR] indIntermed: 0=sem intermediador, 1=marketplace, etc. Padrão: "0" */
  intermediaryIndicator?: string;
  /** procEmi: 0=own app, 1=Avulsa, etc. Default: "0" / [pt-BR] procEmi: 0=app próprio, 1=Avulsa, etc. Padrão: "0" */
  emissionProcess?: string;
  /** indFinal: 0=normal, 1=final consumer / [pt-BR] indFinal: 0=normal, 1=consumidor final */
  consumerType?: string;
  /** indPres: 0=not applicable, 1=in-person, etc. / [pt-BR] indPres: 0=não se aplica, 1=presencial, etc. */
  buyerPresence?: string;
  /** tpImp: 1=portrait DANFE, 4=NFC-e DANFCE, etc. / [pt-BR] tpImp: 1=DANFE retrato, 4=DANFCE NFC-e, etc. */
  printFormat?: string;
  /** Referenced documents (NFref inside ide) [pt-BR] Documentos referenciados (NFref dentro de ide) */
  references?: Array<
    | { type: "nfe"; accessKey: string }
    | { type: "nf"; stateCode: string; yearMonth: string; taxId: string; model: string; series: string; number: string }
    | { type: "nfp"; stateCode: string; yearMonth: string; taxId: string; model: string; series: string; number: string }
    | { type: "cte"; accessKey: string }
    | { type: "ecf"; model: string; ecfNumber: string; cooNumber: string }
  >;
  /** Transport data (transp) [pt-BR] Dados de transporte (transp) */
  transport?: {
    /** Freight mode (modFrete: 0-9) [pt-BR] Modalidade de frete (modFrete: 0-9) */
    freightMode: string;
    /** Carrier data [pt-BR] Dados da transportadora */
    carrier?: {
      /** CNPJ or CPF [pt-BR] CNPJ ou CPF */
      taxId?: string;
      /** Carrier name [pt-BR] Nome da transportadora */
      name?: string;
      /** State tax registration (IE) [pt-BR] Inscrição Estadual (IE) */
      stateTaxId?: string;
      /** State code (UF) [pt-BR] Código da UF */
      stateCode?: string;
      /** Full address [pt-BR] Endereço completo */
      address?: string;
    };
    /** Vehicle data [pt-BR] Dados do veículo */
    vehicle?: { plate: string; stateCode: string; rntc?: string };
    /** Trailer vehicles [pt-BR] Reboques */
    trailers?: Array<{ plate: string; stateCode: string; rntc?: string }>;
    /** Transport volumes [pt-BR] Volumes de transporte */
    volumes?: Array<{
      /** Number of volumes [pt-BR] Quantidade de volumes */
      quantity?: number;
      /** Volume species (e.g. box, pallet) [pt-BR] Espécie do volume (ex: caixa, pallet) */
      species?: string;
      /** Volume brand [pt-BR] Marca do volume */
      brand?: string;
      /** Volume number [pt-BR] Número do volume */
      number?: string;
      /** Net weight in kg [pt-BR] Peso líquido em kg */
      netWeight?: number;
      /** Gross weight in kg [pt-BR] Peso bruto em kg */
      grossWeight?: number;
      /** Seal numbers [pt-BR] Números dos lacres */
      seals?: string[];
    }>;
    /** ICMS retained in transport (ICMSRet) [pt-BR] ICMS retido no transporte (ICMSRet) */
    retainedIcms?: {
      /** ICMS retained tax base [pt-BR] Base de cálculo do ICMS retido */
      vBCRet: number;
      /** ICMS retained rate [pt-BR] Alíquota do ICMS retido */
      pICMSRet: number;
      /** ICMS retained amount [pt-BR] Valor do ICMS retido */
      vICMSRet: number;
      /** CFOP code [pt-BR] Código CFOP */
      cfop: string;
      /** City IBGE code [pt-BR] Código IBGE do município */
      cityCode: string;
    };
  };
  /** Billing data (cobr) [pt-BR] Dados de cobrança (cobr) */
  billing?: {
    /** Invoice/bill header (fat) [pt-BR] Fatura (fat) */
    invoice?: {
      /** Invoice number [pt-BR] Número da fatura */
      number: string;
      /** Original value in cents [pt-BR] Valor original em centavos */
      originalValue: number;
      /** Discount value in cents [pt-BR] Valor do desconto em centavos */
      discountValue?: number;
      /** Net value in cents [pt-BR] Valor líquido em centavos */
      netValue: number;
    };
    /** Installments (dup) [pt-BR] Duplicatas (dup) */
    installments?: Array<{
      /** Installment number [pt-BR] Número da parcela */
      number: string;
      /** Due date (YYYY-MM-DD) [pt-BR] Data de vencimento (AAAA-MM-DD) */
      dueDate: string;
      /** Installment value in cents [pt-BR] Valor da parcela em centavos */
      value: number;
    }>;
  };
  /** Withdrawal/pickup location (retirada) [pt-BR] Local de retirada (retirada) */
  withdrawal?: {
    /** CNPJ or CPF [pt-BR] CNPJ ou CPF */
    taxId: string;
    /** Name [pt-BR] Nome */
    name?: string;
    /** Street address [pt-BR] Logradouro */
    street: string;
    /** Street number [pt-BR] Número do endereço */
    number: string;
    /** Address complement [pt-BR] Complemento do endereço */
    complement?: string;
    /** District/neighborhood [pt-BR] Bairro */
    district: string;
    /** City IBGE code [pt-BR] Código IBGE do município */
    cityCode: string;
    /** City name [pt-BR] Nome do município */
    cityName: string;
    /** State code (UF) [pt-BR] Código da UF */
    stateCode: string;
    /** ZIP code (CEP) [pt-BR] CEP */
    zipCode?: string;
  };
  /** Delivery location (entrega) [pt-BR] Local de entrega (entrega) */
  delivery?: {
    /** CNPJ or CPF [pt-BR] CNPJ ou CPF */
    taxId: string;
    /** Name [pt-BR] Nome */
    name?: string;
    /** Street address [pt-BR] Logradouro */
    street: string;
    /** Street number [pt-BR] Número do endereço */
    number: string;
    /** Address complement [pt-BR] Complemento do endereço */
    complement?: string;
    /** District/neighborhood [pt-BR] Bairro */
    district: string;
    /** City IBGE code [pt-BR] Código IBGE do município */
    cityCode: string;
    /** City name [pt-BR] Nome do município */
    cityName: string;
    /** State code (UF) [pt-BR] Código da UF */
    stateCode: string;
    /** ZIP code (CEP) [pt-BR] CEP */
    zipCode?: string;
  };
  /** Authorized XML downloaders (autXML) [pt-BR] Autorizados para download do XML (autXML) */
  authorizedXml?: Array<{ taxId: string }>;
  /** Additional info (infAdic) [pt-BR] Informações adicionais (infAdic) */
  additionalInfo?: {
    /** Taxpayer note (infCpl) [pt-BR] Informações complementares do contribuinte (infCpl) */
    taxpayerNote?: string;
    /** Tax authority note (infAdFisco) [pt-BR] Informações adicionais de interesse do fisco (infAdFisco) */
    taxAuthorityNote?: string;
    /** Contributor observations (obsCont) [pt-BR] Observações do contribuinte (obsCont) */
    contributorObs?: Array<{ field: string; text: string }>;
    /** Fiscal observations (obsFisco) [pt-BR] Observações do fisco (obsFisco) */
    fiscalObs?: Array<{ field: string; text: string }>;
    /** Process references (procRef) [pt-BR] Referências a processos (procRef) */
    processRefs?: Array<{ number: string; origin: string }>;
  };
  /** Intermediary info (infIntermed) [pt-BR] Informações do intermediador (infIntermed) */
  intermediary?: {
    /** Intermediary CNPJ [pt-BR] CNPJ do intermediador */
    taxId: string;
    /** Intermediary registration ID [pt-BR] Identificador cadastral do intermediador */
    idCadIntTran?: string;
  };
  /** Retained taxes (retTrib inside total) [pt-BR] Tributos retidos (retTrib dentro de total) */
  retTrib?: RetTribData;
  /** Tech responsible (infRespTec) [pt-BR] Responsável técnico (infRespTec) */
  techResponsible?: {
    /** CNPJ [pt-BR] CNPJ */
    taxId: string;
    /** Contact name (xContato) [pt-BR] Nome do contato (xContato) */
    contact: string;
    /** Email address [pt-BR] Endereço de email */
    email: string;
    /** Phone number (fone) [pt-BR] Número de telefone (fone) */
    phone?: string;
  };
  /** Purchase data (compra) [pt-BR] Dados de compra (compra) */
  purchase?: {
    /** Purchase order number (xPed) [pt-BR] Número do pedido de compra (xPed) */
    orderNumber?: string;
    /** Contract number (xCont) [pt-BR] Número do contrato (xCont) */
    contractNumber?: string;
    /** Purchase note (xNEmp) [pt-BR] Nota de empenho (xNEmp) */
    purchaseNote?: string;
  };
  /** Export data (exporta) [pt-BR] Dados de exportação (exporta) */
  export?: {
    /** Exit state (UFSaidaPais) [pt-BR] UF de saída do país (UFSaidaPais) */
    exitState: string;
    /** Export location (xLocExporta) [pt-BR] Local de exportação (xLocExporta) */
    exportLocation: string;
    /** Dispatch location (xLocDespacho) [pt-BR] Local de despacho (xLocDespacho) */
    dispatchLocation?: string;
  };
}

/**
 * Item data for XML building
 *
 * [pt-BR] Dados do item para construção do XML
 */
export interface InvoiceItemData {
  /** Sequential item number [pt-BR] Número sequencial do item */
  itemNumber: number;
  /** Internal product code [pt-BR] Código interno do produto */
  productCode: string;
  /** Product description [pt-BR] Descrição do produto */
  description: string;
  /** NCM code (Nomenclatura Comum do Mercosul) [pt-BR] Código NCM (Nomenclatura Comum do Mercosul) */
  ncm: string;
  /** CFOP code [pt-BR] Código CFOP */
  cfop: string;
  /** Unit of measure (e.g. UN, KG) [pt-BR] Unidade de medida (ex: UN, KG) */
  unitOfMeasure: string;
  /** Quantity (will be formatted as 4 decimal) [pt-BR] Quantidade (será formatada com 4 decimais) */
  quantity: number;
  /** Unit price in cents [pt-BR] Preço unitário em centavos */
  unitPrice: number;
  /** Total price in cents [pt-BR] Preço total em centavos */
  totalPrice: number;
  /** EAN/GTIN barcode [pt-BR] Código de barras EAN/GTIN */
  cEAN?: string;
  /** Taxable unit EAN/GTIN barcode [pt-BR] Código de barras EAN/GTIN da unidade tributável */
  cEANTrib?: string;
  /** CEST code [pt-BR] Código CEST */
  cest?: string;
  /** Freight value in cents [pt-BR] Valor do frete em centavos */
  vFrete?: number;
  /** Insurance value in cents [pt-BR] Valor do seguro em centavos */
  vSeg?: number;
  /** Discount value in cents [pt-BR] Valor do desconto em centavos */
  vDesc?: number;
  /** Other costs in cents [pt-BR] Outras despesas em centavos */
  vOutro?: number;
  /** Product origin (0=national, 1-8=imported variants) [pt-BR] Origem do produto (0=nacional, 1-8=variantes importadas) */
  orig?: string;
  /** ICMS CST code [pt-BR] Código CST do ICMS */
  icmsCst: string;
  /** ICMS rate (percentage x100, e.g. 1800 = 18%) [pt-BR] Alíquota ICMS (percentual x100, ex: 1800 = 18%) */
  icmsRate: number;
  /** ICMS amount in cents [pt-BR] Valor do ICMS em centavos */
  icmsAmount: number;
  /** ICMS tax base modality [pt-BR] Modalidade da base de cálculo do ICMS */
  icmsModBC?: number;
  /** ICMS tax base reduction (percentage x100) [pt-BR] Redução da base de cálculo do ICMS (percentual x100) */
  icmsRedBC?: number;
  /** ICMS-ST tax base modality [pt-BR] Modalidade da base de cálculo do ICMS-ST */
  icmsModBCST?: number;
  /** MVA percentage for ICMS-ST (x100) [pt-BR] Percentual MVA do ICMS-ST (x100) */
  icmsPMVAST?: number;
  /** ICMS-ST tax base reduction [pt-BR] Redução da base de cálculo do ICMS-ST */
  icmsRedBCST?: number;
  /** ICMS-ST tax base amount [pt-BR] Valor da base de cálculo do ICMS-ST */
  icmsVBCST?: number;
  /** ICMS-ST rate [pt-BR] Alíquota do ICMS-ST */
  icmsPICMSST?: number;
  /** ICMS-ST amount [pt-BR] Valor do ICMS-ST */
  icmsVICMSST?: number;
  /** ICMS exempted/desonerated amount [pt-BR] Valor do ICMS desonerado */
  icmsVICMSDeson?: number;
  /** ICMS desoneration reason code [pt-BR] Código do motivo de desoneração do ICMS */
  icmsMotDesICMS?: number;
  /** FCP (Fundo de Combate a Pobreza) rate [pt-BR] Alíquota do FCP (Fundo de Combate a Pobreza) */
  icmsPFCP?: number;
  /** FCP amount [pt-BR] Valor do FCP */
  icmsVFCP?: number;
  /** FCP tax base amount [pt-BR] Valor da base de cálculo do FCP */
  icmsVBCFCP?: number;
  /** FCP-ST rate [pt-BR] Alíquota do FCP-ST */
  icmsPFCPST?: number;
  /** FCP-ST amount [pt-BR] Valor do FCP-ST */
  icmsVFCPST?: number;
  /** FCP-ST tax base amount [pt-BR] Valor da base de cálculo do FCP-ST */
  icmsVBCFCPST?: number;
  /** Simples Nacional credit rate [pt-BR] Alíquota de crédito do Simples Nacional */
  icmsPCredSN?: number;
  /** Simples Nacional credit amount [pt-BR] Valor do crédito do Simples Nacional */
  icmsVCredICMSSN?: number;
  /** ICMS substitute amount [pt-BR] Valor do ICMS substituto */
  icmsVICMSSubstituto?: number;
  /** PIS CST code [pt-BR] Código CST do PIS */
  pisCst: string;
  /** PIS tax base amount [pt-BR] Valor da base de cálculo do PIS */
  pisVBC?: number;
  /** PIS rate [pt-BR] Alíquota do PIS */
  pisPPIS?: number;
  /** PIS amount [pt-BR] Valor do PIS */
  pisVPIS?: number;
  /** PIS quantity tax base (for per-unit taxation) [pt-BR] Base de cálculo do PIS em quantidade (tributação por unidade) */
  pisQBCProd?: number;
  /** PIS per-unit rate [pt-BR] Alíquota do PIS por unidade */
  pisVAliqProd?: number;
  /** COFINS CST code [pt-BR] Código CST do COFINS */
  cofinsCst: string;
  /** COFINS tax base amount [pt-BR] Valor da base de cálculo do COFINS */
  cofinsVBC?: number;
  /** COFINS rate [pt-BR] Alíquota do COFINS */
  cofinsPCOFINS?: number;
  /** COFINS amount [pt-BR] Valor do COFINS */
  cofinsVCOFINS?: number;
  /** COFINS quantity tax base (for per-unit taxation) [pt-BR] Base de cálculo do COFINS em quantidade (tributação por unidade) */
  cofinsQBCProd?: number;
  /** COFINS per-unit rate [pt-BR] Alíquota do COFINS por unidade */
  cofinsVAliqProd?: number;
  /** IPI CST code [pt-BR] Código CST do IPI */
  ipiCst?: string;
  /** IPI framework code (cEnq) [pt-BR] Código de enquadramento do IPI (cEnq) */
  ipiCEnq?: string;
  /** IPI tax base amount [pt-BR] Valor da base de cálculo do IPI */
  ipiVBC?: number;
  /** IPI rate [pt-BR] Alíquota do IPI */
  ipiPIPI?: number;
  /** IPI amount [pt-BR] Valor do IPI */
  ipiVIPI?: number;
  /** IPI quantity (per-unit taxation) [pt-BR] Quantidade do IPI (tributação por unidade) */
  ipiQUnid?: number;
  /** IPI per-unit value [pt-BR] Valor por unidade do IPI */
  ipiVUnid?: number;
  /** Import tax (II) tax base [pt-BR] Base de cálculo do Imposto de Importação (II) */
  iiVBC?: number;
  /** Import customs expenses [pt-BR] Despesas aduaneiras */
  iiVDespAdu?: number;
  /** Import tax (II) amount [pt-BR] Valor do Imposto de Importação (II) */
  iiVII?: number;
  /** IOF amount on import [pt-BR] Valor do IOF sobre importação */
  iiVIOF?: number;
  /** Batch tracking data (rastro) [pt-BR] Dados de rastreabilidade de lote (rastro) */
  rastro?: RastroData[];
  /** Vehicle details (veicProd) [pt-BR] Detalhes do veículo (veicProd) */
  veicProd?: VeicProdData;
  /** Medicine details (med) [pt-BR] Detalhes de medicamento (med) */
  med?: MedData;
  /** Weapon details (arma) [pt-BR] Detalhes de armamento (arma) */
  arma?: ArmaData[];
  /** RECOPI number [pt-BR] Número RECOPI */
  nRECOPI?: string;
  /** Per-item additional info text [pt-BR] Informações adicionais do item */
  infAdProd?: string;
  /** Per-item observations [pt-BR] Observações do item */
  obsItem?: ObsItemData;
  /** Referenced DFe per item [pt-BR] DF-e referenciado por item */
  dfeReferenciado?: DFeReferenciadoData;
}

/**
 * Batch tracking (rastro) -- up to 500 per item, inside prod
 *
 * [pt-BR] Rastreabilidade de lote -- até 500 por item, dentro de prod
 */
export interface RastroData {
  /** Lot number [pt-BR] Número do lote */
  nLote: string;
  /** Lot quantity (3 decimal places) [pt-BR] Quantidade no lote (3 casas decimais) */
  qLote: number;
  /** Manufacture date (YYYY-MM-DD) [pt-BR] Data de fabricação (AAAA-MM-DD) */
  dFab: string;
  /** Expiration date (YYYY-MM-DD) [pt-BR] Data de validade (AAAA-MM-DD) */
  dVal: string;
  /** Aggregation code [pt-BR] Código de agregação */
  cAgreg?: string;
}

/**
 * Vehicle details (veicProd) -- inside prod
 *
 * [pt-BR] Detalhes do veículo (veicProd) -- dentro de prod
 */
export interface VeicProdData {
  /** Operation type (1=standalone, 2=linked, 3=direct sale) [pt-BR] Tipo de operação (1=avulsa, 2=vinculada, 3=venda direta) */
  tpOp: string;
  /** Chassis number [pt-BR] Número do chassi */
  chassi: string;
  /** Color code [pt-BR] Código da cor */
  cCor: string;
  /** Color description [pt-BR] Descrição da cor */
  xCor: string;
  /** Engine power (HP) [pt-BR] Potência do motor (CV) */
  pot: string;
  /** Engine displacement (cc) [pt-BR] Cilindradas do motor (cc) */
  cilin: string;
  /** Net weight (kg) [pt-BR] Peso líquido (kg) */
  pesoL: string;
  /** Gross weight (kg) [pt-BR] Peso bruto (kg) */
  pesoB: string;
  /** Serial number [pt-BR] Número de série */
  nSerie: string;
  /** Fuel type [pt-BR] Tipo de combustível */
  tpComb: string;
  /** Engine number [pt-BR] Número do motor */
  nMotor: string;
  /** Maximum traction capacity (kg) [pt-BR] Capacidade máxima de tração (kg) */
  CMT: string;
  /** Wheelbase distance (mm) [pt-BR] Distância entre eixos (mm) */
  dist: string;
  /** Model year [pt-BR] Ano do modelo */
  anoMod: string;
  /** Manufacture year [pt-BR] Ano de fabricação */
  anoFab: string;
  /** Paint type [pt-BR] Tipo de pintura */
  tpPint: string;
  /** Vehicle type [pt-BR] Tipo de veículo */
  tpVeic: string;
  /** Vehicle species [pt-BR] Espécie do veículo */
  espVeic: string;
  /** VIN marking condition [pt-BR] Condição do VIN */
  VIN: string;
  /** Vehicle condition (1=finished, 2=unfinished, 3=semi-finished) [pt-BR] Condição do veículo (1=acabado, 2=inacabado, 3=semi-acabado) */
  condVeic: string;
  /** Model code [pt-BR] Código do modelo */
  cMod: string;
  /** DENATRAN color code [pt-BR] Código de cor DENATRAN */
  cCorDENATRAN: string;
  /** Passenger capacity [pt-BR] Capacidade de passageiros (lotação) */
  lota: string;
  /** Restriction type (0=none, 1=lien, etc.) [pt-BR] Tipo de restrição (0=nenhuma, 1=alienação, etc.) */
  tpRest: string;
}

/**
 * Medicine details (med) -- inside prod
 *
 * [pt-BR] Detalhes de medicamento (med) -- dentro de prod
 */
export interface MedData {
  /** ANVISA product code [pt-BR] Código do produto ANVISA */
  cProdANVISA?: string;
  /** ANVISA exemption reason [pt-BR] Motivo de isenção ANVISA */
  xMotivoIsencao?: string;
  /** Maximum consumer price in cents [pt-BR] Preço máximo ao consumidor em centavos */
  vPMC: number;
}

/**
 * Weapon details (arma) -- inside prod, up to 500 per item
 *
 * [pt-BR] Detalhes de armamento (arma) -- dentro de prod, até 500 por item
 */
export interface ArmaData {
  /** Weapon type (0=permitted use, 1=restricted use) [pt-BR] Tipo de arma (0=uso permitido, 1=uso restrito) */
  tpArma: string;
  /** Serial number [pt-BR] Número de série */
  nSerie: string;
  /** Barrel number [pt-BR] Número do cano */
  nCano: string;
  /** Weapon description [pt-BR] Descrição da arma */
  descr: string;
}

/**
 * Per-item observations (obsItem) -- inside det
 *
 * [pt-BR] Observações por item (obsItem) -- dentro de det
 */
export interface ObsItemData {
  /** Contributor observation (field + text) [pt-BR] Observação do contribuinte (campo + texto) */
  obsCont?: { xCampo: string; xTexto: string };
  /** Fiscal observation (field + text) [pt-BR] Observação do fisco (campo + texto) */
  obsFisco?: { xCampo: string; xTexto: string };
}

/**
 * Referenced DFe per item (DFeReferenciado) -- inside det, PL_010 schema
 *
 * [pt-BR] DF-e referenciado por item (DFeReferenciado) -- dentro de det, schema PL_010
 */
export interface DFeReferenciadoData {
  /** Access key of the referenced DFe [pt-BR] Chave de acesso do DF-e referenciado */
  chaveAcesso: string;
  /** Item number in the referenced DFe [pt-BR] Número do item no DF-e referenciado */
  nItem?: string;
}

/**
 * Retained taxes (retTrib) -- inside total
 *
 * [pt-BR] Tributos retidos (retTrib) -- dentro de total
 */
export interface RetTribData {
  /** Retained PIS amount in cents [pt-BR] Valor do PIS retido em centavos */
  vRetPIS?: number;
  /** Retained COFINS amount in cents [pt-BR] Valor do COFINS retido em centavos */
  vRetCOFINS?: number;
  /** Retained CSLL amount in cents [pt-BR] Valor do CSLL retido em centavos */
  vRetCSLL?: number;
  /** IRRF tax base in cents [pt-BR] Base de cálculo do IRRF em centavos */
  vBCIRRF?: number;
  /** IRRF amount in cents [pt-BR] Valor do IRRF em centavos */
  vIRRF?: number;
  /** Social security retention tax base in cents [pt-BR] Base de cálculo da retenção previdenciária em centavos */
  vBCRetPrev?: number;
  /** Social security retained amount in cents [pt-BR] Valor da retenção previdenciária em centavos */
  vRetPrev?: number;
}

/**
 * Payment data for invoice
 *
 * [pt-BR] Dados de pagamento da nota fiscal
 */
export interface PaymentData {
  /** Payment method code (tPag: 01=cash, 03=card, etc.) / [pt-BR] Código do meio de pagamento (tPag) */
  method: string;
  /** Payment amount in cents / [pt-BR] Valor do pagamento em centavos */
  amount: number;
}

/**
 * SEFAZ response after processing
 *
 * [pt-BR] Resposta da SEFAZ após processamento
 */
export interface SefazResponse {
  /** Whether the request succeeded / [pt-BR] Se a requisição foi bem-sucedida */
  success: boolean;
  /** Status code (cStat) / [pt-BR] Código de status (cStat) */
  statusCode: number;
  /** Status message (xMotivo) / [pt-BR] Mensagem de status (xMotivo) */
  statusMessage: string;
  /** Authorization protocol number / [pt-BR] Número do protocolo de autorização */
  protocolNumber?: string;
  /** Protocol XML fragment / [pt-BR] Fragmento XML do protocolo */
  protocolXml?: string;
  /** Full SEFAZ response XML / [pt-BR] XML completo da resposta SEFAZ */
  responseXml: string;
  /** Date/time of authorization / [pt-BR] Data/hora da autorização */
  authorizedAt?: Date;
}

/**
 * Access key components for NF-e/NFC-e
 *
 * [pt-BR] Componentes da chave de acesso da NF-e/NFC-e
 */
export interface AccessKeyParams {
  /** 2-digit IBGE state code / [pt-BR] Código IBGE da UF (2 dígitos) */
  stateCode: string;
  /** Year-month in YYMM format / [pt-BR] Ano-mês no formato AAMM */
  yearMonth: string;
  /** CNPJ (14 digits) / [pt-BR] CNPJ (14 dígitos) */
  taxId: string;
  /** Invoice model (55 or 65) / [pt-BR] Modelo da nota (55 ou 65) */
  model: InvoiceModel;
  /** Invoice series number / [pt-BR] Número de série da nota */
  series: number;
  /** Invoice sequential number / [pt-BR] Número sequencial da nota */
  number: number;
  /** Emission type code / [pt-BR] Código do tipo de emissão */
  emissionType: EmissionType;
  /** 8 random digits for the key / [pt-BR] 8 dígitos aleatórios para a chave */
  numericCode: string;
}
