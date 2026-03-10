---
layout: docs
title: "attachB2B()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / attachB2B



```ts
function attachB2B(
   nfeProcXml, 
   b2bXml, 
   tagB2B?): string;
```

Defined in: [complement.ts:340](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/complement.ts#L340)

Attach a B2B financial tag to an authorized nfeProc XML.
Wraps the nfeProc and B2B content in a `<nfeProcB2B>` element.

Envolve o nfeProc e o conteúdo B2B em um elemento `<nfeProcB2B>`.

## Parameters

| Parameter | Type | Default value | Description |
| ------ | ------ | ------ | ------ |

## Returns

`string`

The `nfeProcB2B` XML string
