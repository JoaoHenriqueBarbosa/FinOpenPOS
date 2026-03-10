---
layout: docs
title: "buildDistDFeQueryXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildDistDFeQueryXml



```ts
function buildDistDFeQueryXml(
   environment, 
   stateCode, 
   taxId, 
   lastNSU?, 
   specificNSU?, 
   accessKey?, 
   isCpf?): string;
```

Defined in: [sefaz-request-builders.ts:241](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-request-builders.ts#L241)

Constroi o XML de consulta de distribuicao de DF-e (distDFeInt).


## Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `environment` | `1` \| `2` | `undefined` |
| `stateCode` | `string` | `undefined` |
| `taxId` | `string` | `undefined` |
| `lastNSU` | `number` | `0` |
| `specificNSU` | `number` | `0` |
| `accessKey?` | `string` | `undefined` |
| `isCpf?` | `boolean` | `false` |

## Returns

`string`
