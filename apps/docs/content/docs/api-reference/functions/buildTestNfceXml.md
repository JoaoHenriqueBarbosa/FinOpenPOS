---
layout: docs
title: "buildTestNfceXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildTestNfceXml



```ts
function buildTestNfceXml(
   uf?, 
   cUF?, 
   tpEmis?, 
   destType?): string;
```

Defined in: [epec-nfce.ts:218](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/epec-nfce.ts#L218)

Build a minimal NFC-e XML for testing EPEC.


Mirrors the PHP buildEpecNfceXml() test helper method.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `uf` | `string` | `"SP"` |
| `cUF` | `string` | `"35"` |
| `tpEmis` | `string` | `"4"` |
| `destType` | `"CNPJ"` \| `"CPF"` \| `"idEstrangeiro"` \| `"none"` | `"CNPJ"` |

## Returns

`string`
