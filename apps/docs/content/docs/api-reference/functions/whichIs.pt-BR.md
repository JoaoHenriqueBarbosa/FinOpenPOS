---
layout: docs
title: "whichIs()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / whichIs



```ts
function whichIs(xml): string;
```

Defined in: [standardize.ts:90](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/standardize.ts#L90)

Identifica qual tipo de documento NFe uma string XML representa.


## Parameters

| Parameter | Type |
| ------ | ------ |
| `xml` | `unknown` |

## Returns

`string`

The root tag name (e.g. 'NFe', 'nfeProc', 'retConsSitNFe')

## Throws

If input is empty, not a string, not valid XML, or not an NFe document
