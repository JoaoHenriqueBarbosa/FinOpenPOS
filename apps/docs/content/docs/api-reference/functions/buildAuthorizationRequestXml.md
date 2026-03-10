---
layout: docs
title: "buildAuthorizationRequestXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildAuthorizationRequestXml



```ts
function buildAuthorizationRequestXml(
   signedNfeXml, 
   environment, 
   stateCode): string;
```

Defined in: [sefaz-request-builders.ts:30](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-request-builders.ts#L30)

Build the authorization request XML (envelope for sending an NF-e).


## Parameters

| Parameter | Type |
| ------ | ------ |
| `signedNfeXml` | `string` |
| `environment` | `1` \| `2` |
| `stateCode` | `string` |

## Returns

`string`
