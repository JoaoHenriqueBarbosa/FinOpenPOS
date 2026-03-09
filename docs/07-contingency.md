# Contingency Modes

## Overview

When the primary SEFAZ web service is unavailable, NF-e/NFC-e can still be issued using contingency modes. Brazil has three contingency types, each with different rules for NF-e vs NFC-e.

**Files**: `contingency.ts`, `contingency-nfe.ts`, `epec-nfce.ts`

## Contingency Types

| Type | tpEmis | Model | Description |
|------|--------|-------|-------------|
| SVC-AN | 6 | NF-e (55) | Sefaz Virtual de Contingencia - Ambiente Nacional |
| SVC-RS | 7 | NF-e (55) | Sefaz Virtual de Contingencia - Rio Grande do Sul |
| EPEC | 9 | NFC-e (65) | Evento Previo de Emissao em Contingencia |

### State → contingency mapping

Each state has a default contingency type for NF-e:

```
SVC-AN: AC, AL, AP, CE, DF, ES, MA, MG, PA, PB, PI, RJ, RN, RO, RR, RS, SC, SE, SP, TO
SVC-RS: AM, BA, GO, MS, MT, PE, PR
```

NFC-e always uses EPEC (offline, model 65 only).

## Contingency Class (`contingency.ts`)

Manages contingency state (activate/deactivate):

```typescript
class Contingency {
  type: ContingencyTypeName;  // "SVCAN" | "SVCRS" | ""
  motive: string;             // reason for activating contingency
  timestamp: number;          // activation unix timestamp
  tpEmis: EmissionType;       // 1 (normal), 6, 7, or 9

  activate(uf: string, motive: string): string   // returns JSON config
  deactivate(): string                           // resets to normal

  load(json: string): void    // restore from persisted state
  toJSON(): string            // persist current state
}
```

### State resolution

```typescript
Contingency.activate("SP", "SEFAZ indisponivel")
// → type="SVCAN", tpEmis=6, timestamp=now
```

## NF-e Contingency (`contingency-nfe.ts`)

### adjustNfeForContingency

```typescript
function adjustNfeForContingency(xml: string, contingency: Contingency): string
```

Modifies an existing NF-e XML to switch from normal (tpEmis=1) to contingency mode:

1. Validate model is 55 (not NFC-e)
2. Check current tpEmis — skip if already in contingency
3. Extract fields needed for access key recalculation (cUF, cNF, nNF, serie, dhEmi)
4. Replace `<tpEmis>1</tpEmis>` → `<tpEmis>6</tpEmis>` (or 7)
5. Insert/update `<dhCont>` (contingency activation timestamp) and `<xJust>` (reason)
6. Recalculate the access key (new tpEmis changes the check digit)
7. Update `<infNFe Id="NFe{newKey}">` and `<chNFe>` in QR code if present

### Timezone handling

The contingency timestamp is formatted using the original NF-e's timezone offset (extracted from `dhEmi`):

```typescript
formatDateWithOffset(contDate, tzOffset)
// → "2026-03-08T14:30:00-03:00"
```

## NFC-e EPEC (`epec-nfce.ts`)

### buildEpecNfceXml

```typescript
function buildEpecNfceXml(
  nfceXml: string,          // the original NFC-e XML
  config: EpecNfceConfig,
  verAplic?: string
): string
```

Builds an EPEC event (tpEvento=110140) from an existing NFC-e XML:

1. Parse the NFC-e XML using `fast-xml-parser`
2. Validate: must be tpEmis=4 (EPEC contingency), must have dhCont and xJust
3. Extract access key from `<infNFe Id="NFe...">`
4. Validate UF match between config and access key
5. Extract fiscal data: dhEmi, tpNF, IE, dest info, vNF, vICMS
6. Build tagAdic with cOrgaoAutor, tpAutor, verAplic, dhEmi, tpNF, IE, dest, vNF, vICMS
7. Build event envelope using `buildEventId()` and `defaultLotId()` from shared helpers

### EPEC flow in practice

```
1. NFC-e issued offline (tpEmis=9, saved locally)
2. When connection returns: buildEpecNfceXml() → sign → send to SEFAZ
3. SEFAZ registers the EPEC event
4. Later: re-send the original NFC-e for full authorization
```

### Status check

```typescript
buildEpecNfceStatusXml(config, uf?, tpAmb?)
```

Checks EPEC service status. Only available in SP (Sao Paulo).

## Contingency in the Invoice Service

The `issueInvoice()` function handles contingency as a fallback:

```typescript
// Simplified flow:
try {
  response = await sendToSefaz(signedXml, settings, model);
} catch {
  if (model === 65) {
    // NFC-e: save as contingency, sync later
    status = "contingency";
  } else {
    throw; // NF-e: caller must handle
  }
}
```

The `syncPendingInvoices()` function later retries contingency invoices.
