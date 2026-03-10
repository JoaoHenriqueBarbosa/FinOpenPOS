---
layout: docs
title: "buildRouboPerdaTransporteFornecedor()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildRouboPerdaTransporteFornecedor



```ts
function buildRouboPerdaTransporteFornecedor(
   config, 
   chNFe, 
   nSeqEvento, 
   itens, 
   verAplic?): string;
```

Defined in: [sefaz-reform-events.ts:634](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-reform-events.ts#L634)

tpEvento=112130 -- Perishment, loss, theft by supplier (CIF)


## Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`SefazReformConfig`](/docs/api-reference/interfaces/SefazReformConfig) |
| `chNFe` | `string` |
| `nSeqEvento` | `number` |
| `itens` | [`PerecimentoFornecedorItem`](/docs/api-reference/interfaces/PerecimentoFornecedorItem)[] |
| `verAplic?` | `string` |

## Returns

`string`
