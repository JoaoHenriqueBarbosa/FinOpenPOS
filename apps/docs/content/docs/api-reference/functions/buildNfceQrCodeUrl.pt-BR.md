---
layout: docs
title: "buildNfceQrCodeUrl()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildNfceQrCodeUrl



```ts
function buildNfceQrCodeUrl(params): Promise<string>;
```

Defined in: [qrcode.ts:72](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L72)

Constroi a URL do QR Code NFC-e.


Supports version 2 (v200) and version 3 (v300, NT 2025.001).
Online mode uses a simplified format; offline (tpEmis=9) includes
Suporta versao 2 (v200) e versao 3 (v300, NT 2025.001).

Modo online usa formato simplificado; offline (tpEmis=9) inclui
campos adicionais para validacao sem rede.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`NfceQrCodeParams`](/docs/api-reference/interfaces/NfceQrCodeParams) |

## Returns

`Promise`\<`string`\>
