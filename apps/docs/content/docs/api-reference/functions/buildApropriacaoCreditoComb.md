---
layout: docs
title: "buildApropriacaoCreditoComb()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildApropriacaoCreditoComb



```ts
function buildApropriacaoCreditoComb(
   config, 
   chNFe, 
   nSeqEvento, 
   itens, 
   verAplic?): string;
```

Defined in: [sefaz-reform-events.ts:396](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-reform-events.ts#L396)

tpEvento=211140 -- Fuel credit appropriation request


## Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`SefazReformConfig`](/docs/api-reference/interfaces/SefazReformConfig) |
| `chNFe` | `string` |
| `nSeqEvento` | `number` |
| `itens` | [`CombustivelItem`](/docs/api-reference/interfaces/CombustivelItem)[] |
| `verAplic?` | `string` |

## Returns

`string`
