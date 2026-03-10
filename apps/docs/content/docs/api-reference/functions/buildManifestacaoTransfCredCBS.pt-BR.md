---
layout: docs
title: "buildManifestacaoTransfCredCBS()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildManifestacaoTransfCredCBS



```ts
function buildManifestacaoTransfCredCBS(
   config, 
   chNFe, 
   nSeqEvento, 
   indAceitacao, 
   verAplic?): string;
```

Defined in: [sefaz-reform-events.ts:481](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-reform-events.ts#L481)

tpEvento=212120 -- Manifestacao sobre Pedido de Transferencia de Credito de CBS


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
