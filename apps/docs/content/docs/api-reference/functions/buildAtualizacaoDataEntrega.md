---
layout: docs
title: "buildAtualizacaoDataEntrega()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildAtualizacaoDataEntrega



```ts
function buildAtualizacaoDataEntrega(
   config, 
   chNFe, 
   nSeqEvento, 
   dataPrevista, 
   verAplic?): string;
```

Defined in: [sefaz-reform-events.ts:712](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-reform-events.ts#L712)

tpEvento=112150 -- Update estimated delivery date


## Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`SefazReformConfig`](/docs/api-reference/interfaces/SefazReformConfig) |
| `chNFe` | `string` |
| `nSeqEvento` | `number` |
| `dataPrevista` | `string` |
| `verAplic?` | `string` |

## Returns

`string`
