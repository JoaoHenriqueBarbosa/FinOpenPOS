---
layout: docs
title: "NfceQrCodeParams"
---

[@finopenpos/fiscal](/docs/api-reference/index) / NfceQrCodeParams



Defined in: [qrcode.ts:26](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L26)

Parametros para construcao da URL do QR Code NFC-e.


## Properties

### accessKey

```ts
44-digit access key / Chave de acesso de 44 digitos
```

Defined in: [qrcode.ts:28](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L28)


***

### cscId?

```ts
CSC numeric ID (required for v200) / ID numerico do CSC (obrigatorio para v200)
```

Defined in: [qrcode.ts:40](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L40)


***

### cscToken?

```ts
CSC token (required for v200) / Token CSC (obrigatorio para v200)
```

Defined in: [qrcode.ts:38](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L38)


***

### destDocument?

```ts
Destination document (CPF/CNPJ/idEstrangeiro) / Documento do destinatario
```

Defined in: [qrcode.ts:50](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L50)


***

### destIdType?

```ts
Destination ID type (required for v300 offline) / Tipo de ID do destinatario
```

Defined in: [qrcode.ts:52](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L52)


***

### digestValue?

```ts
DigestValue from XML signature Base64 (required for v200 offline) / DigestValue da assinatura XML
```

Defined in: [qrcode.ts:48](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L48)


***

### emissionType

```ts
Emission type (1=normal, 9=offline contingency, etc.) / Tipo de emissao
```

Defined in: [qrcode.ts:34](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L34)


***

### environment

```ts
Environment: 1=production, 2=homologation / Ambiente: 1=producao, 2=homologacao
```

Defined in: [qrcode.ts:32](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L32)


***

### issuedAt?

```ts
Emission date/time ISO string (required for offline) / Data/hora de emissao ISO (obrigatorio para offline)
```

Defined in: [qrcode.ts:42](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L42)


***

### qrCodeBaseUrl

```ts
QR Code base URL (state-specific) / URL base do QR Code (por estado)
```

Defined in: [qrcode.ts:36](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L36)


***

### signFn()?

```ts
Sign function for v300 offline -- receives payload, returns base64 signature / Funcao de assinatura para v300 offline
```

Defined in: [qrcode.ts:54](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L54)


#### Parameters

| Parameter | Type |
| ------ | ------ |
| `payload` | `string` |

#### Returns

`string` \| `Promise`\<`string`\>

***

### totalIcms?

```ts
Total ICMS value as string e.g. "0.00" (required for v200 offline) / Valor total ICMS
```

Defined in: [qrcode.ts:46](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L46)


***

### totalValue?

```ts
Total invoice value as string e.g. "150.00" (required for offline) / Valor total da nota, ex. "150.00"
```

Defined in: [qrcode.ts:44](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L44)


***

### version

```ts
QR Code version (200 or 300) / Versao do QR Code (200 ou 300)
```

Defined in: [qrcode.ts:30](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L30)

