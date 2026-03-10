---
layout: docs
title: "buildCadastroQueryXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildCadastroQueryXml



```ts
function buildCadastroQueryXml(
   stateCode, 
   cnpj?, 
   ie?, 
   cpf?): string;
```

Defined in: [sefaz-request-builders.ts:208](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-request-builders.ts#L208)

Constroi o XML de consulta cadastral (ConsCad) por CNPJ, IE ou CPF.


## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `stateCode` | `string` | `undefined` |
| `cnpj` | `string` | `""` |
| `ie` | `string` | `""` |
| `cpf` | `string` | `""` |

## Returns

`string`
