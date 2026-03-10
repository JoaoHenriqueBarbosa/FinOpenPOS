---
layout: docs
title: "AccessKey"
---

[@finopenpos/fiscal](/docs/api-reference/index) / AccessKey



Defined in: [value-objects/access-key.ts:19](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/access-key.ts#L19)

Immutable 44-digit NF-e/NFC-e access key with component extraction methods.


## Constructors

### Constructor

```ts
new AccessKey(key): AccessKey;
```

Defined in: [value-objects/access-key.ts:22](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/access-key.ts#L22)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `key` | `string` |

#### Returns

`AccessKey`

## Methods

### build()

```ts
static build(params): AccessKey;
```

Defined in: [value-objects/access-key.ts:37](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/access-key.ts#L37)

Build an access key from its component parts.
Concatenates all parts, computes the mod-11 check digit, and returns an AccessKey.


#### Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`AccessKeyParams`](/docs/api-reference/interfaces/AccessKeyParams) |

#### Returns

`AccessKey`

***

### calculateMod11()

```ts
static calculateMod11(digits): string;
```

Defined in: [value-objects/access-key.ts:60](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/access-key.ts#L60)

Calculate modulo 11 check digit.
Weights cycle from 2 to 9 right-to-left.
Result: if remainder \< 2 then digit 0; else 11 - remainder.


#### Parameters

| Parameter | Type |
| ------ | ------ |
| `digits` | `string` |

#### Returns

`string`

***

### checkDigit()

```ts
checkDigit(): string;
```

Defined in: [value-objects/access-key.ts:115](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/access-key.ts#L115)


#### Returns

`string`

***

### emissionType()

```ts
emissionType(): number;
```

Defined in: [value-objects/access-key.ts:105](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/access-key.ts#L105)


#### Returns

`number`

***

### model()

```ts
model(): number;
```

Defined in: [value-objects/access-key.ts:90](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/access-key.ts#L90)


#### Returns

`number`

***

### number()

```ts
number(): number;
```

Defined in: [value-objects/access-key.ts:100](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/access-key.ts#L100)


#### Returns

`number`

***

### numericCode()

```ts
numericCode(): string;
```

Defined in: [value-objects/access-key.ts:110](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/access-key.ts#L110)


#### Returns

`string`

***

### series()

```ts
series(): number;
```

Defined in: [value-objects/access-key.ts:95](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/access-key.ts#L95)


#### Returns

`number`

***

### stateCode()

```ts
stateCode(): string;
```

Defined in: [value-objects/access-key.ts:75](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/access-key.ts#L75)


#### Returns

`string`

***

### taxId()

```ts
taxId(): string;
```

Defined in: [value-objects/access-key.ts:85](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/access-key.ts#L85)


#### Returns

`string`

***

### toString()

```ts
toString(): string;
```

Defined in: [value-objects/access-key.ts:120](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/access-key.ts#L120)


#### Returns

`string`

***

### yearMonth()

```ts
yearMonth(): string;
```

Defined in: [value-objects/access-key.ts:80](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/access-key.ts#L80)


#### Returns

`string`
