---
layout: docs
title: "TaxId"
---

[@finopenpos/fiscal](/docs/api-reference/index) / TaxId



Defined in: [value-objects/tax-id.ts:14](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/tax-id.ts#L14)

Immutable wrapper for CPF or CNPJ with formatting and XML helpers.


## Constructors

### Constructor

```ts
new TaxId(value): TaxId;
```

Defined in: [value-objects/tax-id.ts:15](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/tax-id.ts#L15)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `value` | `string` |

#### Returns

`TaxId`

## Methods

### isCnpj()

```ts
isCnpj(): boolean;
```

Defined in: [value-objects/tax-id.ts:23](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/tax-id.ts#L23)


#### Returns

`boolean`

***

### isCpf()

```ts
isCpf(): boolean;
```

Defined in: [value-objects/tax-id.ts:18](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/tax-id.ts#L18)


#### Returns

`boolean`

***

### padded()

```ts
padded(): string;
```

Defined in: [value-objects/tax-id.ts:33](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/tax-id.ts#L33)


#### Returns

`string`

***

### tagName()

```ts
tagName(): "CNPJ" | "CPF";
```

Defined in: [value-objects/tax-id.ts:28](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/tax-id.ts#L28)


#### Returns

`"CNPJ"` \| `"CPF"`

***

### toString()

```ts
toString(): string;
```

Defined in: [value-objects/tax-id.ts:45](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/tax-id.ts#L45)


#### Returns

`string`

***

### toXmlTag()

```ts
toXmlTag(): string;
```

Defined in: [value-objects/tax-id.ts:40](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/tax-id.ts#L40)


#### Returns

`string`
