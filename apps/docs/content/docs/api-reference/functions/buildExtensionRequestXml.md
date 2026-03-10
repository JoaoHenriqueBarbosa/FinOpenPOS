---
layout: docs
title: "buildExtensionRequestXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildExtensionRequestXml



```ts
function buildExtensionRequestXml(options): string;
```

Defined in: [sefaz-request-builders.ts:473](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-request-builders.ts#L473)

Build EPP (extension request) event XML.


## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `accessKey`: `string`; `environment`: `1` \| `2`; `eventDateTime`: `string`; `extensionType?`: `1` \| `2`; `isCpf?`: `boolean`; `items`: \[`number`, `number`\][]; `lotId?`: `string`; `orgCode`: `string` \| `number`; `protocolNumber`: `string`; `sequenceNumber?`: `number`; `taxId`: `string`; \} |
| `options.accessKey` | `string` |
| `options.environment` | `1` \| `2` |
| `options.eventDateTime` | `string` |
| `options.extensionType?` | `1` \| `2` |
| `options.isCpf?` | `boolean` |
| `options.items` | \[`number`, `number`\][] |
| `options.lotId?` | `string` |
| `options.orgCode` | `string` \| `number` |
| `options.protocolNumber` | `string` |
| `options.sequenceNumber?` | `number` |
| `options.taxId` | `string` |

## Returns

`string`
