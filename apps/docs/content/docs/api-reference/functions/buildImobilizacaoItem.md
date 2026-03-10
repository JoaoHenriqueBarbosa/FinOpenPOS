---
layout: docs
title: "buildImobilizacaoItem()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildImobilizacaoItem



```ts
function buildImobilizacaoItem(
   config, 
   chNFe, 
   nSeqEvento, 
   itens, 
   verAplic?): string;
```

Defined in: [sefaz-reform-events.ts:349](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-reform-events.ts#L349)

tpEvento=211130 -- Item immobilization (fixed asset registration)


## Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`SefazReformConfig`](/docs/api-reference/interfaces/SefazReformConfig) |
| `chNFe` | `string` |
| `nSeqEvento` | `number` |
| `itens` | [`ImobilizacaoItem`](/docs/api-reference/interfaces/ImobilizacaoItem)[] |
| `verAplic?` | `string` |

## Returns

`string`
