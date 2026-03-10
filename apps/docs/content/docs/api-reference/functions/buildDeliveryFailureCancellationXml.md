---
layout: docs
title: "buildDeliveryFailureCancellationXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildDeliveryFailureCancellationXml



```ts
function buildDeliveryFailureCancellationXml(options): string;
```

Defined in: [sefaz-request-builders.ts:953](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-request-builders.ts#L953)

Build delivery failure cancellation event XML.


## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `accessKey`: `string`; `appVersion`: `string`; `environment`: `1` \| `2`; `eventDateTime`: `string`; `isCpf?`: `boolean`; `lotId?`: `string`; `orgCode`: `string` \| `number`; `protocolNumber`: `string`; `sequenceNumber?`: `number`; `taxId`: `string`; \} |
| `options.accessKey` | `string` |
| `options.appVersion` | `string` |
| `options.environment` | `1` \| `2` |
| `options.eventDateTime` | `string` |
| `options.isCpf?` | `boolean` |
| `options.lotId?` | `string` |
| `options.orgCode` | `string` \| `number` |
| `options.protocolNumber` | `string` |
| `options.sequenceNumber?` | `number` |
| `options.taxId` | `string` |

## Returns

`string`
