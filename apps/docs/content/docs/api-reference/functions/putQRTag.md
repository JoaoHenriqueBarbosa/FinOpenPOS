---
layout: docs
title: "putQRTag()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / putQRTag



```ts
function putQRTag(params): Promise<string>;
```

Defined in: [qrcode.ts:235](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L235)

Insert QR Code and urlChave tags into a signed NFC-e XML.


Ported from PHP NFePHP\NFe\Factories\QRCode::putQRTag().
Creates an \<infNFeSupl\> element with \<qrCode\> and \<urlChave\> children,
and inserts it before the \<Signature\> element in the NFe.

e insere antes do elemento \<Signature\> na NFe.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`PutQRTagParams`](/docs/api-reference/interfaces/PutQRTagParams) |

## Returns

`Promise`\<`string`\>

Modified XML string with infNFeSupl inserted
