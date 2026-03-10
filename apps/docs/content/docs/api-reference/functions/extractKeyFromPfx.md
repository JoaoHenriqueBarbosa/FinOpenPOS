---
layout: docs
title: "extractKeyFromPfx()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / extractKeyFromPfx



```ts
function extractKeyFromPfx(pfxBuffer, passphrase): string;
```

Defined in: [certificate.ts:202](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/certificate.ts#L202)

Extract private key PEM from PFX using openssl CLI (with -legacy flag).


## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |

## Returns

`string`
