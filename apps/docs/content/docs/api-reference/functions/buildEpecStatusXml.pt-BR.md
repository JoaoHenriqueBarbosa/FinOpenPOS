---
layout: docs
title: "buildEpecStatusXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildEpecStatusXml



```ts
function buildEpecStatusXml(options): string;
```

Defined in: [sefaz-request-builders.ts:1325](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-request-builders.ts#L1325)

Constroi o XML de consulta de status EPEC NFC-e (apenas SP, modelo 65).


## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | \{ `environment`: `1` \| `2`; `model`: `55` \| `65`; `stateCode`: `string`; \} |
| `options.environment` | `1` \| `2` |
| `options.model` | `55` \| `65` |
| `options.stateCode` | `string` |

## Returns

`string`
