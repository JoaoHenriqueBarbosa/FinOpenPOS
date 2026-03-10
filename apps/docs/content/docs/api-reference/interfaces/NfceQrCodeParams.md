---
layout: docs
title: "NfceQrCodeParams"
---

[@finopenpos/fiscal](/docs/api-reference/index) / NfceQrCodeParams



Defined in: [qrcode.ts:26](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L26)

Parameters for building an NFC-e QR Code URL.


## Properties

### accessKey

```ts
accessKey: string;
```

Defined in: [qrcode.ts:28](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L28)


***

### cscId?

```ts
optional cscId: string;
```

Defined in: [qrcode.ts:40](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L40)


***

### cscToken?

```ts
optional cscToken: string;
```

Defined in: [qrcode.ts:38](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L38)


***

### destDocument?

```ts
optional destDocument: string;
```

Defined in: [qrcode.ts:50](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L50)


***

### destIdType?

```ts
optional destIdType: DestIdType;
```

Defined in: [qrcode.ts:52](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L52)


***

### digestValue?

```ts
optional digestValue: string;
```

Defined in: [qrcode.ts:48](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L48)


***

### emissionType

```ts
emissionType: EmissionType;
```

Defined in: [qrcode.ts:34](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L34)


***

### environment

```ts
environment: SefazEnvironment;
```

Defined in: [qrcode.ts:32](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L32)


***

### issuedAt?

```ts
optional issuedAt: string;
```

Defined in: [qrcode.ts:42](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L42)


***

### qrCodeBaseUrl

```ts
qrCodeBaseUrl: string;
```

Defined in: [qrcode.ts:36](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L36)


***

### signFn()?

```ts
optional signFn: (payload) => string | Promise<string>;
```

Defined in: [qrcode.ts:54](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L54)


#### Parameters

| Parameter | Type |
| ------ | ------ |
| `payload` | `string` |

#### Returns

`string` \| `Promise`\<`string`\>

***

### totalIcms?

```ts
optional totalIcms: string;
```

Defined in: [qrcode.ts:46](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L46)


***

### totalValue?

```ts
optional totalValue: string;
```

Defined in: [qrcode.ts:44](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L44)


***

### version

```ts
version: QrCodeVersion;
```

Defined in: [qrcode.ts:30](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/qrcode.ts#L30)

