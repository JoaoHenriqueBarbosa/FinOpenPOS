# FinOpenPOS

Open-source Point of Sale (POS) and inventory management system built with Next.js 16, React 19 and embedded PostgreSQL via PGLite. Zero external dependencies to run — `bun dev` and you're set.

> **[Leia em Portugues](README.ptBR.md)**

## Features

- **Dashboard** with interactive charts (revenue, expenses, cash flow, profit margin)
- **Product Management** with categories and stock control
- **Customer Management** with active/inactive status
- **Order Management** with items, totals and status tracking
- **Point of Sale (POS)** for quick sales processing
- **Cashier** with income and expense transaction logging
- **Authentication** with email/password via Better Auth
- **API Documentation** auto-generated interactive docs via Scalar at `/api/docs`

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
| Runtime | Bun |

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

> The first `bun run dev` automatically creates the database at `./data/pglite`, pushes the schema via Drizzle and runs the seed with demo data (20 customers, 32 products, 40 orders, 25 transactions).

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Validate PGLite, push schema and start dev server |
| `bun run build` | Validate PGLite, push schema and production build |
| `bun run start` | Start the production server |
| `bun run db:push` | Push Drizzle schema to PGLite |
| `bun run db:ensure` | Detect and auto-clean corrupted PGLite data |
| `bun test` | Run all E2E tests (tRPC routers) |
| `bun run test:coverage` | Run tests with coverage report |

## Project Structure

```
src/
├── app/
│   ├── admin/           # Dashboard, products, customers, orders, POS, cashier
│   ├── api/
│   │   ├── auth/        # Better Auth catch-all handler
│   │   ├── trpc/        # tRPC HTTP handler (/api/trpc/*)
│   │   ├── docs/        # Scalar interactive API docs
│   │   └── openapi.json/# Auto-generated OpenAPI 3.0 spec
│   ├── login/           # Login page
│   └── signup/          # Sign up page
├── components/
│   ├── ui/              # shadcn components (Button, Card, Dialog, etc.)
│   └── trpc-provider.tsx # TRPCProvider + React Query setup
├── lib/
│   ├── db/
│   │   ├── index.ts     # PGLite singleton + Drizzle instance
│   │   ├── schema.ts    # Drizzle schema (6 business tables)
│   │   ├── auth-schema.ts # Better Auth tables (auto-generated)
│   │   └── seed.ts      # Demo data seed via Faker
│   ├── trpc/
│   │   ├── init.ts      # tRPC context, router, procedures (public + protected)
│   │   ├── router.ts    # Root router (products, customers, orders, etc.)
│   │   ├── openapi.ts   # OpenAPI spec generator from tRPC routers
│   │   └── routers/     # Individual routers with Zod validation
│   │       └── __tests__/# E2E tests (bun:test + PGLite in-memory)
│   ├── auth.ts          # Better Auth config (server)
│   ├── auth-client.ts   # Client auth (useSession, signIn, etc.)
│   └── auth-guard.ts    # getAuthUser() helper for tRPC procedures
├── proxy.ts             # Next.js 16 middleware (route protection)
└── instrumentation.ts   # Runs seed on Next.js startup
```

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

## Testing

All 6 tRPC routers have 100% test coverage (70 tests, 216 assertions) using `bun:test` with PGLite in-memory databases.

```bash
# Run all tests
bun test

# Run with coverage report
bun run test:coverage
```

Each test file gets an isolated PGLite instance via `mock.module("@/lib/db", ...)`. The DDL is derived automatically from the Drizzle schema using `getTableConfig` — no hardcoded SQL to keep in sync. Tests verify actual DB state after every mutation: `list()` after create/update/delete, cross-user isolation, FK cascade behavior, and Zod validation rejections.

## Docker Deploy

The project includes a multi-stage Alpine-based Dockerfile and Docker Compose with a persistent volume.

```bash
# Build and start
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down

# Stop and delete database data
docker compose down -v
```

The `compose.yaml` expects `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` environment variables. Create a `.env` file at the root or pass them via `-e`:

```bash
BETTER_AUTH_SECRET=your-secret-key-at-least-32-chars
BETTER_AUTH_URL=https://your-domain.com
```

### Coolify / PaaS

The project works with Coolify and similar platforms that detect `compose.yaml`. Set the environment variables in the platform UI. The default internal port is `3111` (configurable via `PORT` env).

## Database

### PGLite (default)

PGLite runs full PostgreSQL via WASM, directly in the Node.js process. Data is stored at `./data/pglite` (filesystem). No external PostgreSQL server required.

**Pros:** zero config, no dependencies, ideal for dev and small projects.

**Limitations:** single-process (no external concurrent connections), lower performance than native PostgreSQL under heavy load, no replication.

### Migrating to PostgreSQL

When the project grows and needs a real database, migration is straightforward because Drizzle ORM abstracts the data access layer — the schema is identical.

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

## Monetary Values

All monetary values are stored as **integer cents** (e.g., $49.99 = `4999`). This avoids floating-point precision issues. Values are divided by 100 for display in the UI.

## Contributing

Contributions are welcome! Open an issue or submit a Pull Request.

## License

MIT License — see [LICENSE](LICENSE).
