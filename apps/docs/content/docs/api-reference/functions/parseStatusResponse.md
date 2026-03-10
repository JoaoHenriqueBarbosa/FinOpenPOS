---
layout: docs
title: "parseStatusResponse()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / parseStatusResponse



```ts
function parseStatusResponse(xml): {
  averageTime?: number;
  statusCode: number;
  statusMessage: string;
};
```

Defined in: [sefaz-response-parsers.ts:14](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-response-parsers.ts#L14)

Parse the SEFAZ service status response (NfeStatusServico).


## Parameters

| Parameter | Type |
| ------ | ------ |
| `xml` | `string` |

## Returns

```ts
{
  averageTime?: number;
  statusCode: number;
  statusMessage: string;
}
```

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `averageTime?` | `number` | [sefaz-response-parsers.ts:17](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-response-parsers.ts#L17) |
| `statusCode` | `number` | [sefaz-response-parsers.ts:15](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-response-parsers.ts#L15) |
| `statusMessage` | `string` | [sefaz-response-parsers.ts:16](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-response-parsers.ts#L16) |
