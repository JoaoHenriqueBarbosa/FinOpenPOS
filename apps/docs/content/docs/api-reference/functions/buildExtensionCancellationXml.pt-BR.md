---
layout: docs
title: "buildExtensionCancellationXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildExtensionCancellationXml



```ts
function buildExtensionCancellationXml(options): string;
```

Defined in: [sefaz-request-builders.ts:529](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-request-builders.ts#L529)

Constroi o XML do evento de Cancelamento de Pedido de Prorrogacao (ECPP).


## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `accessKey`: `string`; `environment`: `1` \| `2`; `eventDateTime`: `string`; `extensionType`: `1` \| `2`; `isCpf?`: `boolean`; `lotId?`: `string`; `orgCode`: `string` \| `number`; `protocolNumber`: `string`; `sequenceNumber?`: `number`; `taxId`: `string`; \} |
| `options.accessKey` | `string` |
| `options.environment` | `1` \| `2` |
| `options.eventDateTime` | `string` |
| `options.extensionType` | `1` \| `2` |
| `options.isCpf?` | `boolean` |
| `options.lotId?` | `string` |
| `options.orgCode` | `string` \| `number` |
| `options.protocolNumber` | `string` |
| `options.sequenceNumber?` | `number` |
| `options.taxId` | `string` |

## Returns

`string`
