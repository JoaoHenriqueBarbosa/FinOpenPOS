---
layout: docs
title: "buildBatchManifestationXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildBatchManifestationXml



```ts
function buildBatchManifestationXml(options): string;
```

Defined in: [sefaz-request-builders.ts:1001](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-request-builders.ts#L1001)

Constroi o XML de manifestacao em lote (multiplos eventos em um envelope).


## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `environment`: `1` \| `2`; `eventDateTime`: `string`; `events`: \{ `accessKey`: `string`; `eventType`: `number`; `reason?`: `string`; `sequenceNumber?`: `number`; \}[]; `isCpf?`: `boolean`; `lotId?`: `string`; `taxId`: `string`; \} |
| `options.environment` | `1` \| `2` |
| `options.eventDateTime` | `string` |
| `options.events` | \{ `accessKey`: `string`; `eventType`: `number`; `reason?`: `string`; `sequenceNumber?`: `number`; \}[] |
| `options.isCpf?` | `boolean` |
| `options.lotId?` | `string` |
| `options.taxId` | `string` |

## Returns

`string`
