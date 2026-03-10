---
layout: docs
title: "FiscalConfig"
---

[@finopenpos/fiscal](/docs/api-reference/index) / FiscalConfig



Defined in: [config-validate.ts:14](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/config-validate.ts#L14)

Estrutura do objeto de configuracao fiscal.


## Properties

### aProxyConf?

```ts
optional aProxyConf: 
  | {
  proxyIp?: string | null;
  proxyPass?: string | null;
  proxyPort?: string | null;
  proxyUser?: string | null;
Proxy configuration / Configuracao de proxy
  | null;
```

Defined in: [config-validate.ts:38](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/config-validate.ts#L38)


***

### atualizacao?

```ts
Last update timestamp / Timestamp da ultima atualizacao
```

Defined in: [config-validate.ts:16](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/config-validate.ts#L16)


***

### cnpj

```ts
CNPJ or CPF / CNPJ ou CPF
```

Defined in: [config-validate.ts:26](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/config-validate.ts#L26)


***

### CSC?

```ts
CSC token for NFC-e QR Code / Token CSC para QR Code NFC-e
```

Defined in: [config-validate.ts:34](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/config-validate.ts#L34)


***

### CSCid?

```ts
CSC ID / ID do CSC
```

Defined in: [config-validate.ts:36](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/config-validate.ts#L36)


***

### razaosocial?

```ts
Company legal name (lowercase key) / Razao social (chave minuscula)
```

Defined in: [config-validate.ts:20](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/config-validate.ts#L20)


***

### razaoSocial?

```ts
Company legal name (camelCase key) / Razao social (chave camelCase)
```

Defined in: [config-validate.ts:22](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/config-validate.ts#L22)


***

### schemes

```ts
XSD schema path / Caminho dos schemas XSD
```

Defined in: [config-validate.ts:28](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/config-validate.ts#L28)


***

### siglaUF

```ts
State abbreviation / Sigla do estado
```

Defined in: [config-validate.ts:24](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/config-validate.ts#L24)


***

### tokenIBPT?

```ts
IBPT transparency token / Token de transparencia IBPT
```

Defined in: [config-validate.ts:32](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/config-validate.ts#L32)


***

### tpAmb

```ts
Tax environment: 1=production, 2=homologation / Ambiente fiscal: 1=producao, 2=homologacao
```

Defined in: [config-validate.ts:18](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/config-validate.ts#L18)


***

### versao

```ts
NFe version / Versao da NFe
```

Defined in: [config-validate.ts:30](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/config-validate.ts#L30)

