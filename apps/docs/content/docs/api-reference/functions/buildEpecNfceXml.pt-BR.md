---
layout: docs
title: "buildEpecNfceXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildEpecNfceXml



```ts
function buildEpecNfceXml(
   nfceXml, 
   config, 
   verAplic?): string;
```

Defined in: [epec-nfce.ts:59](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/epec-nfce.ts#L59)

Constroi XML do evento EPEC para NFC-e (modelo 65).


## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `nfceXml` | `string` |  |
| `config` | [`EpecNfceConfig`](/docs/api-reference/interfaces/EpecNfceConfig) |  |
| `verAplic?` | `string` |  |

## Returns

`string`


