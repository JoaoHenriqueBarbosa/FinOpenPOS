# NFC-e QR Code

## Overview

Every NFC-e (model 65) must include a QR code for consumer verification. The QR code encodes a URL that allows checking the invoice's authenticity on the SEFAZ portal. Two versions exist: v2.00 (legacy) and v3.00 (NT 2025.001, RSA signature).

**File**: `qrcode.ts`

## Entry Point

```typescript
function buildNfceQrCodeUrl(params: NfceQrCodeParams): string
```

### Parameters

```typescript
interface NfceQrCodeParams {
  accessKey: string;          // 44-digit chave de acesso
  environment: SefazEnvironment;  // 1 or 2
  emissionType: EmissionType;     // 1 (online) or 9 (offline)
  cscId: string;              // CSC identifier (registered with SEFAZ)
  cscToken: string;           // CSC secret token
  signedXml?: string;         // required for offline mode
  stateCode: string;          // UF (e.g. "SP")
  version?: "v200" | "v300";  // default "v200"
}
```

## Version 2.00 (Default)

### Online mode (tpEmis=1)

```
{baseUrl}?p={accessKey}|{version}|{tpAmb}|{cscId}|{hash}
```

- `hash` = SHA-1 hex of `{accessKey}|{version}|{tpAmb}|{cscId}{cscToken}`

### Offline mode (tpEmis=9)

```
{baseUrl}?p={accessKey}|{version}|{tpAmb}|{dhEmi}|{vNF}|{digVal}|{cscId}|{hash}
```

Additional fields extracted from the signed XML:
- `dhEmi` — emission datetime (hex-encoded)
- `vNF` — total value
- `digVal` — digest value from the XML signature (hex-encoded)
- `hash` = SHA-1 hex of all concatenated fields + CSC token

## Version 3.00 (NT 2025.001)

### Online mode

```
{baseUrl}?p={accessKey}|{version}|{tpAmb}|{cscId}|{hash}
```

- `hash` = SHA-256 hex (upgrade from SHA-1)

### Offline mode

Same as v2.00 offline but with SHA-256 hash.

## Base URLs

Each state has a specific QR code verification URL. Example:

| State | Production URL |
|-------|---------------|
| SP | `https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/...` |
| RJ | `https://www.nfce.fazenda.rj.gov.br/consulta` |
| RS | `https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx` |

URLs differ between production and homologation environments.

## CSC (Codigo de Seguranca do Contribuinte)

The CSC is a secret token registered by the company with SEFAZ. It consists of:
- `cscId` — numeric identifier (e.g. "1")
- `cscToken` — secret string (e.g. "A8B1C2D3E4F5...")

The CSC is never transmitted in the QR code — only used to compute the hash. The SEFAZ portal verifies the hash using its copy of the CSC.

## XML Integration

The QR code URL is embedded in the NF-e XML inside `<infNFeSupl>`:

```xml
<infNFeSupl>
  <qrCode><![CDATA[https://www.nfce.fazenda.sp.gov.br/...?p=35...]]></qrCode>
  <urlChave>https://www.nfce.fazenda.sp.gov.br/consulta</urlChave>
</infNFeSupl>
```

The `xml-builder.ts` calls `buildNfceQrCodeUrl()` for model 65 invoices and inserts the result.

## Printing (DANFCE)

The QR code URL is printed on the DANFCE (Documento Auxiliar da NFC-e) — the consumer receipt. It allows consumers to verify the invoice by scanning with any QR code reader.
