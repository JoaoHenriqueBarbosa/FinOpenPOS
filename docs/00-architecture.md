# Fiscal Module Architecture

## Overview

The fiscal module implements complete Brazilian electronic invoicing (NF-e model 55 and NFC-e model 65) following the SEFAZ MOC 4.00 specification. It was ported from the PHP [sped-nfe](https://github.com/nfephp-org/sped-nfe) library to TypeScript, adapted to a DDD (Domain-Driven Design) layered architecture.

### Monorepo Structure

The project uses a Turborepo monorepo. The pure fiscal logic lives in a standalone package (`@finopenpos/fiscal`) at `packages/fiscal/`, with zero database dependencies. The DB-coupled files (repositories and invoice service) live in the app layer at `apps/web/src/lib/`.

- **`packages/fiscal/src/`** — standalone fiscal package (domain logic, XML, SEFAZ, etc.)
- **`apps/web/src/lib/`** — DB-coupled service/repository files (invoice-service, invoice-repository, fiscal-settings-repository)
- **`apps/web/src/`** — Next.js app (pages, tRPC routers, etc.)

## Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Presentation Layer (apps/web/)                              │
│  fiscal/page.tsx, fiscal/[id]/page.tsx, settings/page.tsx   │
│  FormTextField, invoiceStatusBadgeVariant                   │
├─────────────────────────────────────────────────────────────┤
│  Application Layer (apps/web/src/lib/trpc/)                  │
│  routers/fiscal.ts, routers/fiscal-settings.ts              │
├─────────────────────────────────────────────────────────────┤
│  Domain Services (apps/web/src/lib/)                         │
│  invoice-service.ts (orchestrates the invoice lifecycle)    │
├─────────────────────────────────────────────────────────────┤
│  Domain Logic (packages/fiscal/src/)                         │
│  tax-icms.ts, tax-pis-cofins-ipi.ts, tax-issqn.ts          │
│  value-objects/access-key.ts, value-objects/tax-id.ts       │
│  tax-element.ts (decoupling pattern)                        │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure (packages/fiscal/src/)                       │
│  xml-builder.ts, xml-utils.ts, complement.ts                │
│  sefaz-transport.ts, sefaz-request-builders.ts              │
│  sefaz-response-parsers.ts, sefaz-urls.ts                   │
│  certificate.ts, qrcode.ts, contingency.ts                  │
│  convert.ts, txt-structures.ts                              │
├─────────────────────────────────────────────────────────────┤
│  Persistence (apps/web/src/lib/)                             │
│  fiscal-settings-repository.ts, invoice-repository.ts       │
│  Drizzle ORM + PGLite (apps/web/src/lib/db/schema.ts)       │
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

All files in the **`@finopenpos/fiscal`** package live under `packages/fiscal/src/`. The three DB-coupled files live in `apps/web/src/lib/`.

| File | Location | Layer | Purpose |
|------|----------|-------|---------|
| `types.ts` | `packages/fiscal/src/` | Domain | All type definitions |
| `constants.ts` | `packages/fiscal/src/` | Domain | XML namespaces, payment codes |
| `state-codes.ts` | `packages/fiscal/src/` | Domain | UF ↔ IBGE code mapping |
| `sefaz-status-codes.ts` | `packages/fiscal/src/` | Domain | cStat response codes |
| `value-objects/access-key.ts` | `packages/fiscal/src/` | Domain | 44-digit access key |
| `value-objects/tax-id.ts` | `packages/fiscal/src/` | Domain | CPF/CNPJ value object |
| `format-utils.ts` | `packages/fiscal/src/` | Domain | Cents/rate formatting |
| `tax-element.ts` | `packages/fiscal/src/` | Domain | TaxElement decoupling pattern |
| `tax-icms.ts` | `packages/fiscal/src/` | Domain | ICMS tax (15+ variants) |
| `tax-pis-cofins-ipi.ts` | `packages/fiscal/src/` | Domain | PIS, COFINS, IPI, II |
| `tax-issqn.ts` | `packages/fiscal/src/` | Domain | ISS (services) |
| `tax-is.ts` | `packages/fiscal/src/` | Domain | IS (consumption) |
| `xml-utils.ts` | `packages/fiscal/src/` | Infra | tag(), escapeXml(), extractXmlTagValue() |
| `xml-builder.ts` | `packages/fiscal/src/` | Infra | Full NF-e XML generation |
| `complement.ts` | `packages/fiscal/src/` | Infra | Protocol attachment |
| `certificate.ts` | `packages/fiscal/src/` | Infra | PFX extraction, XML signing |
| `sefaz-urls.ts` | `packages/fiscal/src/` | Infra | State endpoint registry |
| `sefaz-transport.ts` | `packages/fiscal/src/` | Infra | SOAP HTTP + mTLS via curl |
| `sefaz-request-builders.ts` | `packages/fiscal/src/` | Infra | Request XML generators |
| `sefaz-response-parsers.ts` | `packages/fiscal/src/` | Infra | Response parsing |
| `sefaz-event-types.ts` | `packages/fiscal/src/` | Infra | Event constants + helpers |
| `sefaz-reform-events.ts` | `packages/fiscal/src/` | Infra | IBS/CBS reform events |
| `contingency.ts` | `packages/fiscal/src/` | Infra | Offline fallback config |
| `contingency-nfe.ts` | `packages/fiscal/src/` | Infra | NF-e contingency adjustments |
| `epec-nfce.ts` | `packages/fiscal/src/` | Infra | NFC-e EPEC registration |
| `qrcode.ts` | `packages/fiscal/src/` | Infra | NFC-e QR code generation |
| `convert.ts` | `packages/fiscal/src/` | Infra | TXT ↔ XML conversion |
| `txt-structures.ts` | `packages/fiscal/src/` | Infra | TXT field layouts |
| `valid-txt.ts` | `packages/fiscal/src/` | Infra | TXT validation |
| `standardize.ts` | `packages/fiscal/src/` | Infra | XML type detection |
| `gtin.ts` | `packages/fiscal/src/` | Infra | Barcode validation |
| `cep-lookup.ts` | `packages/fiscal/src/` | Infra | CEP/postal code lookup |
| `config-validate.ts` | `packages/fiscal/src/` | Infra | Config JSON validation |
| `invoice-service.ts` | `apps/web/src/lib/` | Service | Invoice lifecycle orchestration |
| `fiscal-settings-repository.ts` | `apps/web/src/lib/` | Persistence | Settings CRUD |
| `invoice-repository.ts` | `apps/web/src/lib/` | Persistence | Invoice CRUD |
