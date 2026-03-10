---
layout: docs
title: "AccessKey"
---

[@finopenpos/fiscal](/docs/api-reference/index) / AccessKey



Defined in: [value-objects/access-key.ts:19](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/access-key.ts#L19)

Chave de acesso NF-e/NFC-e imutavel de 44 digitos com metodos de extracao de componentes.


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
Constroi uma chave de acesso a partir de suas partes componentes.


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
Calcula digito verificador modulo 11.


#### Parameters

| Parameter | Type |
| ------ | ------ |
| `digits` | `string` |

#### Returns

`string`

***

### checkDigit()

```ts
Check digit (mod-11) -- position 43 / Digito verificador (mod-11) -- posicao 43
```

Defined in: [value-objects/access-key.ts:115](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/access-key.ts#L115)


#### Returns

`string`

***

### emissionType()

```ts
Emission type -- position 34 / Tipo de emissao -- posicao 34
```

Defined in: [value-objects/access-key.ts:105](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/access-key.ts#L105)


#### Returns

`number`

***

### model()

```ts
Fiscal model (55 = NF-e, 65 = NFC-e) -- positions 20..21 / Modelo fiscal -- posicoes 20..21
```

Defined in: [value-objects/access-key.ts:90](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/access-key.ts#L90)


#### Returns

`number`

***

### number()

```ts
Invoice number -- positions 25..33 / Numero da nota -- posicoes 25..33
```

Defined in: [value-objects/access-key.ts:100](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/access-key.ts#L100)


#### Returns

`number`

***

### numericCode()

```ts
Numeric code -- positions 35..42 / Codigo numerico -- posicoes 35..42
```

Defined in: [value-objects/access-key.ts:110](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/access-key.ts#L110)


#### Returns

`string`

***

### series()

```ts
Series number -- positions 22..24 / Numero de serie -- posicoes 22..24
```

Defined in: [value-objects/access-key.ts:95](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/access-key.ts#L95)


#### Returns

`number`

***

### stateCode()

```ts
IBGE state code -- positions 0..1 / Codigo IBGE do estado -- posicoes 0..1
```

Defined in: [value-objects/access-key.ts:75](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/access-key.ts#L75)


#### Returns

`string`

***

### taxId()

```ts
Taxpayer CNPJ -- positions 6..19 / CNPJ do contribuinte -- posicoes 6..19
```

Defined in: [value-objects/access-key.ts:85](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/access-key.ts#L85)


#### Returns

`string`

***

### toString()

```ts
Returns the raw 44-digit string. / Retorna a string de 44 digitos.
```

Defined in: [value-objects/access-key.ts:120](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/access-key.ts#L120)


#### Returns

`string`

***

### yearMonth()

```ts
Year + month (AAMM) -- positions 2..5 / Ano + mes (AAMM) -- posicoes 2..5
```

Defined in: [value-objects/access-key.ts:80](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/access-key.ts#L80)


#### Returns

`string`
