---
layout: docs
title: "InvoiceBuildData"
---

[@finopenpos/fiscal](/docs/api-reference/index) / InvoiceBuildData



Defined in: [types.ts:170](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L170)

Dados necessários para construir o XML da nota fiscal


## Properties

### additionalInfo?

```ts
optional additionalInfo: {
  contributorObs?: {
     field: string;
     text: string;
  }[];
  fiscalObs?: {
     field: string;
     text: string;
  }[];
  processRefs?: {
     number: string;
     origin: string;
  }[];
  taxAuthorityNote?: string;
  taxpayerNote?: string;
Additional info (infAdic) Informações adicionais (infAdic)
```

Defined in: [types.ts:412](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L412)


#### contributorObs?

```ts
optional contributorObs: {
  field: string;
  text: string;
Contributor observations (obsCont) Observações do contribuinte (obsCont)
```


#### fiscalObs?

```ts
optional fiscalObs: {
  field: string;
  text: string;
Fiscal observations (obsFisco) Observações do fisco (obsFisco)
```


#### processRefs?

```ts
optional processRefs: {
  number: string;
  origin: string;
Process references (procRef) Referências a processos (procRef)
```


#### taxAuthorityNote?

```ts
Tax authority note (infAdFisco) Informações adicionais de interesse do fisco (infAdFisco)
```


#### taxpayerNote?

```ts
Taxpayer note (infCpl) Informações complementares do contribuinte (infCpl)
```


***

### authorizedXml?

```ts
optional authorizedXml: {
  taxId: string;
Authorized XML downloaders (autXML) Autorizados para download do XML (autXML)
```

Defined in: [types.ts:410](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L410)


#### taxId

```ts
taxId: string;
```

***

### billing?

```ts
optional billing: {
  installments?: {
     dueDate: string;
     number: string;
     value: number;
  }[];
  invoice?: {
     discountValue?: number;
     netValue: number;
     number: string;
     originalValue: number;
  };
Billing data (cobr) Dados de cobrança (cobr)
```

Defined in: [types.ts:341](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L341)


#### installments?

```ts
optional installments: {
  dueDate: string;
  number: string;
  value: number;
Installments (dup) Duplicatas (dup)
```


#### invoice?

```ts
optional invoice: {
  discountValue?: number;
  netValue: number;
  number: string;
  originalValue: number;
Invoice/bill header (fat) Fatura (fat)
```


##### invoice.discountValue?

```ts
Discount value in cents Valor do desconto em centavos
```


##### invoice.netValue

```ts
Net value in cents Valor líquido em centavos
```


##### invoice.number

```ts
Invoice number Número da fatura
```


##### invoice.originalValue

```ts
Original value in cents Valor original em centavos
```


***

### buyerPresence?

```ts
indPres: 0=not applicable, 1=in-person, etc. / indPres: 0=não se aplica, 1=presencial, etc.
```

Defined in: [types.ts:277](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L277)


***

### changeAmount?

```ts
Change amount in cents (vTroco) Valor do troco em centavos (vTroco)
```

Defined in: [types.ts:244](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L244)


***

### consumerType?

```ts
indFinal: 0=normal, 1=final consumer / indFinal: 0=normal, 1=consumidor final
```

Defined in: [types.ts:275](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L275)


***

### contingency?

```ts
optional contingency: {
  at: Date;
  reason: string;
  type: ContingencyType;
Contingency data for fallback emission Dados de contingência para emissão em modo de falha
```

Defined in: [types.ts:257](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L257)


#### at

```ts
Date/time contingency started Data/hora de início da contingência
```


#### reason

```ts
Reason for contingency Motivo da contingência
```


#### type

```ts
Contingency type Tipo de contingência
```


***

### delivery?

```ts
optional delivery: {
  cityCode: string;
  cityName: string;
  complement?: string;
  district: string;
  name?: string;
  number: string;
  stateCode: string;
  street: string;
  taxId: string;
  zipCode?: string;
Delivery location (entrega) Local de entrega (entrega)
```

Defined in: [types.ts:387](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L387)


#### cityCode

```ts
City IBGE code Código IBGE do município
```


#### cityName

```ts
City name Nome do município
```


#### complement?

```ts
Address complement Complemento do endereço
```


#### district

```ts
District/neighborhood Bairro
```


#### name?

```ts
Name Nome
```


#### number

```ts
Street number Número do endereço
```


#### stateCode

```ts
State code (UF) Código da UF
```


#### street

```ts
Street address Logradouro
```


#### taxId

```ts
CNPJ or CPF CNPJ ou CPF
```


#### zipCode?

```ts
ZIP code (CEP) CEP
```


***

### emissionProcess?

```ts
procEmi: 0=own app, 1=Avulsa, etc. Default: "0" / procEmi: 0=app próprio, 1=Avulsa, etc. Padrão: "0"
```

Defined in: [types.ts:273](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L273)


***

### emissionType

```ts
Emission type (normal, contingency, etc.) Tipo de emissão (normal, contingência, etc.)
```

Defined in: [types.ts:178](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L178)


***

### environment

```ts
SEFAZ environment (1=production, 2=homologation) Ambiente SEFAZ (1=produção, 2=homologação)
```

Defined in: [types.ts:180](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L180)


***

### export?

```ts
optional export: {
  dispatchLocation?: string;
  exitState: string;
  exportLocation: string;
Export data (exporta) Dados de exportação (exporta)
```

Defined in: [types.ts:454](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L454)


#### dispatchLocation?

```ts
Dispatch location (xLocDespacho) Local de despacho (xLocDespacho)
```


#### exitState

```ts
Exit state (UFSaidaPais) UF de saída do país (UFSaidaPais)
```


#### exportLocation

```ts
Export location (xLocExporta) Local de exportação (xLocExporta)
```


***

### intermediary?

```ts
optional intermediary: {
  idCadIntTran?: string;
  taxId: string;
Intermediary info (infIntermed) Informações do intermediador (infIntermed)
```

Defined in: [types.ts:425](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L425)


#### idCadIntTran?

```ts
Intermediary registration ID Identificador cadastral do intermediador
```


#### taxId

```ts
Intermediary CNPJ CNPJ do intermediador
```


***

### intermediaryIndicator?

```ts
indIntermed: 0=no intermediary, 1=marketplace, etc. Default: "0" / indIntermed: 0=sem intermediador, 1=marketplace, etc. Padrão: "0"
```

Defined in: [types.ts:271](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L271)


***

### issuedAt

```ts
Date/time of issuance Data/hora de emissão
```

Defined in: [types.ts:182](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L182)


***

### issuer

```ts
issuer: {
  addressComplement: string | null;
  cityCode: string;
  cityName: string;
  companyName: string;
  district: string;
  stateCode: string;
  stateTaxId: string;
  street: string;
  streetNumber: string;
  taxId: string;
  taxRegime: TaxRegime;
  tradeName: string | null;
  zipCode: string;
Issuer data (from fiscal settings) Dados do emitente (das configurações fiscais)
```

Defined in: [types.ts:186](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L186)


#### addressComplement

```ts
Address complement Complemento do endereço
```


#### cityCode

```ts
City IBGE code Código IBGE do município
```


#### cityName

```ts
City name Nome do município
```


#### companyName

```ts
Legal company name (razão social) Razão social
```


#### district

```ts
District/neighborhood Bairro
```


#### stateCode

```ts
State code (UF, 2 chars) Código da UF (2 caracteres)
```


#### stateTaxId

```ts
State tax registration (IE) Inscrição Estadual (IE)
```


#### street

```ts
Street address Logradouro
```


#### streetNumber

```ts
Street number Número do endereço
```


#### taxId

```ts
CNPJ (14 digits) CNPJ (14 dígitos)
```


#### taxRegime

```ts
Tax regime (CRT) Código de Regime Tributário (CRT)
```


#### tradeName

```ts
Trade name (nome fantasia) Nome fantasia
```


#### zipCode

```ts
ZIP code (CEP) CEP
```


***

### items

```ts
Invoice items Itens da nota fiscal
```

Defined in: [types.ts:240](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L240)


***

### model

```ts
Invoice model (55=NF-e, 65=NFC-e) Modelo da nota (55=NF-e, 65=NFC-e)
```

Defined in: [types.ts:172](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L172)


***

### number

```ts
Invoice sequential number Número sequencial da nota
```

Defined in: [types.ts:176](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L176)


***

### operationNature

```ts
Nature of the fiscal operation (natOp) Natureza da operação fiscal (natOp)
```

Defined in: [types.ts:184](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L184)


***

### operationType?

```ts
tpNF: 0=inbound, 1=outbound. Default: 1 / tpNF: 0=entrada, 1=saída. Padrão: 1
```

Defined in: [types.ts:267](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L267)


***

### paymentCardDetails?

```ts
optional paymentCardDetails: {
  authCode?: string;
  cardBrand?: string;
  cardTaxId?: string;
  integType?: string;
Payment card details (one per detPag with card info) Detalhes do cartão de pagamento (um por detPag com info de cartão)
```

Defined in: [types.ts:246](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L246)


#### authCode?

```ts
Authorization code (cAut) Código de autorização (cAut)
```


#### cardBrand?

```ts
Card brand code (tBand) Código da bandeira do cartão (tBand)
```


#### cardTaxId?

```ts
Card processor CNPJ CNPJ da credenciadora do cartão
```


#### integType?

```ts
Integration type (tpIntegra: 1=integrated, 2=not integrated) Tipo de integração (tpIntegra: 1=integrado, 2=não integrado)
```


***

### payments

```ts
Payment methods and amounts Formas e valores de pagamento
```

Defined in: [types.ts:242](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L242)


***

### printFormat?

```ts
tpImp: 1=portrait DANFE, 4=NFC-e DANFCE, etc. / tpImp: 1=DANFE retrato, 4=DANFCE NFC-e, etc.
```

Defined in: [types.ts:279](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L279)


***

### purchase?

```ts
optional purchase: {
  contractNumber?: string;
  orderNumber?: string;
  purchaseNote?: string;
Purchase data (compra) Dados de compra (compra)
```

Defined in: [types.ts:445](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L445)


#### contractNumber?

```ts
Contract number (xCont) Número do contrato (xCont)
```


#### orderNumber?

```ts
Purchase order number (xPed) Número do pedido de compra (xPed)
```


#### purchaseNote?

```ts
Purchase note (xNEmp) Nota de empenho (xNEmp)
```


***

### purposeCode?

```ts
finNFe: 1=normal, 2=complementary, 3=adjustment, 4=return. Default: 1 / finNFe: 1=normal, 2=complementar, 3=ajuste, 4=devolução. Padrão: 1
```

Defined in: [types.ts:269](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L269)


***

### recipient?

```ts
optional recipient: {
  cityCode?: string;
  cityName?: string;
  complement?: string;
  district?: string;
  name: string;
  stateCode?: string;
  stateTaxId?: string;
  street?: string;
  streetNumber?: string;
  taxId: string;
  zipCode?: string;
Recipient data (optional for NFC-e under R$200) Dados do destinatário (opcional para NFC-e abaixo de R$200)
```

Defined in: [types.ts:215](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L215)


#### cityCode?

```ts
City IBGE code Código IBGE do município
```


#### cityName?

```ts
City name Nome do município
```


#### complement?

```ts
Address complement Complemento do endereço
```


#### district?

```ts
District/neighborhood Bairro
```


#### name

```ts
Recipient name Nome do destinatário
```


#### stateCode?

```ts
State code (UF) Código da UF
```


#### stateTaxId?

```ts
State tax registration (IE) Inscrição Estadual (IE)
```


#### street?

```ts
Street address (required for NF-e model 55) Logradouro (obrigatório para NF-e modelo 55)
```


#### streetNumber?

```ts
Street number Número do endereço
```


#### taxId

```ts
CPF or CNPJ CPF ou CNPJ
```


#### zipCode?

```ts
ZIP code (CEP) CEP
```


***

### references?

```ts
optional references: (
  | {
  accessKey: string;
  type: "nfe";
}
  | {
  model: string;
  number: string;
  series: string;
  stateCode: string;
  taxId: string;
  type: "nf";
  yearMonth: string;
}
  | {
  model: string;
  number: string;
  series: string;
  stateCode: string;
  taxId: string;
  type: "nfp";
  yearMonth: string;
}
  | {
  accessKey: string;
  type: "cte";
}
  | {
  cooNumber: string;
  ecfNumber: string;
  model: string;
  type: "ecf";
Referenced documents (NFref inside ide) Documentos referenciados (NFref dentro de ide)
```

Defined in: [types.ts:281](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L281)


***

### retTrib?

```ts
Retained taxes (retTrib inside total) Tributos retidos (retTrib dentro de total)
```

Defined in: [types.ts:432](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L432)


***

### series

```ts
Invoice series number Número de série da nota
```

Defined in: [types.ts:174](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L174)


***

### techResponsible?

```ts
optional techResponsible: {
  contact: string;
  email: string;
  phone?: string;
  taxId: string;
Tech responsible (infRespTec) Responsável técnico (infRespTec)
```

Defined in: [types.ts:434](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L434)


#### contact

```ts
Contact name (xContato) Nome do contato (xContato)
```


#### email

```ts
Email address Endereço de email
```


#### phone?

```ts
Phone number (fone) Número de telefone (fone)
```


#### taxId

```ts
CNPJ CNPJ
```


***

### transport?

```ts
optional transport: {
  carrier?: {
     address?: string;
     name?: string;
     stateCode?: string;
     stateTaxId?: string;
     taxId?: string;
  };
  freightMode: string;
  retainedIcms?: {
     cfop: string;
     cityCode: string;
     pICMSRet: number;
     vBCRet: number;
     vICMSRet: number;
  };
  trailers?: {
     plate: string;
     rntc?: string;
     stateCode: string;
  }[];
  vehicle?: {
     plate: string;
     rntc?: string;
     stateCode: string;
  };
  volumes?: {
     brand?: string;
     grossWeight?: number;
     netWeight?: number;
     number?: string;
     quantity?: number;
     seals?: string[];
     species?: string;
  }[];
Transport data (transp) Dados de transporte (transp)
```

Defined in: [types.ts:289](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L289)


#### carrier?

```ts
optional carrier: {
  address?: string;
  name?: string;
  stateCode?: string;
  stateTaxId?: string;
  taxId?: string;
Carrier data Dados da transportadora
```


##### carrier.address?

```ts
Full address Endereço completo
```


##### carrier.name?

```ts
Carrier name Nome da transportadora
```


##### carrier.stateCode?

```ts
State code (UF) Código da UF
```


##### carrier.stateTaxId?

```ts
State tax registration (IE) Inscrição Estadual (IE)
```


##### carrier.taxId?

```ts
CNPJ or CPF CNPJ ou CPF
```


#### freightMode

```ts
Freight mode (modFrete: 0-9) Modalidade de frete (modFrete: 0-9)
```


#### retainedIcms?

```ts
optional retainedIcms: {
  cfop: string;
  cityCode: string;
  pICMSRet: number;
  vBCRet: number;
  vICMSRet: number;
ICMS retained in transport (ICMSRet) ICMS retido no transporte (ICMSRet)
```


##### retainedIcms.cfop

```ts
CFOP code Código CFOP
```


##### retainedIcms.cityCode

```ts
City IBGE code Código IBGE do município
```


##### retainedIcms.pICMSRet

```ts
ICMS retained rate Alíquota do ICMS retido
```


##### retainedIcms.vBCRet

```ts
ICMS retained tax base Base de cálculo do ICMS retido
```


##### retainedIcms.vICMSRet

```ts
ICMS retained amount Valor do ICMS retido
```


#### trailers?

```ts
optional trailers: {
  plate: string;
  rntc?: string;
  stateCode: string;
Trailer vehicles Reboques
```


#### vehicle?

```ts
optional vehicle: {
  plate: string;
  rntc?: string;
  stateCode: string;
Vehicle data Dados do veículo
```


##### vehicle.plate

```ts
plate: string;
```

##### vehicle.rntc?

```ts
optional rntc: string;
```

##### vehicle.stateCode

```ts
stateCode: string;
```

#### volumes?

```ts
optional volumes: {
  brand?: string;
  grossWeight?: number;
  netWeight?: number;
  number?: string;
  quantity?: number;
  seals?: string[];
  species?: string;
Transport volumes Volumes de transporte
```


***

### withdrawal?

```ts
optional withdrawal: {
  cityCode: string;
  cityName: string;
  complement?: string;
  district: string;
  name?: string;
  number: string;
  stateCode: string;
  street: string;
  taxId: string;
  zipCode?: string;
Withdrawal/pickup location (retirada) Local de retirada (retirada)
```

Defined in: [types.ts:364](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L364)


#### cityCode

```ts
City IBGE code Código IBGE do município
```


#### cityName

```ts
City name Nome do município
```


#### complement?

```ts
Address complement Complemento do endereço
```


#### district

```ts
District/neighborhood Bairro
```


#### name?

```ts
Name Nome
```


#### number

```ts
Street number Número do endereço
```


#### stateCode

```ts
State code (UF) Código da UF
```


#### street

```ts
Street address Logradouro
```


#### taxId

```ts
CNPJ or CPF CNPJ ou CPF
```


#### zipCode?

```ts
ZIP code (CEP) CEP
```

