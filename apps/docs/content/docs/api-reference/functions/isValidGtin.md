---
layout: docs
title: "isValidGtin()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / isValidGtin



```ts
function isValidGtin(gtin): boolean;
```

Defined in: [gtin.ts:39](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/gtin.ts#L39)

Validate a GTIN-8/12/13/14 barcode number.


- Empty string and 'SEM GTIN' are considered valid (exempt).
- Valid GTIN-8/12/13/14 with correct check digit returns true.
- Non-numeric input or invalid check digit throws an error.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `gtin` | `string` |

## Returns

`boolean`
