---
layout: docs
title: "signEventXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / signEventXml



```ts
function signEventXml(
   xml, 
   privateKeyPem, 
   certificatePem): string;
```

Defined in: [certificate.ts:122](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/certificate.ts#L122)

Sign a SEFAZ event XML (cancelamento, CCe, etc.) with XMLDSig.
Assina um XML de evento SEFAZ (cancelamento, CCe, etc.) com XMLDSig.

Mesmo algoritmo de signXml(), mas referencia \<infEvento\> dentro de \<evento\>.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `xml` | `string` |  |
| `privateKeyPem` | `string` |  |
| `certificatePem` | `string` |  |

## Returns

`string`
