---
layout: docs
title: "buildDestinoConsumoPessoal()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildDestinoConsumoPessoal



```ts
function buildDestinoConsumoPessoal(
   config, 
   chNFe, 
   nSeqEvento, 
   tpAutor, 
   itens, 
   verAplic?): string;
```

Defined in: [sefaz-reform-events.ts:278](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-reform-events.ts#L278)

tpEvento=211120 -- Item destination for personal consumption


## Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`SefazReformConfig`](/docs/api-reference/interfaces/SefazReformConfig) |
| `chNFe` | `string` |
| `nSeqEvento` | `number` |
| `tpAutor` | `number` |
| `itens` | [`ConsumoItem`](/docs/api-reference/interfaces/ConsumoItem)[] |
| `verAplic?` | `string` |

## Returns

`string`
