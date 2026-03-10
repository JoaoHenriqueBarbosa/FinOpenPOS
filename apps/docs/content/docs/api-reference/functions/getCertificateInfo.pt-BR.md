---
layout: docs
title: "getCertificateInfo()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / getCertificateInfo



```ts
function getCertificateInfo(pfxBuffer, passphrase): CertificateInfo;
```

Defined in: [certificate.ts:40](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/certificate.ts#L40)

Extrai informações do certificado para exibição (sem expor a chave privada).


## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `pfxBuffer` | `Buffer` |  |
| `passphrase` | `string` |  |

## Returns

[`CertificateInfo`](/docs/api-reference/interfaces/CertificateInfo)
