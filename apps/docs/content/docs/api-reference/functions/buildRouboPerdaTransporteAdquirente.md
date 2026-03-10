---
layout: docs
title: "buildRouboPerdaTransporteAdquirente()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildRouboPerdaTransporteAdquirente



```ts
function buildRouboPerdaTransporteAdquirente(
   config, 
   chNFe, 
   nSeqEvento, 
   itens, 
   verAplic?): string;
```

Defined in: [sefaz-reform-events.ts:583](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-reform-events.ts#L583)

tpEvento=211124 -- Perishment, loss, theft by acquirer (FOB)


## Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`SefazReformConfig`](/docs/api-reference/interfaces/SefazReformConfig) |
| `chNFe` | `string` |
| `nSeqEvento` | `number` |
| `itens` | [`PerecimentoAdquirenteItem`](/docs/api-reference/interfaces/PerecimentoAdquirenteItem)[] |
| `verAplic?` | `string` |

## Returns

`string`
