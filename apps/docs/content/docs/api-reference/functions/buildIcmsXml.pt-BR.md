---
layout: docs
title: "buildIcmsXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildIcmsXml



```ts
function buildIcmsXml(data): {
  totals: IcmsTotals;
  xml: string;
};
```

Defined in: [tax-icms.ts:346](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L346)

Gera a string XML do ICMS (wrapper compatível sobre calculateIcms).


## Parameters

| Parameter | Type |
| ------ | ------ |
| `data` | [`IcmsData`](/docs/api-reference/interfaces/IcmsData) |

## Returns

```ts
{
  totals: IcmsTotals;
  xml: string;
}
```

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `totals` | [`IcmsTotals`](/docs/api-reference/interfaces/IcmsTotals) | [tax-icms.ts:346](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L346) |
| `xml` | `string` | [tax-icms.ts:346](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L346) |
