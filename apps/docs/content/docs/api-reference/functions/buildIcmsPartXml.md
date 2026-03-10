---
layout: docs
title: "buildIcmsPartXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildIcmsPartXml



```ts
function buildIcmsPartXml(data): {
  totals: IcmsTotals;
  xml: string;
};
```

Defined in: [tax-icms.ts:358](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L358)

Build the ICMSPart XML group (partition between states).
Used inside `<ICMS>` for CST 10 or 90 with interstate partition.

Usado dentro de `<ICMS>` para CST 10 ou 90 com partilha interestadual.

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
| `totals` | [`IcmsTotals`](/docs/api-reference/interfaces/IcmsTotals) | [tax-icms.ts:358](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L358) |
| `xml` | `string` | [tax-icms.ts:358](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L358) |
