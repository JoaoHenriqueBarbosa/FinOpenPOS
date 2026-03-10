---
layout: docs
title: "lookupCep()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / lookupCep



```ts
function lookupCep(cep): Promise<CepResult | null>;
```

Defined in: [cep-lookup.ts:26](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/cep-lookup.ts#L26)

Consulta endereco pelo CEP usando ViaCEP com BrasilAPI como fallback.


## Parameters

| Parameter | Type |
| ------ | ------ |
| `cep` | `string` |

## Returns

`Promise`\<[`CepResult`](/docs/api-reference/interfaces/CepResult) \| `null`\>
