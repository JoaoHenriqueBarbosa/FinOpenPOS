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

Constroi XML minimo de NFC-e para testes de EPEC.


Espelha o metodo auxiliar de teste buildEpecNfceXml() do PHP.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `uf` | `string` | `"SP"` |
| `cUF` | `string` | `"35"` |
| `tpEmis` | `string` | `"4"` |
| `destType` | `"CNPJ"` \| `"CPF"` \| `"idEstrangeiro"` \| `"none"` | `"CNPJ"` |

## Returns

`string`
