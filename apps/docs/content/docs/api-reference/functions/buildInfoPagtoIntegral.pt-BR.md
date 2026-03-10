---
layout: docs
title: "buildInfoPagtoIntegral()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildInfoPagtoIntegral



```ts
function buildInfoPagtoIntegral(
   config, 
   model, 
   chNFe, 
   nSeqEvento, 
   verAplic?): string;
```

Defined in: [sefaz-reform-events.ts:182](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-reform-events.ts#L182)

tpEvento=112110 -- Full payment confirmation event
tpEvento=112110 -- Informacao de efetivo pagamento integral


## Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`SefazReformConfig`](/docs/api-reference/interfaces/SefazReformConfig) |
| `model` | `number` |
| `chNFe` | `string` |
| `nSeqEvento` | `number` |
| `verAplic?` | `string` |

## Returns

`string`
