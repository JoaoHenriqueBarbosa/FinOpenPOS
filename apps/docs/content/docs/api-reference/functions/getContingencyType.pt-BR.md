---
layout: docs
title: "getContingencyType()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / getContingencyType



```ts
function getContingencyType(stateCode): "svc-an" | "svc-rs";
```

Defined in: [sefaz-urls.ts:551](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-urls.ts#L551)

Obtem o tipo de contingencia (SVC-AN ou SVC-RS) para o estado informado.


## Parameters

| Parameter | Type |
| ------ | ------ |
| `stateCode` | `string` |

## Returns

`"svc-an"` \| `"svc-rs"`
