---
layout: docs
title: "buildNfceConsultUrl()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildNfceConsultUrl



```ts
function buildNfceConsultUrl(
   urlChave, 
   accessKey, 
   environment): string;
```

Defined in: [qrcode.ts:156](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L156)

Build the NFC-e urlChave tag content for consulting the NFe by access key.


## Parameters

| Parameter | Type |
| ------ | ------ |
| `urlChave` | `string` |
| `accessKey` | `string` |
| `environment` | [`SefazEnvironment`](/docs/api-reference/type-aliases/SefazEnvironment) |

## Returns

`string`
