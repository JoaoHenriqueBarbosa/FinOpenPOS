---
layout: docs
title: "buildCCeXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildCCeXml



```ts
function buildCCeXml(options): string;
```

Defined in: [sefaz-request-builders.ts:341](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-request-builders.ts#L341)

Build Carta de Correcao (CCe) event XML.


## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `accessKey`: `string`; `correction`: `string`; `environment`: `1` \| `2`; `eventDateTime`: `string`; `isCpf?`: `boolean`; `lotId?`: `string`; `orgCode`: `string` \| `number`; `sequenceNumber?`: `number`; `taxId`: `string`; \} |
| `options.accessKey` | `string` |
| `options.correction` | `string` |
| `options.environment` | `1` \| `2` |
| `options.eventDateTime` | `string` |
| `options.isCpf?` | `boolean` |
| `options.lotId?` | `string` |
| `options.orgCode` | `string` \| `number` |
| `options.sequenceNumber?` | `number` |
| `options.taxId` | `string` |

## Returns

`string`
