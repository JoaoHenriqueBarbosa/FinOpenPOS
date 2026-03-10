---
layout: docs
title: "calculateIcms()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / calculateIcms



```ts
function calculateIcms(data): {
  element: TaxElement;
  totals: IcmsTotals;
};
```

Defined in: [tax-icms.ts:319](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L319)

Calculate ICMS for a single item (domain logic, no XML dependency).
Calcula o ICMS de um item (lógica de domínio, sem dependência de XML).

Retorna TaxElement estruturado + totais acumulados.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `data` | [`IcmsData`](/docs/api-reference/interfaces/IcmsData) |  |

## Returns

```ts
{
  element: TaxElement;
  totals: IcmsTotals;
}
```

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `element` | [`TaxElement`](/docs/api-reference/interfaces/TaxElement) | [tax-icms.ts:319](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L319) |
| `totals` | [`IcmsTotals`](/docs/api-reference/interfaces/IcmsTotals) | [tax-icms.ts:319](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L319) |
