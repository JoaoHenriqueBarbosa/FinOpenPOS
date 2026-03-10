---
layout: docs
title: "parseAuthorizationResponse()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / parseAuthorizationResponse



```ts
function parseAuthorizationResponse(xml): {
  authorizedAt?: string;
  protocolNumber?: string;
  protocolXml?: string;
  statusCode: number;
  statusMessage: string;
};
```

Defined in: [sefaz-response-parsers.ts:34](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-response-parsers.ts#L34)

Faz o parse da resposta de autorizacao (retEnviNFe / protNFe).


## Parameters

| Parameter | Type |
| ------ | ------ |
| `xml` | `string` |

## Returns

```ts
{
  authorizedAt?: string;
  protocolNumber?: string;
  protocolXml?: string;
  statusCode: number;
  statusMessage: string;
}
```

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `authorizedAt?` | `string` | [sefaz-response-parsers.ts:39](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-response-parsers.ts#L39) |
| `protocolNumber?` | `string` | [sefaz-response-parsers.ts:37](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-response-parsers.ts#L37) |
| `protocolXml?` | `string` | [sefaz-response-parsers.ts:38](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-response-parsers.ts#L38) |
| `statusCode` | `number` | [sefaz-response-parsers.ts:35](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-response-parsers.ts#L35) |
| `statusMessage` | `string` | [sefaz-response-parsers.ts:36](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-response-parsers.ts#L36) |
