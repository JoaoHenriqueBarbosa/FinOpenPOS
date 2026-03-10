---
layout: docs
title: "buildBatchSubmissionXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildBatchSubmissionXml



```ts
function buildBatchSubmissionXml(
   xmlDocuments, 
   lotId, 
   syncMode?, 
   compress?): string;
```

Defined in: [sefaz-request-builders.ts:169](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-request-builders.ts#L169)

Constroi o XML de envio em lote (enviNFe).


## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `xmlDocuments` | `string`[] | `undefined` |
| `lotId` | `string` | `undefined` |
| `syncMode` | `0` \| `1` | `0` |
| `compress` | `boolean` | `false` |

## Returns

`string`
