---
layout: docs
title: "getSefazUrl()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / getSefazUrl



```ts
function getSefazUrl(
   stateCode, 
   service, 
   environment, 
   contingency?, 
   model?): string;
```

Defined in: [sefaz-urls.ts:517](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-urls.ts#L517)

Obtem a URL do web service da SEFAZ para o estado, servico, ambiente e modelo informados.


## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `stateCode` | `string` | `undefined` |
| `service` | [`SefazService`](/docs/api-reference/type-aliases/SefazService) | `undefined` |
| `environment` | [`SefazEnvironment`](/docs/api-reference/type-aliases/SefazEnvironment) | `undefined` |
| `contingency` | `boolean` | `false` |
| `model` | [`InvoiceModel`](/docs/api-reference/type-aliases/InvoiceModel) | `55` |

## Returns

`string`
