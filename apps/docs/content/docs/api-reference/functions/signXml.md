---
layout: docs
title: "signXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / signXml



```ts
function signXml(
   xml, 
   privateKeyPem, 
   certificatePem): string;
```

Defined in: [certificate.ts:70](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/certificate.ts#L70)

Sign an NF-e XML string with XMLDSig enveloped signature using xml-crypto.
Covers \<infNFe\> with C14N canonicalization, SHA-1 digest, RSA-SHA1 signature.

Cobre \<infNFe\> com canonização C14N, digest SHA-1 e assinatura RSA-SHA1.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |

## Returns

`string`
