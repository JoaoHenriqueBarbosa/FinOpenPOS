---
layout: docs
title: "formatCentsOrZero()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / formatCentsOrZero



```ts
function formatCentsOrZero(cents, decimalPlaces?): string;
```

Defined in: [format-utils.ts:94](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/format-utils.ts#L94)

Formata centavos para string decimal, usando "0.00" como padrão para null/undefined


## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `cents` | `number` \| `undefined` | `undefined` |  |
| `decimalPlaces` | `number` | `2` |  |

## Returns

`string`
