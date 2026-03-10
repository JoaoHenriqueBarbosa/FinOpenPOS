---
layout: docs
title: "buildCancellationEventXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildCancellationEventXml



```ts
function buildCancellationEventXml(options): string;
```

Defined in: [sefaz-request-builders.ts:588](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-request-builders.ts#L588)

Build cancellation event XML (using the generic event builder).


## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `accessKey`: `string`; `environment`: `1` \| `2`; `eventDateTime`: `string`; `isCpf?`: `boolean`; `lotId?`: `string`; `orgCode`: `string` \| `number`; `protocolNumber`: `string`; `reason`: `string`; `taxId`: `string`; \} |
| `options.accessKey` | `string` |
| `options.environment` | `1` \| `2` |
| `options.eventDateTime` | `string` |
| `options.isCpf?` | `boolean` |
| `options.lotId?` | `string` |
| `options.orgCode` | `string` \| `number` |
| `options.protocolNumber` | `string` |
| `options.reason` | `string` |
| `options.taxId` | `string` |

## Returns

`string`
