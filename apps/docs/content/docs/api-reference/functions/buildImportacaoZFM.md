---
layout: docs
title: "buildImportacaoZFM()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildImportacaoZFM



```ts
function buildImportacaoZFM(
   config, 
   chNFe, 
   nSeqEvento, 
   itens, 
   verAplic?): string;
```

Defined in: [sefaz-reform-events.ts:536](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-reform-events.ts#L536)

tpEvento=112120 -- ALC/ZFM import not converted to exemption


## Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`SefazReformConfig`](/docs/api-reference/interfaces/SefazReformConfig) |
| `chNFe` | `string` |
| `nSeqEvento` | `number` |
| `itens` | [`ImportacaoZFMItem`](/docs/api-reference/interfaces/ImportacaoZFMItem)[] |
| `verAplic?` | `string` |

## Returns

`string`
