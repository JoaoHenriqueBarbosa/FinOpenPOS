---
layout: docs
title: "buildEventXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildEventXml



```ts
function buildEventXml(options): string;
```

Defined in: [sefaz-request-builders.ts:283](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-request-builders.ts#L283)

Build a generic SEFAZ event XML (evento inside envEvento).
This produces the unsigned inner evento XML. Signing is done separately.

Produz o XML interno sem assinatura. A assinatura e feita separadamente.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `accessKey`: `string`; `additionalTags?`: `string`; `environment`: `1` \| `2`; `eventDateTime`: `string`; `eventType`: `number`; `isCpf?`: `boolean`; `lotId?`: `string`; `orgCode`: `string` \| `number`; `sequenceNumber`: `number`; `taxId`: `string`; \} |
| `options.accessKey` | `string` |
| `options.additionalTags?` | `string` |
| `options.environment` | `1` \| `2` |
| `options.eventDateTime` | `string` |
| `options.eventType` | `number` |
| `options.isCpf?` | `boolean` |
| `options.lotId?` | `string` |
| `options.orgCode` | `string` \| `number` |
| `options.sequenceNumber` | `number` |
| `options.taxId` | `string` |

## Returns

`string`
