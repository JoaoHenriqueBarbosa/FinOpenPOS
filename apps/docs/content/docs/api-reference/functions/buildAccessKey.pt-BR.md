---
layout: docs
title: "buildAccessKey()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildAccessKey



```ts
function buildAccessKey(params): string;
```

Defined in: [xml-builder.ts:111](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/xml-builder.ts#L111)

Build the access key (chave de acesso) -- 44 digits.
Gera a chave de acesso -- 44 dígitos.

Delega para AccessKey.build(); mantido para compatibilidade.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`AccessKeyParams`](/docs/api-reference/interfaces/AccessKeyParams) |  |

## Returns

`string`
