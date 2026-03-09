# Fiscal Module Architecture

## Overview

The fiscal module (`src/lib/fiscal/`) implements complete Brazilian electronic invoicing (NF-e model 55 and NFC-e model 65) following the SEFAZ MOC 4.00 specification. It was ported from the PHP [sped-nfe](https://github.com/nfephp-org/sped-nfe) library to TypeScript, adapted to a DDD (Domain-Driven Design) layered architecture.

## Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Presentation Layer                                         │
│  fiscal/page.tsx, fiscal/[id]/page.tsx, settings/page.tsx   │
│  FormTextField, invoiceStatusBadgeVariant                   │
├─────────────────────────────────────────────────────────────┤
│  Application Layer (tRPC routers)                           │
│  routers/fiscal.ts, routers/fiscal-settings.ts              │
├─────────────────────────────────────────────────────────────┤
│  Domain Services                                            │
│  invoice-service.ts (orchestrates the invoice lifecycle)    │
├─────────────────────────────────────────────────────────────┤
│  Domain Logic                                               │
│  tax-icms.ts, tax-pis-cofins-ipi.ts, tax-issqn.ts          │
│  value-objects/access-key.ts, value-objects/tax-id.ts       │
│  tax-element.ts (decoupling pattern)                        │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure                                             │
│  xml-builder.ts, xml-utils.ts, complement.ts                │
│  sefaz-transport.ts, sefaz-request-builders.ts              │
│  sefaz-response-parsers.ts, sefaz-urls.ts                   │
│  certificate.ts, qrcode.ts, contingency.ts                  │
│  convert.ts, txt-structures.ts                              │
├─────────────────────────────────────────────────────────────┤
│  Persistence                                                │
│  fiscal-settings-repository.ts, invoice-repository.ts       │
│  Drizzle ORM + PGLite (schema.ts)                           │
└─────────────────────────────────────────────────────────────┘
```

## Dependency Flow

```
invoice-service
├── fiscal-settings-repository ──→ DB (fiscalSettings)
├── invoice-repository ──→ DB (invoices, invoiceItems, invoiceEvents)
├── certificate.ts ──→ node:crypto, xml-crypto
├── xml-builder.ts
│   ├── tax-icms.ts ──→ tax-element.ts
│   ├── tax-pis-cofins-ipi.ts ──→ tax-element.ts
│   ├── value-objects/ (AccessKey, TaxId)
│   ├── xml-utils.ts (tag, escapeXml)
│   └── format-utils.ts
├── sefaz-client.ts
│   ├── sefaz-transport.ts ──→ curl (mTLS)
│   ├── sefaz-request-builders.ts
│   ├── sefaz-response-parsers.ts
│   └── sefaz-urls.ts
├── complement.ts (protocol attachment)
└── qrcode.ts (NFC-e QR code)
```

**Key rule**: Tax modules (domain) never import xml-builder (infrastructure). They return `TaxElement` structures, which xml-builder serializes. This prevents circular dependencies and keeps domain logic pure.

## Numeric Conventions

| Concept | Storage | Example | XML Output |
|---------|---------|---------|------------|
| Monetary (vBC, vICMS, vNF) | Cents (integer) | `1050` | `"10.50"` |
| ICMS/FCP rates (pICMS, pFCP) | Hundredths (4dp) | `180000` | `"18.0000"` |
| PIS/COFINS rates (pPIS) | ×10000 (4dp) | `16500` | `"1.6500"` |
| Quantities | ×1000 (3dp) | `1500` | `"1.500"` |

## Key Domain Types

| Type | Values | Meaning |
|------|--------|---------|
| `InvoiceModel` | `55`, `65` | NF-e (B2B), NFC-e (consumer) |
| `InvoiceStatus` | `pending`, `authorized`, `rejected`, `cancelled`, `denied`, `contingency`, `voided` | Lifecycle states |
| `SefazEnvironment` | `1`, `2` | Production, Homologation |
| `EmissionType` | `1`, `6`, `7`, `9` | Normal, SVC-AN, SVC-RS, Offline |
| `TaxRegime` | `1`, `2`, `3` | Simples Nacional, Simples excess, Normal |

## Multi-Tenancy

All database tables are keyed by `user_uid`. Every repository function receives `userUid` as first parameter. There is no cross-tenant data access.

## File Index

| File | Layer | Purpose |
|------|-------|---------|
| `types.ts` | Domain | All type definitions |
| `constants.ts` | Domain | XML namespaces, payment codes |
| `state-codes.ts` | Domain | UF ↔ IBGE code mapping |
| `sefaz-status-codes.ts` | Domain | cStat response codes |
| `value-objects/access-key.ts` | Domain | 44-digit access key |
| `value-objects/tax-id.ts` | Domain | CPF/CNPJ value object |
| `format-utils.ts` | Domain | Cents/rate formatting |
| `tax-element.ts` | Domain | TaxElement decoupling pattern |
| `tax-icms.ts` | Domain | ICMS tax (15+ variants) |
| `tax-pis-cofins-ipi.ts` | Domain | PIS, COFINS, IPI, II |
| `tax-issqn.ts` | Domain | ISS (services) |
| `tax-is.ts` | Domain | IS (consumption) |
| `xml-utils.ts` | Infra | tag(), escapeXml(), extractXmlTagValue() |
| `xml-builder.ts` | Infra | Full NF-e XML generation |
| `complement.ts` | Infra | Protocol attachment |
| `certificate.ts` | Infra | PFX extraction, XML signing |
| `sefaz-urls.ts` | Infra | State endpoint registry |
| `sefaz-transport.ts` | Infra | SOAP HTTP + mTLS via curl |
| `sefaz-request-builders.ts` | Infra | Request XML generators |
| `sefaz-response-parsers.ts` | Infra | Response parsing |
| `sefaz-event-types.ts` | Infra | Event constants + helpers |
| `sefaz-reform-events.ts` | Infra | IBS/CBS reform events |
| `contingency.ts` | Infra | Offline fallback config |
| `contingency-nfe.ts` | Infra | NF-e contingency adjustments |
| `epec-nfce.ts` | Infra | NFC-e EPEC registration |
| `qrcode.ts` | Infra | NFC-e QR code generation |
| `convert.ts` | Infra | TXT ↔ XML conversion |
| `txt-structures.ts` | Infra | TXT field layouts |
| `valid-txt.ts` | Infra | TXT validation |
| `standardize.ts` | Infra | XML type detection |
| `gtin.ts` | Infra | Barcode validation |
| `cep-lookup.ts` | Infra | CEP/postal code lookup |
| `config-validate.ts` | Infra | Config JSON validation |
| `invoice-service.ts` | Service | Invoice lifecycle orchestration |
| `fiscal-settings-repository.ts` | Persistence | Settings CRUD |
| `invoice-repository.ts` | Persistence | Invoice CRUD |
