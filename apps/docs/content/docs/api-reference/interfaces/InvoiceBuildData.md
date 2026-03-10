---
layout: docs
title: "InvoiceBuildData"
---

[@finopenpos/fiscal](/docs/api-reference/index) / InvoiceBuildData



Defined in: [types.ts:170](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L170)

Data needed to build an invoice XML


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
};
```

Defined in: [types.ts:412](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L412)


#### contributorObs?

```ts
optional contributorObs: {
  field: string;
  text: string;
}[];
```


#### fiscalObs?

```ts
optional fiscalObs: {
  field: string;
  text: string;
}[];
```


#### processRefs?

```ts
optional processRefs: {
  number: string;
  origin: string;
}[];
```


#### taxAuthorityNote?

```ts
optional taxAuthorityNote: string;
```


#### taxpayerNote?

```ts
optional taxpayerNote: string;
```


***

### authorizedXml?

```ts
optional authorizedXml: {
  taxId: string;
}[];
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
};
```

Defined in: [types.ts:341](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L341)


#### installments?

```ts
optional installments: {
  dueDate: string;
  number: string;
  value: number;
}[];
```


#### invoice?

```ts
optional invoice: {
  discountValue?: number;
  netValue: number;
  number: string;
  originalValue: number;
};
```


##### invoice.discountValue?

```ts
optional discountValue: number;
```


##### invoice.netValue

```ts
netValue: number;
```


##### invoice.number

```ts
number: string;
```


##### invoice.originalValue

```ts
originalValue: number;
```


***

### buyerPresence?

```ts
optional buyerPresence: string;
```

Defined in: [types.ts:277](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L277)


***

### changeAmount?

```ts
optional changeAmount: number;
```

Defined in: [types.ts:244](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L244)


***

### consumerType?

```ts
optional consumerType: string;
```

Defined in: [types.ts:275](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L275)


***

### contingency?

```ts
optional contingency: {
  at: Date;
  reason: string;
  type: ContingencyType;
};
```

Defined in: [types.ts:257](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L257)


#### at

```ts
at: Date;
```


#### reason

```ts
reason: string;
```


#### type

```ts
type: ContingencyType;
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
};
```

Defined in: [types.ts:387](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L387)


#### cityCode

```ts
cityCode: string;
```


#### cityName

```ts
cityName: string;
```


#### complement?

```ts
optional complement: string;
```


#### district

```ts
district: string;
```


#### name?

```ts
optional name: string;
```


#### number

```ts
number: string;
```


#### stateCode

```ts
stateCode: string;
```


#### street

```ts
street: string;
```


#### taxId

```ts
taxId: string;
```


#### zipCode?

```ts
optional zipCode: string;
```


***

### emissionProcess?

```ts
optional emissionProcess: string;
```

Defined in: [types.ts:273](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L273)


***

### emissionType

```ts
emissionType: EmissionType;
```

Defined in: [types.ts:178](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L178)


***

### environment

```ts
environment: SefazEnvironment;
```

Defined in: [types.ts:180](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L180)


***

### export?

```ts
optional export: {
  dispatchLocation?: string;
  exitState: string;
  exportLocation: string;
};
```

Defined in: [types.ts:454](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L454)


#### dispatchLocation?

```ts
optional dispatchLocation: string;
```


#### exitState

```ts
exitState: string;
```


#### exportLocation

```ts
exportLocation: string;
```


***

### intermediary?

```ts
optional intermediary: {
  idCadIntTran?: string;
  taxId: string;
};
```

Defined in: [types.ts:425](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L425)


#### idCadIntTran?

```ts
optional idCadIntTran: string;
```


#### taxId

```ts
taxId: string;
```


***

### intermediaryIndicator?

```ts
optional intermediaryIndicator: string;
```

Defined in: [types.ts:271](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L271)


***

### issuedAt

```ts
issuedAt: Date;
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
};
```

Defined in: [types.ts:186](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L186)


#### addressComplement

```ts
addressComplement: string | null;
```


#### cityCode

```ts
cityCode: string;
```


#### cityName

```ts
cityName: string;
```


#### companyName

```ts
companyName: string;
```


#### district

```ts
district: string;
```


#### stateCode

```ts
stateCode: string;
```


#### stateTaxId

```ts
stateTaxId: string;
```


#### street

```ts
street: string;
```


#### streetNumber

```ts
streetNumber: string;
```


#### taxId

```ts
taxId: string;
```


#### taxRegime

```ts
taxRegime: TaxRegime;
```


#### tradeName

```ts
tradeName: string | null;
```


#### zipCode

```ts
zipCode: string;
```


***

### items

```ts
items: InvoiceItemData[];
```

Defined in: [types.ts:240](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L240)


***

### model

```ts
model: InvoiceModel;
```

Defined in: [types.ts:172](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L172)


***

### number

```ts
number: number;
```

Defined in: [types.ts:176](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L176)


***

### operationNature

```ts
operationNature: string;
```

Defined in: [types.ts:184](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L184)


***

### operationType?

```ts
optional operationType: number;
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
}[];
```

Defined in: [types.ts:246](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L246)


#### authCode?

```ts
optional authCode: string;
```


#### cardBrand?

```ts
optional cardBrand: string;
```


#### cardTaxId?

```ts
optional cardTaxId: string;
```


#### integType?

```ts
optional integType: string;
```


***

### payments

```ts
payments: PaymentData[];
```

Defined in: [types.ts:242](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L242)


***

### printFormat?

```ts
optional printFormat: string;
```

Defined in: [types.ts:279](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L279)


***

### purchase?

```ts
optional purchase: {
  contractNumber?: string;
  orderNumber?: string;
  purchaseNote?: string;
};
```

Defined in: [types.ts:445](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L445)


#### contractNumber?

```ts
optional contractNumber: string;
```


#### orderNumber?

```ts
optional orderNumber: string;
```


#### purchaseNote?

```ts
optional purchaseNote: string;
```


***

### purposeCode?

```ts
optional purposeCode: number;
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
};
```

Defined in: [types.ts:215](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L215)


#### cityCode?

```ts
optional cityCode: string;
```


#### cityName?

```ts
optional cityName: string;
```


#### complement?

```ts
optional complement: string;
```


#### district?

```ts
optional district: string;
```


#### name

```ts
name: string;
```


#### stateCode?

```ts
optional stateCode: string;
```


#### stateTaxId?

```ts
optional stateTaxId: string;
```


#### street?

```ts
optional street: string;
```


#### streetNumber?

```ts
optional streetNumber: string;
```


#### taxId

```ts
taxId: string;
```


#### zipCode?

```ts
optional zipCode: string;
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
})[];
```

Defined in: [types.ts:281](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L281)


***

### retTrib?

```ts
optional retTrib: RetTribData;
```

Defined in: [types.ts:432](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L432)


***

### series

```ts
series: number;
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
};
```

Defined in: [types.ts:434](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L434)


#### contact

```ts
contact: string;
```


#### email

```ts
email: string;
```


#### phone?

```ts
optional phone: string;
```


#### taxId

```ts
taxId: string;
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
};
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
};
```


##### carrier.address?

```ts
optional address: string;
```


##### carrier.name?

```ts
optional name: string;
```


##### carrier.stateCode?

```ts
optional stateCode: string;
```


##### carrier.stateTaxId?

```ts
optional stateTaxId: string;
```


##### carrier.taxId?

```ts
optional taxId: string;
```


#### freightMode

```ts
freightMode: string;
```


#### retainedIcms?

```ts
optional retainedIcms: {
  cfop: string;
  cityCode: string;
  pICMSRet: number;
  vBCRet: number;
  vICMSRet: number;
};
```


##### retainedIcms.cfop

```ts
cfop: string;
```


##### retainedIcms.cityCode

```ts
cityCode: string;
```


##### retainedIcms.pICMSRet

```ts
pICMSRet: number;
```


##### retainedIcms.vBCRet

```ts
vBCRet: number;
```


##### retainedIcms.vICMSRet

```ts
vICMSRet: number;
```


#### trailers?

```ts
optional trailers: {
  plate: string;
  rntc?: string;
  stateCode: string;
}[];
```


#### vehicle?

```ts
optional vehicle: {
  plate: string;
  rntc?: string;
  stateCode: string;
};
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
}[];
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
};
```

Defined in: [types.ts:364](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/types.ts#L364)


#### cityCode

```ts
cityCode: string;
```


#### cityName

```ts
cityName: string;
```


#### complement?

```ts
optional complement: string;
```


#### district

```ts
district: string;
```


#### name?

```ts
optional name: string;
```


#### number

```ts
number: string;
```


#### stateCode

```ts
stateCode: string;
```


#### street

```ts
street: string;
```


#### taxId

```ts
taxId: string;
```


#### zipCode?

```ts
optional zipCode: string;
```

