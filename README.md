# FinOpenPOS

Open-source Point of Sale (POS) and inventory management system with **Brazilian fiscal module** (NF-e/NFC-e). Built with Next.js 16, React 19 and embedded PostgreSQL via PGLite. Zero external dependencies to run — `bun dev` and you're set.

> **[Leia em Portugues](README.ptBR.md)**

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [Fiscal Module (NF-e / NFC-e)](#fiscal-module-nf-e--nfc-e)
  - [Invoice Lifecycle](#invoice-lifecycle)
  - [Tax Engine](#tax-engine)
  - [SEFAZ Communication](#sefaz-communication)
  - [Detailed Documentation](#detailed-documentation)
- [API](#api)
  - [Interactive Docs](#interactive-docs)
  - [tRPC Procedures](#trpc-procedures)
- [Testing](#testing)
- [Docker Deploy](#docker-deploy)
- [Database](#database)
  - [Schema](#schema)
  - [PGLite (default)](#pglite-default)
  - [Migrating to PostgreSQL](#migrating-to-postgresql)
- [Contributing](#contributing)
- [License](#license)

## Features

### Business
- **Dashboard** with interactive charts (revenue, expenses, cash flow, profit margin)
- **Product Management** with categories and stock control
- **Customer Management** with active/inactive status
- **Order Management** with items, totals and status tracking
- **Point of Sale (POS)** for quick sales processing
- **Cashier** with income and expense transaction logging
- **Authentication** with email/password via Better Auth
- **API Documentation** auto-generated interactive docs via Scalar at `/api/docs`

### Fiscal (Brazilian NF-e / NFC-e)
- **Electronic Invoicing** — NF-e (model 55, B2B) and NFC-e (model 65, consumer)
- **Tax Calculations** — ICMS (15 CST + 10 CSOSN), PIS, COFINS, IPI, II, ISSQN
- **SEFAZ Integration** — authorize, cancel, void, query with mTLS client certificate
- **Digital Signature** — XML signing with A1 e-CNPJ certificate (PFX/PKCS#12)
- **QR Code** — NFC-e QR code generation (v2.00/v3.00, online + offline)
- **Contingency** — SVC-AN, SVC-RS (NF-e) and EPEC (NFC-e) offline modes
- **IBS/CBS Reform Events** — 14 event types for the Brazilian tax reform (PL_010)
- **Settings UI** — company info, address, certificate, CSC, default tax codes
- **CEP Auto-fill** — address completion via ViaCEP + BrasilAPI

## Architecture

```mermaid
flowchart LR
  Browser["Browser\nReact 19"]
  Proxy["proxy.ts\n(session check)"]
  tRPC["tRPC v11\n(superjson)"]
  Auth["Better Auth\n(session cookie)"]
  Drizzle["Drizzle ORM"]
  PGLite["PGLite\n(PostgreSQL WASM)"]
  Scalar["Scalar\n/api/docs"]
  Fiscal["Fiscal Module\n(NF-e / NFC-e)"]
  SEFAZ["SEFAZ\n(tax authority)"]

  Browser -->|HTTP request| Proxy
  Proxy -->|authenticated| tRPC
  Proxy -->|/api/auth/*| Auth
  tRPC -->|protectedProcedure| Drizzle
  tRPC -->|fiscal routes| Fiscal
  Drizzle -->|SQL| PGLite
  tRPC -.->|OpenAPI spec| Scalar
  Auth -->|session| PGLite
  Fiscal -->|build XML + sign| SEFAZ
  Fiscal -->|persist| Drizzle
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, Radix UI, Recharts |
| Database | PGLite (PostgreSQL via WASM) |
| ORM | Drizzle ORM |
| API | tRPC v11 (end-to-end type safety) |
| Auth | Better Auth |
| API Docs | Scalar (OpenAPI 3.0) |
| XML Signing | xml-crypto |
| XML Parsing | fast-xml-parser |
| Runtime | Bun |
| i18n | next-intl (en + pt-BR) |

## Quick Start

```bash
git clone https://github.com/JoaoHenriqueBarbosa/FinOpenPOS.git
cd FinOpenPOS
cp .env.example .env
```

Edit `.env` with a secure secret:

```
BETTER_AUTH_SECRET=generate-with-openssl-rand-base64-32
BETTER_AUTH_URL=http://localhost:3000
```

```bash
bun install
bun run dev
```

Open http://localhost:3000 and use the **Fill demo credentials** button to sign in with the test account (`test@example.com` / `test1234`).

> The first `bun run dev` automatically creates the database at `./data/pglite`, pushes the schema via Drizzle and runs the seed with demo data (20 customers, 32 products, 40 orders, 25 transactions) + ~5570 IBGE cities.

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Validate PGLite, push schema and start dev server |
| `bun run build` | Validate PGLite, push schema and production build |
| `bun run start` | Start the production server |
| `bun run db:push` | Push Drizzle schema to PGLite and regenerate ER diagram |
| `bun run db:ensure` | Detect and auto-clean corrupted PGLite data |
| `bun test` | Run tRPC router tests |
| `bun test src/lib/fiscal/__tests__/` | Run fiscal module tests |
| `bun run test:coverage` | Run tests with coverage report |
| `bun run prepare-prod` | Migrate from PGLite to real PostgreSQL |

## Project Structure

```
src/
├── app/
│   ├── admin/
│   │   ├── fiscal/          # Invoice list, detail, settings pages
│   │   ├── products/        # Product management (with fiscal fields)
│   │   ├── orders/          # Order management
│   │   ├── pos/             # Point of Sale
│   │   └── ...              # Dashboard, customers, cashier
│   ├── api/                 # Auth, tRPC, Scalar docs, OpenAPI spec
│   ├── login/               # Login page
│   └── signup/              # Sign up page
├── components/
│   └── ui/                  # shadcn components + FormTextField
├── lib/
│   ├── db/
│   │   ├── schema.ts        # Drizzle schema (6 business + 4 fiscal + cities)
│   │   └── seed.ts          # Demo data + IBGE cities seed
│   ├── fiscal/              # ← Complete fiscal module (see below)
│   │   ├── __tests__/       # 754 tests (ported from PHP sped-nfe)
│   │   ├── value-objects/   # AccessKey, TaxId
│   │   ├── tax-icms.ts      # ICMS tax engine (25 variants)
│   │   ├── tax-pis-cofins-ipi.ts  # PIS/COFINS/IPI/II
│   │   ├── xml-builder.ts   # NF-e XML generation
│   │   ├── certificate.ts   # PFX extraction + XML signing
│   │   ├── invoice-service.ts     # Invoice lifecycle orchestration
│   │   ├── sefaz-*.ts       # SEFAZ communication layer
│   │   └── ...              # 30+ modules (see docs/)
│   └── trpc/
│       ├── routers/         # Business + fiscal tRPC routers
│       └── ...
├── messages/                # i18n (en.ts, pt-BR.ts)
├── proxy.ts                 # Next.js 16 middleware
└── docs/                    # Detailed fiscal documentation (12 files)
```

## Fiscal Module (NF-e / NFC-e)

The fiscal module implements complete Brazilian electronic invoicing following the SEFAZ MOC 4.00 specification, ported from the PHP [sped-nfe](https://github.com/nfephp-org/sped-nfe) library to TypeScript with DDD architecture.

### Invoice Lifecycle

```mermaid
flowchart TD
  Start([Order placed]) --> LoadSettings[Load fiscal settings\n+ certificate]
  LoadSettings --> BuildXML[Build NF-e/NFC-e XML\nfrom order items]
  BuildXML --> CalcTax[Calculate taxes\nICMS + PIS + COFINS + IPI]
  CalcTax --> GenKey[Generate access key\n44-digit mod-11]
  GenKey --> Sign[Sign XML\nwith A1 e-CNPJ certificate]
  Sign --> SendSEFAZ{Send to SEFAZ}

  SendSEFAZ -->|cStat 100| Authorized[Authorized ✓]
  SendSEFAZ -->|cStat 110| Denied[Denied ✗]
  SendSEFAZ -->|timeout| Contingency{Model?}

  Contingency -->|NFC-e 65| Offline[Save offline\nstatus=contingency]
  Contingency -->|NF-e 55| Error[Throw error]

  Authorized --> AttachProto[Attach protocol\nnfeProc XML]
  AttachProto --> SaveDB[(Save to DB\ninvoice + items)]
  Offline --> SaveDB
  Denied --> SaveDB

  SaveDB --> IncrNumber[Increment\nnext number]

  Authorized -.->|later| Cancel[Cancel invoice]
  Cancel --> EventXML[Build cancellation\nevent XML]
  EventXML --> SignEvent[Sign + send\nto SEFAZ]

  Offline -.->|connection back| Sync[Sync pending\ninvoices]
```

### Tax Engine

```mermaid
flowchart LR
  subgraph Domain["Domain Layer (pure logic)"]
    ICMS["tax-icms.ts\n15 CST + 10 CSOSN"]
    PIS["tax-pis-cofins-ipi.ts\nPIS / COFINS / IPI / II"]
    TE["tax-element.ts\nTaxElement interface"]
  end

  subgraph Infra["Infrastructure Layer"]
    XB["xml-builder.ts\nFull NF-e XML"]
    XU["xml-utils.ts\ntag() + escapeXml()"]
    FU["format-utils.ts\ncents → '10.50'"]
  end

  ICMS -->|returns TaxElement| TE
  PIS -->|returns TaxElement| TE
  TE -->|serializeTaxElement| XB
  XB --> XU
  ICMS --> FU
  PIS --> FU
```

Tax modules never import XML code — they return `TaxElement` structures that the builder serializes. This keeps domain logic pure and testable.

### SEFAZ Communication

```mermaid
sequenceDiagram
  participant App as Invoice Service
  participant Builder as Request Builder
  participant Cert as Certificate
  participant Transport as SEFAZ Transport
  participant SEFAZ as SEFAZ Web Service

  App->>Builder: buildAuthorizationRequestXml(signedNFe)
  App->>Cert: extractCertFromPfx(pfx, password)
  Cert-->>App: PEM cert + key

  App->>Transport: sefazRequest(url, xml, cert, key)
  Transport->>Transport: Build SOAP 1.2 envelope
  Transport->>Transport: Write PEM to temp files
  Transport->>SEFAZ: curl --cert cert.pem --key key.pem (mTLS)
  SEFAZ-->>Transport: SOAP response
  Transport->>Transport: Extract content from SOAP body
  Transport-->>App: { httpStatus, body, content }

  App->>App: parseAuthorizationResponse(content)
  App->>App: attachProtocol(request, response)
```

> **Why curl?** Bun's `node:https` Agent does not support PFX for mTLS. The workaround extracts PEM from PFX via openssl and uses curl for the HTTPS request.

### Detailed Documentation

The [`docs/`](docs/) folder contains 12 in-depth documents:

| Document | Topic |
|----------|-------|
| [00-architecture.md](docs/00-architecture.md) | Layers, dependency graph, numeric conventions |
| [01-tax-engine.md](docs/01-tax-engine.md) | ICMS/PIS/COFINS/IPI, TaxElement pattern |
| [02-xml-generation.md](docs/02-xml-generation.md) | xml-builder, complement, NF-e XML structure |
| [03-sefaz-communication.md](docs/03-sefaz-communication.md) | Transport, URLs, request builders, reform events |
| [04-certificate-signing.md](docs/04-certificate-signing.md) | PFX extraction, XML digital signature |
| [05-value-objects.md](docs/05-value-objects.md) | AccessKey (mod-11), TaxId (CPF/CNPJ) |
| [06-invoice-workflow.md](docs/06-invoice-workflow.md) | Invoice service lifecycle, repositories |
| [07-contingency.md](docs/07-contingency.md) | SVC-AN/SVC-RS, EPEC, offline modes |
| [08-qrcode.md](docs/08-qrcode.md) | NFC-e QR code v2.00/v3.00 |
| [09-txt-conversion.md](docs/09-txt-conversion.md) | SPED TXT legacy format conversion |
| [10-database-schema.md](docs/10-database-schema.md) | Fiscal tables, multi-tenancy |
| [11-utilities.md](docs/11-utilities.md) | GTIN, CEP lookup, state codes |

## API

All API procedures require authentication via Better Auth session cookie. The API uses **tRPC** for end-to-end type safety — frontend components consume procedures directly with full TypeScript inference.

### Interactive Docs

Visit **`/api/docs`** for the full interactive API reference powered by Scalar, auto-generated from the tRPC router definitions.

The raw OpenAPI 3.0 spec is available at `/api/openapi.json`.

### tRPC Procedures

| Router | Procedures | Description |
|--------|-----------|-------------|
| `products` | `list`, `create`, `update`, `delete` | Product CRUD with stock and categories |
| `customers` | `list`, `create`, `update`, `delete` | Customer CRUD with status |
| `orders` | `list`, `create`, `update`, `delete` | Order management with items and transactions |
| `transactions` | `list`, `create`, `update`, `delete` | Income/expense transaction logging |
| `paymentMethods` | `list`, `create`, `update`, `delete` | Payment method management |
| `dashboard` | `stats` | Aggregated revenue, expenses, profit, cash flow, margins |
| `fiscal` | `list`, `getById`, `issue`, `cancel`, `void`, `sync` | Invoice management |
| `fiscalSettings` | `get`, `upsert`, `testConnection`, `getCertificateInfo` | Fiscal configuration |
| `cities` | `listByState` | IBGE city lookup for fiscal address |

## Testing

840 tests across 2 test suites (754 fiscal + 86 tRPC), all passing with 0 failures.

```bash
# tRPC router tests
bun test

# Fiscal module tests
bun test src/lib/fiscal/__tests__/

# Coverage report
bun run test:coverage
```

> **Note**: Run fiscal and tRPC tests separately — Bun can segfault on large parallel runs.

```mermaid
flowchart TB
  subgraph FiscalTests["Fiscal Tests (754)"]
    TaxTests["Tax engine\nICMS / PIS / COFINS / IPI"]
    XMLTests["XML builder\n+ complement"]
    PortedTests["Ported from PHP\nsped-nfe test suite"]
    QRTests["QR code\n+ certificate"]
  end

  subgraph tRPCTests["tRPC Tests (86)"]
    PGLite["PGLite\n(in-memory)"]
    Mock["mock.module\n(@/lib/db)"]
    Caller["createCallerFactory"]
  end

  Schema["schema.ts"] -->|DDL| PGLite
  Mock -->|injects| PGLite
  Caller -->|calls router| Mock

  subgraph Verifications
    CRUD["CRUD → list() confirms state"]
    Isolation["cross-user → invisible"]
    Zod["Zod reject → unchanged"]
  end

  Caller --> Verifications
```

## Docker Deploy

The project includes a multi-stage Alpine-based Dockerfile and Docker Compose with a persistent volume.

```bash
docker compose up -d          # Build and start
docker compose logs -f        # View logs
docker compose down           # Stop
docker compose down -v        # Stop and delete database data
```

The `compose.yaml` expects `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` environment variables. Create a `.env` file at the root or pass them via `-e`:

```bash
BETTER_AUTH_SECRET=your-secret-key-at-least-32-chars
BETTER_AUTH_URL=https://your-domain.com
```

### Coolify / PaaS

The project works with Coolify and similar platforms that detect `compose.yaml`. Set the environment variables in the platform UI. The default internal port is `3111` (configurable via `PORT` env).

## Database

### Schema

<!-- ER_START -->

```mermaid
erDiagram
    products {
        serial id PK
        varchar name
        text description
        integer price
        integer in_stock
        varchar user_uid
        varchar category
        varchar ncm
        varchar cfop
        varchar icms_cst
        varchar pis_cst
        varchar cofins_cst
        varchar unit_of_measure
        timestamp created_at
    }

    customers {
        serial id PK
        varchar name
        varchar email UK
        varchar phone
        varchar user_uid
        varchar status
        timestamp created_at
    }

    payment_methods {
        serial id PK
        varchar name UK
        timestamp created_at
    }

    orders {
        serial id PK
        integer customer_id FK
        integer total_amount
        varchar user_uid
        varchar status
        timestamp created_at
    }

    order_items {
        serial id PK
        integer order_id FK
        integer product_id FK
        integer quantity
        integer price
        timestamp created_at
    }

    transactions {
        serial id PK
        text description
        integer order_id FK
        integer payment_method_id FK
        integer amount
        varchar user_uid
        varchar type
        varchar category
        varchar status
        timestamp created_at
    }

    fiscal_settings {
        serial id PK
        varchar user_uid UK
        varchar company_name
        varchar tax_id
        varchar state_code
        integer environment
        bytea certificate_pfx
        varchar csc_id
        varchar csc_token
        integer next_nfe_number
        integer next_nfce_number
    }

    invoices {
        serial id PK
        integer order_id FK
        integer model
        integer series
        integer number
        varchar access_key
        varchar status
        text request_xml
        text protocol_xml
        integer total_amount
        varchar user_uid
        timestamp authorized_at
    }

    invoice_items {
        serial id PK
        integer invoice_id FK
        integer product_id FK
        integer item_number
        varchar ncm
        varchar cfop
        integer quantity
        integer unit_price
        integer total_price
    }

    invoice_events {
        serial id PK
        integer invoice_id FK
        varchar event_type
        integer status_code
        text reason
        text request_xml
        timestamp created_at
    }

    cities {
        integer id PK
        varchar name
        varchar state_code
    }

    customers |o--o{ orders : "has"
    orders |o--o{ order_items : "contains"
    products |o--o{ order_items : "references"
    orders |o--o{ transactions : "generates"
    payment_methods |o--o{ transactions : "uses"
    orders |o--o{ invoices : "generates"
    invoices |o--o{ invoice_items : "contains"
    invoices |o--o{ invoice_events : "logs"
    products |o--o{ invoice_items : "references"
```

<!-- ER_END -->

All monetary values are stored as **integer cents** (e.g., $49.99 = `4999`). This avoids floating-point precision issues. All tables with `user_uid` enforce multi-tenancy.

### PGLite (default)

PGLite runs full PostgreSQL via WASM, directly in the Node.js process. Data is stored at `./data/pglite` (filesystem). No external PostgreSQL server required.

**Pros:** zero config, no dependencies, ideal for dev and small projects.

**Limitations:** single-process (no external concurrent connections), lower performance than native PostgreSQL under heavy load, no replication.

### Migrating to PostgreSQL

When the project grows and needs a real database, migration is straightforward because Drizzle ORM abstracts the data access layer — the schema is identical.

#### Automatic migration

Run the built-in script that handles all steps automatically:

```bash
bun run prepare-prod
```

Then set `DATABASE_URL` in your `.env` file and run:

```bash
bun run db:push
bun run dev
```

#### Manual migration

If you prefer to do it step by step:

#### 1. Install the PostgreSQL driver

```bash
bun add pg
bun remove @electric-sql/pglite
```

#### 2. Update `src/lib/db/index.ts`

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export const db = drizzle(process.env.DATABASE_URL!, { schema });
```

#### 3. Update `drizzle.config.ts`

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

#### 4. Add the env variable

```
DATABASE_URL=postgresql://user:password@host:5432/finopenpos
```

#### 5. Push schema and run

```bash
bun run db:push
bun run dev
```

#### 6. Clean up what's no longer needed

- Delete `scripts/ensure-db.ts` (only exists for PGLite recovery)
- Remove `db:ensure` from `dev` and `build` scripts in `package.json`
- Remove `serverExternalPackages` from `next.config.mjs`
- In Docker, replace the PGLite volume with a PostgreSQL connection via `DATABASE_URL`

> The Drizzle schema (`src/lib/db/schema.ts`) doesn't change. All queries, relations and tRPC procedures keep working without modification.

## Contributing

Contributions are welcome! Open an issue or submit a Pull Request.

## License

MIT License — see [LICENSE](LICENSE).
