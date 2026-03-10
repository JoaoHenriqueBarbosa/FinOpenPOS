---
layout: docs
title: "buildSubstitutionCancellationXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildSubstitutionCancellationXml



```ts
function buildSubstitutionCancellationXml(options): string;
```

Defined in: [sefaz-request-builders.ts:634](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-request-builders.ts#L634)

Build substitution cancellation event XML (for NFC-e model 65 only).


## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `accessKey`: `string`; `appVersion`: `string`; `environment`: `1` \| `2`; `eventDateTime`: `string`; `isCpf?`: `boolean`; `lotId?`: `string`; `model`: `55` \| `65`; `orgCode`: `string` \| `number`; `protocolNumber`: `string`; `reason`: `string`; `referenceAccessKey`: `string`; `taxId`: `string`; \} |
| `options.accessKey` | `string` |
| `options.appVersion` | `string` |
| `options.environment` | `1` \| `2` |
| `options.eventDateTime` | `string` |
| `options.isCpf?` | `boolean` |
| `options.lotId?` | `string` |
| `options.model` | `55` \| `65` |
| `options.orgCode` | `string` \| `number` |
| `options.protocolNumber` | `string` |
| `options.reason` | `string` |
| `options.referenceAccessKey` | `string` |
| `options.taxId` | `string` |

## Returns

`string`
