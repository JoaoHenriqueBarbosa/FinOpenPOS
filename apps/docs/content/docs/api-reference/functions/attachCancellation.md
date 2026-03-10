---
layout: docs
title: "attachCancellation()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / attachCancellation



```ts
function attachCancellation(nfeProcXml, cancelResponseXml): string;
```

Defined in: [complement.ts:130](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/complement.ts#L130)

Attach a cancellation event response to an authorized nfeProc XML.
Appends the `<retEvento>` node inside the `<nfeProc>` wrapper.

Insere o nó `<retEvento>` dentro do wrapper `<nfeProc>`.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |

## Returns

`string`

Modified nfeProc XML with retEvento appended
