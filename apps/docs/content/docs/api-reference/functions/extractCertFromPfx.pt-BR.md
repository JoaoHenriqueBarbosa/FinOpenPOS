---
layout: docs
title: "extractCertFromPfx()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / extractCertFromPfx



```ts
function extractCertFromPfx(pfxBuffer, passphrase): string;
```

Defined in: [certificate.ts:171](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/certificate.ts#L171)

Extrai o certificado PEM do PFX usando openssl CLI (com flag -legacy).


## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `pfxBuffer` | `Buffer` |  |
| `passphrase` | `string` |  |

## Returns

`string`
