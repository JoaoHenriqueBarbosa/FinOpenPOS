---
layout: docs
title: "getNfceConsultationUri()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / getNfceConsultationUri



```ts
function getNfceConsultationUri(stateCode, environment): string;
```

Defined in: [sefaz-urls.ts:629](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-urls.ts#L629)

Get the NFC-e consultation URI (urlChave) for a given state and environment.
Obtem a URI de consulta NFC-e (urlChave) para o estado e ambiente informados.

Usada para links de QR Code e consulta do DANFCE.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `stateCode` | `string` |
| `environment` | [`SefazEnvironment`](/docs/api-reference/type-aliases/SefazEnvironment) |

## Returns

`string`
