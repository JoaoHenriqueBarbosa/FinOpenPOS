---
layout: docs
title: "buildInterestedActorXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildInterestedActorXml



```ts
function buildInterestedActorXml(options): string;
```

Defined in: [sefaz-request-builders.ts:401](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-request-builders.ts#L401)

Build Ator Interessado event XML.


## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `accessKey`: `string`; `actorIsCpf?`: `boolean`; `actorTaxId`: `string`; `appVersion`: `string`; `authorizationType`: `number`; `authorType`: `number`; `environment`: `1` \| `2`; `eventDateTime`: `string`; `isCpf?`: `boolean`; `lotId?`: `string`; `sequenceNumber?`: `number`; `stateCode`: `string`; `taxId`: `string`; \} |
| `options.accessKey` | `string` |
| `options.actorIsCpf?` | `boolean` |
| `options.actorTaxId` | `string` |
| `options.appVersion` | `string` |
| `options.authorizationType` | `number` |
| `options.authorType` | `number` |
| `options.environment` | `1` \| `2` |
| `options.eventDateTime` | `string` |
| `options.isCpf?` | `boolean` |
| `options.lotId?` | `string` |
| `options.sequenceNumber?` | `number` |
| `options.stateCode` | `string` |
| `options.taxId` | `string` |

## Returns

`string`
