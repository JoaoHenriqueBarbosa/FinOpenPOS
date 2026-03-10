---
layout: docs
title: "formatCentsOrNull()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / formatCentsOrNull



```ts
function formatCentsOrNull(cents, decimalPlaces?): string | null;
```

Defined in: [format-utils.ts:79](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/format-utils.ts#L79)

Formata centavos para string decimal, retornando null se a entrada for null/undefined


## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `cents` | `number` \| `null` \| `undefined` | `undefined` |  |
| `decimalPlaces` | `number` | `2` |  |

## Returns

`string` \| `null`
