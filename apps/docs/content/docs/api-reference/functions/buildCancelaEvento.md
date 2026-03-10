---
layout: docs
title: "buildCancelaEvento()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildCancelaEvento



```ts
function buildCancelaEvento(
   config, 
   chNFe, 
   nSeqEvento, 
   tpEventoAut, 
   nProtEvento, 
   verAplic?): string;
```

Defined in: [sefaz-reform-events.ts:498](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-reform-events.ts#L498)

tpEvento=110001 -- Event cancellation (cancel a previously registered event)


## Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`SefazReformConfig`](/docs/api-reference/interfaces/SefazReformConfig) |
| `chNFe` | `string` |
| `nSeqEvento` | `number` |
| `tpEventoAut` | `string` |
| `nProtEvento` | `string` |
| `verAplic?` | `string` |

## Returns

`string`
