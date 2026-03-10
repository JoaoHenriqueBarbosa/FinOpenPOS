---
layout: docs
title: "attachProtocol()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / attachProtocol



```ts
function attachProtocol(requestXml, responseXml): string;
```

Defined in: [complement.ts:43](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/complement.ts#L43)

Attach the SEFAZ authorization protocol to a signed NFe XML,
producing the `nfeProc` wrapper required for storage and DANFE.

produzindo o wrapper `nfeProc` necessário para armazenamento e DANFE.

Output format:
```xml
<nfeProc xmlns="..." versao="4.00">
  <NFe>...</NFe>
  <protNFe>...</protNFe>
</nfeProc>
```

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |

## Returns

`string`

The `nfeProc` XML string
