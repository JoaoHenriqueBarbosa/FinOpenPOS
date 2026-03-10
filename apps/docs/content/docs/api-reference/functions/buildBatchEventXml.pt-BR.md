---
layout: docs
title: "buildBatchEventXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildBatchEventXml



```ts
function buildBatchEventXml(options): string;
```

Defined in: [sefaz-request-builders.ts:1077](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-request-builders.ts#L1077)

Constroi o XML generico de eventos em lote (multiplos eventos em um envelope).


## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `environment`: `1` \| `2`; `eventDateTime`: `string`; `events`: \{ `accessKey`: `string`; `additionalTags?`: `string`; `eventType`: `number`; `sequenceNumber?`: `number`; \}[]; `isCpf?`: `boolean`; `lotId?`: `string`; `stateCode`: `string`; `taxId`: `string`; \} |
| `options.environment` | `1` \| `2` |
| `options.eventDateTime` | `string` |
| `options.events` | \{ `accessKey`: `string`; `additionalTags?`: `string`; `eventType`: `number`; `sequenceNumber?`: `number`; \}[] |
| `options.isCpf?` | `boolean` |
| `options.lotId?` | `string` |
| `options.stateCode` | `string` |
| `options.taxId` | `string` |

## Returns

`string`
