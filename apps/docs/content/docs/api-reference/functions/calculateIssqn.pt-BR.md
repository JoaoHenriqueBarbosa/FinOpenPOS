---
layout: docs
title: "calculateIssqn()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / calculateIssqn



```ts
function calculateIssqn(data, totals?): TaxElement;
```

Defined in: [tax-issqn.ts:94](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-issqn.ts#L94)

Calcula o elemento ISSQN e acumula totais (lógica de domínio, sem XML).


## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `data` | [`IssqnData`](/docs/api-reference/interfaces/IssqnData) |  |
| `totals?` | [`IssqnTotals`](/docs/api-reference/interfaces/IssqnTotals) |  |

## Returns

[`TaxElement`](/docs/api-reference/interfaces/TaxElement)
