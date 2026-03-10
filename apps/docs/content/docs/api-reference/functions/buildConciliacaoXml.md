---
layout: docs
title: "buildConciliacaoXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildConciliacaoXml



```ts
function buildConciliacaoXml(options): string;
```

Defined in: [sefaz-request-builders.ts:1186](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-request-builders.ts#L1186)

Build conciliation event XML.


## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `accessKey`: `string`; `appVersion`: `string`; `cancel?`: `boolean`; `detPag?`: \{ `dPag`: `string`; `tPag`: `string`; `vPag`: `string`; \}[]; `environment`: `1` \| `2`; `eventDateTime`: `string`; `isCpf?`: `boolean`; `lotId?`: `string`; `orgCode`: `string` \| `number`; `protocolNumber?`: `string`; `sequenceNumber?`: `number`; `taxId`: `string`; \} |
| `options.accessKey` | `string` |
| `options.appVersion` | `string` |
| `options.cancel?` | `boolean` |
| `options.detPag?` | \{ `dPag`: `string`; `tPag`: `string`; `vPag`: `string`; \}[] |
| `options.environment` | `1` \| `2` |
| `options.eventDateTime` | `string` |
| `options.isCpf?` | `boolean` |
| `options.lotId?` | `string` |
| `options.orgCode` | `string` \| `number` |
| `options.protocolNumber?` | `string` |
| `options.sequenceNumber?` | `number` |
| `options.taxId` | `string` |

## Returns

`string`
