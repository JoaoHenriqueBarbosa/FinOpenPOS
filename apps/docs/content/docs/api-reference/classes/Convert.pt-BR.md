---
layout: docs
title: "Convert"
---

[@finopenpos/fiscal](/docs/api-reference/index) / Convert



Defined in: [convert.ts:62](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/convert.ts#L62)

Converte representacao SPED TXT de documentos NF-e para XML.


## Constructors

### Constructor

```ts
new Convert(txt?, baseLayout?): Convert;
```

Defined in: [convert.ts:71](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/convert.ts#L71)

#### Parameters

| Parameter | Type | Default value |
| ------ | ------ | ------ |
| `txt` | `string` | `""` |
| `baseLayout` | `string` | `LOCAL` |

#### Returns

`Convert`

## Methods

### dump()

```ts
dump(): DumpEntry[][];
```

Defined in: [convert.ts:119](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/convert.ts#L119)

Retorna o TXT parseado como objetos estruturados (para inspecao).


#### Returns

`DumpEntry`[][]

***

### toXml()

```ts
toXml(): string[];
```

Defined in: [convert.ts:85](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/convert.ts#L85)

Converte todas as NFe do TXT para XML.


#### Returns

`string`[]
