---
layout: docs
title: "getStructureByVersionString()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / getStructureByVersionString



```ts
function getStructureByVersionString(versionStr, baseLayout): Record<string, string>;
```

Defined in: [txt-structures.ts:745](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/txt-structures.ts#L745)

Obtem a estrutura apropriada para parsing, usando uma string de versao como "4.00" ou "3.10".


## Parameters

| Parameter | Type |
| ------ | ------ |
| `versionStr` | `string` |
| `baseLayout` | `string` |

## Returns

`Record`\<`string`, `string`\>
