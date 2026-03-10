---
layout: docs
title: "formatRate4OrZero()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / formatRate4OrZero



```ts
function formatRate4OrZero(value): string;
```

Defined in: [format-utils.ts:107](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/format-utils.ts#L107)

Formata rate4 (valor * 10000) para string com 4 decimais, usando "0.0000" como padrão para null/undefined


## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `value` | `number` \| `undefined` |  |

## Returns

`string`
