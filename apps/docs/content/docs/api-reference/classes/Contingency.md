---
layout: docs
title: "Contingency"
---

[@finopenpos/fiscal](/docs/api-reference/index) / Contingency



Defined in: [contingency.ts:62](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/contingency.ts#L62)

Manages NF-e/NFC-e contingency mode activation and deactivation.


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
motive: string = "";
```

Defined in: [contingency.ts:66](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/contingency.ts#L66)


***

### timestamp

```ts
timestamp: number = 0;
```

Defined in: [contingency.ts:68](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/contingency.ts#L68)


***

### tpEmis

```ts
tpEmis: EmissionType = 1;
```

Defined in: [contingency.ts:70](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/contingency.ts#L70)


***

### type

```ts
type: ContingencyTypeName = "";
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

Activate contingency mode for the given state.


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

Deactivate contingency mode (reset to normal emission).


#### Returns

`string`

***

### load()

```ts
load(json): void;
```

Defined in: [contingency.ts:84](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/contingency.ts#L84)

Load contingency configuration from a JSON string.


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

Return a JSON string representation of the current contingency config.


#### Returns

`string`
