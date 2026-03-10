---
layout: docs
title: "buildManifestacaoTransfCredIBS()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildManifestacaoTransfCredIBS



```ts
function buildManifestacaoTransfCredIBS(
   config, 
   chNFe, 
   nSeqEvento, 
   indAceitacao, 
   verAplic?): string;
```

Defined in: [sefaz-reform-events.ts:464](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-reform-events.ts#L464)

tpEvento=212110 -- Manifestacao sobre Pedido de Transferencia de Credito de IBS


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
