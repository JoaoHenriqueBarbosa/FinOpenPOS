---
layout: docs
title: "buildApropriacaoCreditoBens()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildApropriacaoCreditoBens



```ts
function buildApropriacaoCreditoBens(
   config, 
   chNFe, 
   nSeqEvento, 
   itens, 
   verAplic?): string;
```

Defined in: [sefaz-reform-events.ts:439](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-reform-events.ts#L439)

tpEvento=211150 -- Solicitacao de Apropriacao de Credito para bens e servicos


## Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`SefazReformConfig`](/docs/api-reference/interfaces/SefazReformConfig) |
| `chNFe` | `string` |
| `nSeqEvento` | `number` |
| `itens` | [`CreditoBensItem`](/docs/api-reference/interfaces/CreditoBensItem)[] |
| `verAplic?` | `string` |

## Returns

`string`
