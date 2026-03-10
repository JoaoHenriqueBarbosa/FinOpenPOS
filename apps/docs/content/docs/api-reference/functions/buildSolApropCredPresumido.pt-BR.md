---
layout: docs
title: "buildSolApropCredPresumido()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildSolApropCredPresumido



```ts
function buildSolApropCredPresumido(
   config, 
   chNFe, 
   nSeqEvento, 
   itens, 
   verAplic?): string;
```

Defined in: [sefaz-reform-events.ts:218](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-reform-events.ts#L218)

tpEvento=211110 -- Solicitacao de Apropriacao de Credito Presumido


## Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`SefazReformConfig`](/docs/api-reference/interfaces/SefazReformConfig) |
| `chNFe` | `string` |
| `nSeqEvento` | `number` |
| `itens` | [`CredPresumidoItem`](/docs/api-reference/interfaces/CredPresumidoItem)[] |
| `verAplic?` | `string` |

## Returns

`string`
