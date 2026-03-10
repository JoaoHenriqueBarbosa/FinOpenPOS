---
layout: docs
title: "attachEventProtocol()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / attachEventProtocol



```ts
function attachEventProtocol(requestXml, responseXml): string;
```

Defined in: [complement.ts:278](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/complement.ts#L278)

Attach an event protocol response to the event request,
Anexa a resposta do protocolo de evento à requisição,

produzindo o wrapper `procEventoNFe`.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `requestXml` | `string` |  |
| `responseXml` | `string` |  |

## Returns

`string`


