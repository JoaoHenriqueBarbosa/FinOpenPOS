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
The XML follows layout 4.00 as defined by MOC.

Segue o layout 4.00 conforme definido pelo MOC.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |

## Returns

```ts
{
  accessKey: string;
  xml: string;
}
```

Object with unsigned XML string and 44-digit access key

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `accessKey` | `string` | [xml-builder.ts:34](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/xml-builder.ts#L34) |
| `xml` | `string` | [xml-builder.ts:33](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/xml-builder.ts#L33) |
