---
layout: docs
title: "formatRate()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / formatRate



```ts
function formatRate(hundredths, decimalPlaces?): string;
```

Defined in: [format-utils.ts:53](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/format-utils.ts#L53)

Formata taxa armazenada em centésimos para string decimal. Ex: 1800 -\> "18.0000"


## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |
| `hundredths` | `number` | `undefined` |  |
| `decimalPlaces` | `number` | `4` |  |

## Returns

`string`
