---
layout: docs
title: "buildDeliveryFailureXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildDeliveryFailureXml



```ts
function buildDeliveryFailureXml(options): string;
```

Defined in: [sefaz-request-builders.ts:872](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-request-builders.ts#L872)

Constroi o XML do evento de Insucesso na Entrega da NF-e.


## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `accessKey`: `string`; `appVersion`: `string`; `attemptDate`: `string`; `attempts`: `number`; `environment`: `1` \| `2`; `eventDateTime`: `string`; `failureReason`: `number`; `image`: `string`; `isCpf?`: `boolean`; `justification?`: `string`; `latitude?`: `string`; `longitude?`: `string`; `lotId?`: `string`; `orgCode`: `string` \| `number`; `sequenceNumber?`: `number`; `taxId`: `string`; \} |
| `options.accessKey` | `string` |
| `options.appVersion` | `string` |
| `options.attemptDate` | `string` |
| `options.attempts` | `number` |
| `options.environment` | `1` \| `2` |
| `options.eventDateTime` | `string` |
| `options.failureReason` | `number` |
| `options.image` | `string` |
| `options.isCpf?` | `boolean` |
| `options.justification?` | `string` |
| `options.latitude?` | `string` |
| `options.longitude?` | `string` |
| `options.lotId?` | `string` |
| `options.orgCode` | `string` \| `number` |
| `options.sequenceNumber?` | `number` |
| `options.taxId` | `string` |

## Returns

`string`
