---
layout: docs
title: "isValidTxt()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / isValidTxt



```ts
function isValidTxt(txt, baseLayout?): string[];
```

Defined in: [valid-txt.ts:39](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/valid-txt.ts#L39)

Validate a TXT representation of an NFe.
Valida uma representacao TXT de NFe.

Retorna array vazio se valido, ou array de strings de erro se invalido.

## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `txt` | `string` | `undefined` |
| `baseLayout` | `string` | `LAYOUT_LOCAL` |

## Returns

`string`[]
