---
layout: docs
title: "buildDeliveryProofXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildDeliveryProofXml



```ts
function buildDeliveryProofXml(options): string;
```

Defined in: [sefaz-request-builders.ts:749](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-request-builders.ts#L749)

Build delivery proof event XML (Comprovante de Entrega da NF-e).


## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `accessKey`: `string`; `appVersion`: `string`; `environment`: `1` \| `2`; `eventDateTime`: `string`; `image`: `string`; `isCpf?`: `boolean`; `latitude?`: `string`; `longitude?`: `string`; `lotId?`: `string`; `orgCode`: `string` \| `number`; `receiptDate`: `string`; `receiverDocument`: `string`; `receiverName`: `string`; `sequenceNumber?`: `number`; `taxId`: `string`; \} |
| `options.accessKey` | `string` |
| `options.appVersion` | `string` |
| `options.environment` | `1` \| `2` |
| `options.eventDateTime` | `string` |
| `options.image` | `string` |
| `options.isCpf?` | `boolean` |
| `options.latitude?` | `string` |
| `options.longitude?` | `string` |
| `options.lotId?` | `string` |
| `options.orgCode` | `string` \| `number` |
| `options.receiptDate` | `string` |
| `options.receiverDocument` | `string` |
| `options.receiverName` | `string` |
| `options.sequenceNumber?` | `number` |
| `options.taxId` | `string` |

## Returns

`string`
