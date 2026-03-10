---
layout: docs
title: "toStd()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / toStd



```ts
function toStd(xml): Record<string, unknown>;
```

Defined in: [standardize.ts:151](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/standardize.ts#L151)

Convert an NFe XML string to a normalized object (like PHP's toStd).
In TypeScript this is equivalent to toArray since we don't have stdClass.


## Parameters

| Parameter | Type |
| ------ | ------ |
| `xml` | `string` |

## Returns

`Record`\<`string`, `unknown`\>
