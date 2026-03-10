---
layout: docs
title: "buildIcmsUfDestXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildIcmsUfDestXml



```ts
function buildIcmsUfDestXml(data): {
  totals: IcmsTotals;
  xml: string;
};
```

Defined in: [tax-icms.ts:424](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L424)

Build the ICMSUFDest XML group (interstate to final consumer).
This is a sibling of `<ICMS>`, placed directly inside `<imposto>`.

É irmão de `<ICMS>`, posicionado diretamente dentro de `<imposto>`.

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
| `totals` | [`IcmsTotals`](/docs/api-reference/interfaces/IcmsTotals) | [tax-icms.ts:424](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L424) |
| `xml` | `string` | [tax-icms.ts:424](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L424) |
