---
layout: docs
title: "buildCscXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildCscXml



```ts
function buildCscXml(options): string;
```

Defined in: [sefaz-request-builders.ts:1148](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-request-builders.ts#L1148)

Build CSC admin request XML (admCscNFCe).


## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `cscId?`: `string`; `cscToken?`: `string`; `environment`: `1` \| `2`; `indOp`: `number`; `model`: `55` \| `65`; `stateCode`: `string`; `taxId`: `string`; \} |
| `options.cscId?` | `string` |
| `options.cscToken?` | `string` |
| `options.environment` | `1` \| `2` |
| `options.indOp` | `number` |
| `options.model` | `55` \| `65` |
| `options.stateCode` | `string` |
| `options.taxId` | `string` |

## Returns

`string`
