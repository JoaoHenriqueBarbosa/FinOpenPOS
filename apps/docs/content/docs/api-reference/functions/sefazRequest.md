---
layout: docs
title: "sefazRequest()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / sefazRequest



```ts
function sefazRequest(options): Promise<SefazRawResponse>;
```

Defined in: [sefaz-transport.ts:87](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-transport.ts#L87)

Send a SOAP 1.2 request to a SEFAZ web service with mutual TLS (client certificate).
Uses curl with PEM cert/key extracted from PFX, because Bun's node:https
does not fully support mTLS with PFX (ECONNREFUSED on Agent with pfx option).

Usa curl com cert/key PEM extraidos do PFX, pois o node:https do Bun nao suporta mTLS com PFX.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | `SefazRequestOptions` |

## Returns

`Promise`\<`SefazRawResponse`\>
