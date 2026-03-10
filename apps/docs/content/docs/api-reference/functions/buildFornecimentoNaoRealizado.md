---
layout: docs
title: "buildFornecimentoNaoRealizado()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildFornecimentoNaoRealizado



```ts
function buildFornecimentoNaoRealizado(
   config, 
   chNFe, 
   nSeqEvento, 
   itens, 
   verAplic?): string;
```

Defined in: [sefaz-reform-events.ts:683](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-reform-events.ts#L683)

tpEvento=112140 -- Unfulfilled supply with prepayment


## Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`SefazReformConfig`](/docs/api-reference/interfaces/SefazReformConfig) |
| `chNFe` | `string` |
| `nSeqEvento` | `number` |
| `itens` | [`ItemNaoFornecido`](/docs/api-reference/interfaces/ItemNaoFornecido)[] |
| `verAplic?` | `string` |

## Returns

`string`
