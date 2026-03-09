# Utilities & Helpers

## Overview

Supporting modules that provide validation, lookup, detection, and formatting services to the fiscal module.

**Files**: `gtin.ts`, `standardize.ts`, `cep-lookup.ts`, `config-validate.ts`, `state-codes.ts`, `sefaz-status-codes.ts`

## GTIN Validation (`gtin.ts`)

Validates barcode numbers (GTIN-8, GTIN-12, GTIN-13, GTIN-14) used in the `<cEAN>` and `<cEANTrib>` fields of NF-e items.

```typescript
function isValidGtin(gtin: string): boolean
```

- Empty string or `"SEM GTIN"` → valid (exempt products)
- Non-numeric → throws
- Invalid length (not 8/12/13/14) → false
- Check digit validation using standard GTIN algorithm (alternating weights 1/3)

## XML Standardize (`standardize.ts`)

Detects the type of an NF-e XML document and provides conversion utilities.

```typescript
function whichIs(xml: string): string    // root tag name
function toJson(xml: string): string     // XML → JSON string
function toArray(xml: string): object    // XML → parsed object
function toStd(xml: string): object      // XML → standard object
```

Recognizes 37+ root tags: `NFe`, `nfeProc`, `retConsSitNFe`, `retEnviNFe`, `procEventoNFe`, `distDFeInt`, `resNFe`, `resEvento`, etc.

Uses `fast-xml-parser` internally.

## CEP Lookup (`cep-lookup.ts`)

Auto-fills address fields from a Brazilian postal code (CEP).

```typescript
async function lookupCep(cep: string): Promise<CepResult | null>
```

**Strategy**: Tries ViaCEP first, falls back to BrasilAPI:

1. `https://viacep.com.br/ws/{cep}/json/`
2. `https://brasilapi.com.br/api/cep/v2/{cep}` (fallback)

Returns: `{ street, district, cityName, cityCode, stateCode }` or null.

Used by the fiscal settings page for address auto-completion.

## Config Validation (`config-validate.ts`)

Validates a JSON configuration string for fiscal setup:

```typescript
function validate(content: string): FiscalConfig
```

Required fields: `tpAmb`, `razaosocial`, `siglaUF`, `cnpj`, `schemes`, `versao`.
Optional: `CSC`, `CSCid`, `proxy`, `tokenIBPT`.

Used by migration/setup tooling, not the main invoice flow.

## State Codes (`state-codes.ts`)

Bidirectional mapping between state abbreviations (UF) and IBGE numeric codes:

```typescript
const STATE_IBGE_CODES: Record<string, string>  // "SP" → "35"
const IBGE_TO_UF: Record<string, string>         // "35" → "SP"

function getStateCode(uf: string): string         // throws if unknown
function getStateByCode(code: string): string     // throws if unknown
```

All 27 Brazilian states + DF are covered. Used by xml-builder (access key construction), sefaz-urls (endpoint resolution), and contingency modules.

## SEFAZ Status Codes (`sefaz-status-codes.ts`)

Named constants for common SEFAZ response codes (cStat):

```typescript
const SEFAZ_STATUS = {
  AUTHORIZED: 100,            // NF-e authorized
  AUTHORIZED_OUT_OF_TIME: 150,// Authorized but out of time window
  DENIED: 110,                // NF-e denied
  DUPLICATE: 204,             // Duplicate NF-e
  ALREADY_CANCELLED: 205,     // Already cancelled
  SERVICE_RUNNING: 107,       // Status service online
  EVENT_REGISTERED: 135,      // Event registered successfully
  EVENT_ALREADY_REGISTERED: 136,
  // ... more codes
};

const VALID_PROTOCOL_STATUSES = [100, 150, 110, 205, 301, 302, 303];
const VALID_EVENT_STATUSES = [135, 136, 155];
```

Used by invoice-service (determine outcome), complement (validate protocol), and response parsers.
