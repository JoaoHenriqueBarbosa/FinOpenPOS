---
layout: docs
title: "buildManifestationXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildManifestationXml



```ts
function buildManifestationXml(options): string;
```

Defined in: [sefaz-request-builders.ts:702](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-request-builders.ts#L702)

Build recipient manifestation event XML.


## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `accessKey`: `string`; `environment`: `1` \| `2`; `eventDateTime`: `string`; `eventType`: `number`; `isCpf?`: `boolean`; `lotId?`: `string`; `reason?`: `string`; `sequenceNumber?`: `number`; `taxId`: `string`; \} |
| `options.accessKey` | `string` |
| `options.environment` | `1` \| `2` |
| `options.eventDateTime` | `string` |
| `options.eventType` | `number` |
| `options.isCpf?` | `boolean` |
| `options.lotId?` | `string` |
| `options.reason?` | `string` |
| `options.sequenceNumber?` | `number` |
| `options.taxId` | `string` |

## Returns

`string`
