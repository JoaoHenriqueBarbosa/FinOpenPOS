---
layout: docs
title: "TaxId"
---

[@finopenpos/fiscal](/docs/api-reference/index) / TaxId



Defined in: [value-objects/tax-id.ts:14](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/tax-id.ts#L14)

Wrapper imutavel para CPF ou CNPJ com formatacao e helpers XML.


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
Check if value is a CNPJ (more than 11 digits). / Verifica se o valor e um CNPJ (mais de 11 digitos).
```

Defined in: [value-objects/tax-id.ts:23](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/tax-id.ts#L23)


#### Returns

`boolean`

***

### isCpf()

```ts
A CPF has at most 11 digits; a CNPJ has 14. / CPF tem no maximo 11 digitos; CNPJ tem 14.
```

Defined in: [value-objects/tax-id.ts:18](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/tax-id.ts#L18)


#### Returns

`boolean`

***

### padded()

```ts
Zero-padded to 11 (CPF) or 14 (CNPJ) digits. / Preenchido com zeros ate 11 (CPF) ou 14 (CNPJ) digitos.
```

Defined in: [value-objects/tax-id.ts:33](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/tax-id.ts#L33)


#### Returns

`string`

***

### tagName()

```ts
Returns "CPF" or "CNPJ" -- ready to use as an XML tag name. / Retorna "CPF" ou "CNPJ" -- pronto para uso como tag XML.
```

Defined in: [value-objects/tax-id.ts:28](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/tax-id.ts#L28)


#### Returns

`"CNPJ"` \| `"CPF"`

***

### toString()

```ts
Raw value, unpadded. / Valor bruto, sem preenchimento.
```

Defined in: [value-objects/tax-id.ts:45](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/tax-id.ts#L45)


#### Returns

`string`

***

### toXmlTag()

```ts
Inline XML fragment: `<CPF>00012345678</CPF>` or `<CNPJ>...`. / Fragmento XML inline: `<CPF>...` ou `<CNPJ>...`.
```

Defined in: [value-objects/tax-id.ts:40](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/value-objects/tax-id.ts#L40)


#### Returns

`string`
