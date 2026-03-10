---
layout: docs
title: "buildIcmsStXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildIcmsStXml



```ts
function buildIcmsStXml(data): {
  totals: IcmsTotals;
  xml: string;
};
```

Defined in: [tax-icms.ts:391](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L391)

Build the ICMSST XML group (ST repasse).
Gera o grupo XML ICMSST (repasse de ST).

Usado dentro de `<ICMS>` para CST 41 ou 60 com repasse interestadual de ST.

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
| `totals` | [`IcmsTotals`](/docs/api-reference/interfaces/IcmsTotals) | [tax-icms.ts:391](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L391) |
| `xml` | `string` | [tax-icms.ts:391](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L391) |
