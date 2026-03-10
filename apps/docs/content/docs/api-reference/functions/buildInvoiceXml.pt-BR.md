---
layout: docs
title: "buildInvoiceXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildInvoiceXml



```ts
function buildInvoiceXml(data): {
  accessKey: string;
  xml: string;
};
```

Defined in: [xml-builder.ts:32](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/xml-builder.ts#L32)

Build a complete NF-e or NFC-e XML (unsigned).
Constrói o XML completo da NF-e/NFC-e (sem assinatura).

Segue o layout 4.00 conforme definido pelo MOC.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `data` | [`InvoiceBuildData`](/docs/api-reference/interfaces/InvoiceBuildData) |  |

## Returns

```ts
{
  accessKey: string;
  xml: string;
}
```



| Name | Type | Defined in |
| ------ | ------ | ------ |
| `accessKey` | `string` | [xml-builder.ts:34](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/xml-builder.ts#L34) |
| `xml` | `string` | [xml-builder.ts:33](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/xml-builder.ts#L33) |
