---
layout: docs
title: "calculateIs()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / calculateIs



```ts
function calculateIs(data): TaxElement;
```

Defined in: [tax-is.ts:46](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-is.ts#L46)

Calculate IS tax element (domain logic, no XML dependency).
Calcula o elemento IS (lógica de domínio, sem dependência de XML).

Três modos mutuamente exclusivos conforme os campos presentes.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `data` | [`IsData`](/docs/api-reference/interfaces/IsData) |  |

## Returns

[`TaxElement`](/docs/api-reference/interfaces/TaxElement)
