---
layout: docs
title: "buildInfoPagtoIntegralXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildInfoPagtoIntegralXml



```ts
function buildInfoPagtoIntegralXml(options): string;
```

Defined in: [sefaz-request-builders.ts:1267](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-request-builders.ts#L1267)

Constroi o XML do evento Informacao de Pagamento Integral (tpEvento 112110).


## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `accessKey`: `string`; `appVersion?`: `string`; `environment`: `1` \| `2`; `eventDateTime`: `string`; `isCpf?`: `boolean`; `lotId?`: `string`; `model`: `55` \| `65`; `orgCode`: `string` \| `number`; `sequenceNumber?`: `number`; `taxId`: `string`; \} |
| `options.accessKey` | `string` |
| `options.appVersion?` | `string` |
| `options.environment` | `1` \| `2` |
| `options.eventDateTime` | `string` |
| `options.isCpf?` | `boolean` |
| `options.lotId?` | `string` |
| `options.model` | `55` \| `65` |
| `options.orgCode` | `string` \| `number` |
| `options.sequenceNumber?` | `number` |
| `options.taxId` | `string` |

## Returns

`string`
