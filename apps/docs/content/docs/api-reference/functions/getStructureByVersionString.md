---
layout: docs
title: "getStructureByVersionString()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / getStructureByVersionString



```ts
function getStructureByVersionString(versionStr, baseLayout): Record<string, string>;
```

Defined in: [txt-structures.ts:745](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/txt-structures.ts#L745)

Get the appropriate structure for parsing, using a version string like "4.00" or "3.10".


## Parameters

| Parameter | Type |
| ------ | ------ |
| `versionStr` | `string` |
| `baseLayout` | `string` |

## Returns

`Record`\<`string`, `string`\>
