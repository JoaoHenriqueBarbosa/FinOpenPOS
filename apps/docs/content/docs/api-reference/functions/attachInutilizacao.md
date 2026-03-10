---
layout: docs
title: "attachInutilizacao()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / attachInutilizacao



```ts
function attachInutilizacao(requestXml, responseXml): string;
```

Defined in: [complement.ts:219](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/complement.ts#L219)

Attach the SEFAZ inutilizacao response to the request,
producing the `ProcInutNFe` wrapper.

produzindo o wrapper `ProcInutNFe`.

Output format:
```xml
<ProcInutNFe xmlns="..." versao="4.00">
  <inutNFe>...</inutNFe>
  <retInutNFe>...</retInutNFe>
</ProcInutNFe>
```

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |

## Returns

`string`

The `ProcInutNFe` XML string
