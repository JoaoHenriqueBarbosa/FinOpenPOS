---
layout: docs
title: "loadStructure()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / loadStructure



```ts
function loadStructure(version?, baseLayout?): Record<string, string>;
```

Defined in: [valid-txt.ts:25](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/valid-txt.ts#L25)

Load the TXT structure definition for the given version and layout.


## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `version` | `number` | `4.0` |
| `baseLayout` | `string` | `LAYOUT_LOCAL` |

## Returns

`Record`\<`string`, `string`\>
