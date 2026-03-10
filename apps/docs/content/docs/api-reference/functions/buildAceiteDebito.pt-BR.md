---
layout: docs
title: "buildAceiteDebito()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildAceiteDebito



```ts
function buildAceiteDebito(
   config, 
   chNFe, 
   nSeqEvento, 
   indAceitacao, 
   verAplic?): string;
```

Defined in: [sefaz-reform-events.ts:314](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-reform-events.ts#L314)

tpEvento=211128 -- Aceite de debito na apuracao


## Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`SefazReformConfig`](/docs/api-reference/interfaces/SefazReformConfig) |
| `chNFe` | `string` |
| `nSeqEvento` | `number` |
| `indAceitacao` | `number` |
| `verAplic?` | `string` |

## Returns

`string`
