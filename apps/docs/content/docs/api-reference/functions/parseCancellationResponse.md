---
layout: docs
title: "parseCancellationResponse()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / parseCancellationResponse



```ts
function parseCancellationResponse(xml): {
  protocolNumber?: string;
  statusCode: number;
  statusMessage: string;
};
```

Defined in: [sefaz-response-parsers.ts:71](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-response-parsers.ts#L71)

Parse cancellation event response.


## Parameters

| Parameter | Type |
| ------ | ------ |
| `xml` | `string` |

## Returns

```ts
{
  protocolNumber?: string;
  statusCode: number;
  statusMessage: string;
}
```

| Name | Type | Defined in |
| ------ | ------ | ------ |
| `protocolNumber?` | `string` | [sefaz-response-parsers.ts:74](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-response-parsers.ts#L74) |
| `statusCode` | `number` | [sefaz-response-parsers.ts:72](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-response-parsers.ts#L72) |
| `statusMessage` | `string` | [sefaz-response-parsers.ts:73](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-response-parsers.ts#L73) |
