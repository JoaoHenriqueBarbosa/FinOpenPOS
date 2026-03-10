---
layout: docs
title: "Contingency"
---

[@finopenpos/fiscal](/docs/api-reference/index) / Contingency



Defined in: [contingency.ts:62](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/contingency.ts#L62)

Gerencia ativacao e desativacao do modo de contingencia NF-e/NFC-e.


## Constructors

### Constructor

```ts
new Contingency(json?): Contingency;
```

Defined in: [contingency.ts:72](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/contingency.ts#L72)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `json?` | `string` |

#### Returns

`Contingency`

## Properties

### motive

```ts
Justification motive / Motivo da justificativa
```

Defined in: [contingency.ts:66](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/contingency.ts#L66)


***

### timestamp

```ts
Activation timestamp / Timestamp da ativacao
```

Defined in: [contingency.ts:68](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/contingency.ts#L68)


***

### tpEmis

```ts
Emission type code / Codigo do tipo de emissao
```

Defined in: [contingency.ts:70](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/contingency.ts#L70)


***

### type

```ts
Current contingency type / Tipo de contingencia atual
```

Defined in: [contingency.ts:64](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/contingency.ts#L64)


## Methods

### activate()

```ts
activate(
   acronym, 
   motive, 
   forcedType?): string;
```

Defined in: [contingency.ts:102](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/contingency.ts#L102)

Ativa o modo de contingencia para o estado informado.


#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `acronym` | `string` | State abbreviation (e.g. "SP", "RS") |
| `motive` | `string` | Justification (15-255 UTF-8 characters) |
| `forcedType?` | `string` | Optional override: "SVCAN" or "SVCRS" |

#### Returns

`string`

JSON string with the contingency configuration

***

### deactivate()

```ts
deactivate(): string;
```

Defined in: [contingency.ts:142](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/contingency.ts#L142)

Desativa o modo de contingencia (retorna a emissao normal).


#### Returns

`string`

***

### load()

```ts
load(json): void;
```

Defined in: [contingency.ts:84](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/contingency.ts#L84)

Carrega configuracao de contingencia a partir de uma string JSON.


#### Parameters

| Parameter | Type |
| ------ | ------ |
| `json` | `string` |

#### Returns

`void`

***

### toString()

```ts
toString(): string;
```

Defined in: [contingency.ts:155](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/contingency.ts#L155)

Retorna representacao JSON da configuracao de contingencia atual.


#### Returns

`string`
