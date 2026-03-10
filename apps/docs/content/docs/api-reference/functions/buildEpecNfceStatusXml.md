---
layout: docs
title: "buildEpecNfceStatusXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildEpecNfceStatusXml



```ts
function buildEpecNfceStatusXml(
   config, 
   uf?, 
   tpAmb?): string;
```

Defined in: [epec-nfce.ts:187](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/epec-nfce.ts#L187)

Build consStatServ XML for EPEC NFC-e status check.


## Parameters

| Parameter | Type |
| ------ | ------ |
| `config` | [`EpecNfceConfig`](/docs/api-reference/interfaces/EpecNfceConfig) |
| `uf?` | `string` |
| `tpAmb?` | `number` |

## Returns

`string`
