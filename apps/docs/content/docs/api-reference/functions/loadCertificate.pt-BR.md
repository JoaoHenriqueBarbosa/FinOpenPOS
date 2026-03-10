---
layout: docs
title: "loadCertificate()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / loadCertificate



```ts
function loadCertificate(pfxBuffer, passphrase): CertificateData;
```

Defined in: [certificate.ts:15](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/certificate.ts#L15)

Carrega chave privada e certificado a partir de um buffer PFX/PKCS12.


## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `pfxBuffer` | `Buffer` |  |
| `passphrase` | `string` |  |

## Returns

[`CertificateData`](/docs/api-reference/interfaces/CertificateData)
