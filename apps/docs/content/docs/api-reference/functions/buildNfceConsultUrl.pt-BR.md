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

Constroi o conteudo da tag urlChave para consulta da NFe pela chave de acesso.


## Parameters

| Parameter | Type |
| ------ | ------ |
| `urlChave` | `string` |
| `accessKey` | `string` |
| `environment` | [`SefazEnvironment`](/docs/api-reference/type-aliases/SefazEnvironment) |

## Returns

`string`
