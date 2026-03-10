---
layout: docs
title: "requiredField()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / requiredField



```ts
function requiredField(name, value): TaxField;
```

Defined in: [tax-element.ts:83](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-element.ts#L83)

Auxiliar: cria um campo obrigatório (lança erro se o valor for nulo)


## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `name` | `string` |  |
| `value` | `string` \| `null` \| `undefined` |  |

## Returns

[`TaxField`](/docs/api-reference/interfaces/TaxField)
