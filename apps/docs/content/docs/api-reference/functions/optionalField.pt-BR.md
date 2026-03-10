---
layout: docs
title: "optionalField()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / optionalField



```ts
function optionalField(name, value): TaxField | null;
```

Defined in: [tax-element.ts:65](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-element.ts#L65)

Auxiliar: cria um campo opcional (retorna null se o valor for nulo)


## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `name` | `string` |  |
| `value` | `string` \| `null` \| `undefined` |  |

## Returns

[`TaxField`](/docs/api-reference/interfaces/TaxField) \| `null`
