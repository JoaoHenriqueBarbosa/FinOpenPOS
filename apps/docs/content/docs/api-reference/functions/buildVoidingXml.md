---
layout: docs
title: "buildVoidingXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildVoidingXml



```ts
function buildVoidingXml(
   stateCode, 
   environment, 
   taxId, 
   model, 
   series, 
   startNumber, 
   endNumber, 
   reason, 
   year): string;
```

Defined in: [sefaz-request-builders.ts:82](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-request-builders.ts#L82)

Build number voiding (inutilizacao) request XML.


## Parameters

| Parameter | Type |
| ------ | ------ |
| `stateCode` | `string` |
| `environment` | `1` \| `2` |
| `taxId` | `string` |
| `model` | `55` \| `65` |
| `series` | `number` |
| `startNumber` | `number` |
| `endNumber` | `number` |
| `reason` | `string` |
| `year` | `number` |

## Returns

`string`
