---
layout: docs
title: "getStateCode()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / getStateCode



```ts
function getStateCode(uf): string;
```

Defined in: [state-codes.ts:40](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/state-codes.ts#L40)

Obtem o codigo numerico IBGE para uma sigla de estado.


## Parameters

| Parameter | Type |
| ------ | ------ |
| `uf` | `string` |

## Returns

`string`

## Throws

if the UF is unknown
