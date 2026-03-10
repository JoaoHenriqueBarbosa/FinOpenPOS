---
layout: docs
title: "tag()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / tag



```ts
function tag(
   name, 
   attrs?, 
   children?): string;
```

Defined in: [xml-utils.ts:51](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/xml-utils.ts#L51)

Build an XML tag with optional attributes and children.

If children is a string, it is escaped. If children is an array
Constrói uma tag XML com atributos e filhos opcionais.


Se children for string, será escapado. Se for array de strings
pré-construídas (ex: tags aninhadas), serão concatenadas diretamente.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `name` | `string` |  |
| `attrs` | `Record`\<`string`, `string`\> |  |
| `children?` | `string` \| `string`[] |  |

## Returns

`string`
