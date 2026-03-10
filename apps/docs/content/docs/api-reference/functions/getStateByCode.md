---
layout: docs
title: "getStateByCode()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / getStateByCode



```ts
function getStateByCode(code): string;
```

Defined in: [state-codes.ts:55](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/state-codes.ts#L55)

Get the UF abbreviation for an IBGE numeric code.


## Parameters

| Parameter | Type |
| ------ | ------ |
| `code` | `string` |

## Returns

`string`

## Throws

if the code is unknown
