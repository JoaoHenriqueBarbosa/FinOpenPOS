---
layout: docs
title: "validate()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / validate



```ts
function validate(content): FiscalConfig;
```

Defined in: [config-validate.ts:55](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/config-validate.ts#L55)

Validate a fiscal configuration JSON string.
Valida uma string JSON de configuracao fiscal.

Retorna o objeto de configuracao parseado em caso de sucesso, lanca erro em caso de falha.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `content` | `string` |

## Returns

[`FiscalConfig`](/docs/api-reference/interfaces/FiscalConfig)
