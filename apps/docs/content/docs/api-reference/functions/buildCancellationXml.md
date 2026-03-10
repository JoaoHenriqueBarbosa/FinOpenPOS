---
layout: docs
title: "buildCancellationXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildCancellationXml



```ts
function buildCancellationXml(
   accessKey, 
   protocolNumber, 
   reason, 
   taxId, 
   environment): string;
```

Defined in: [sefaz-request-builders.ts:55](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-request-builders.ts#L55)

Build cancellation event XML.


## Parameters

| Parameter | Type |
| ------ | ------ |
| `accessKey` | `string` |
| `protocolNumber` | `string` |
| `reason` | `string` |
| `taxId` | `string` |
| `environment` | `1` \| `2` |

## Returns

`string`
