# FinOpenPOS

Sistema open-source de Ponto de Venda (PDV) e gestão de estoque, construído com Next.js 16, React 19 e PostgreSQL embarcado via PGLite. Zero dependências externas para rodar — `bun dev` e pronto.

> **[Read in English](README.md)**

## Features

- **Dashboard** com gráficos interativos (receita, despesas, fluxo de caixa, margem de lucro)
- **Gestão de Produtos** com categorias e controle de estoque
- **Gestão de Clientes** com status ativo/inativo
- **Gestão de Pedidos** com itens, totais e status
- **Ponto de Venda (PDV)** para processamento rápido de vendas
- **Caixa** com registro de transações (receitas e despesas)
- **Autenticação** com email/senha via Better Auth
- **Documentação da API** gerada automaticamente via Scalar em `/api/docs`

## Arquitetura

```mermaid
flowchart LR
  Browser["Browser\nReact 19"]
  Proxy["proxy.ts\n(verifica sessão)"]
  tRPC["tRPC v11\n(superjson)"]
  Auth["Better Auth\n(cookie de sessão)"]
  Drizzle["Drizzle ORM"]
  PGLite["PGLite\n(PostgreSQL WASM)"]
  Scalar["Scalar\n/api/docs"]

  Browser -->|requisição HTTP| Proxy
  Proxy -->|autenticado| tRPC
  Proxy -->|/api/auth/*| Auth
  tRPC -->|protectedProcedure| Drizzle
  Drizzle -->|SQL| PGLite
  tRPC -.->|spec OpenAPI| Scalar
  Auth -->|sessão| PGLite
```

## Tech Stack

| Camada | Tecnologia |
|--------|------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, Radix UI, Recharts |
| Banco de dados | PGLite (PostgreSQL via WASM) |
| ORM | Drizzle ORM |
| API | tRPC v11 (type safety ponta a ponta) |
| Autenticação | Better Auth |
| Docs da API | Scalar (OpenAPI 3.0) |
| Runtime | Bun |

## Quick Start

```bash
git clone https://github.com/JoaoHenriqueBarbosa/FinOpenPOS.git
cd FinOpenPOS
cp .env.example .env
```

Edite o `.env` com um secret seguro:

```
BETTER_AUTH_SECRET=gere-com-openssl-rand-base64-32
BETTER_AUTH_URL=http://localhost:3000
```

```bash
bun install
bun run dev
```

Acesse http://localhost:3000 e use o botão **Fill demo credentials** para entrar com a conta de teste (`test@example.com` / `test1234`).

> O primeiro `bun run dev` cria o banco automaticamente em `./data/pglite`, empurra o schema via Drizzle e executa o seed com dados demo (20 clientes, 32 produtos, 40 pedidos, 25 transações).

## Scripts

| Comando | Descrição |
|---------|-----------|
| `bun run dev` | Valida PGLite, push schema e inicia dev server |
| `bun run build` | Valida PGLite, push schema e build de produção |
| `bun run start` | Inicia o servidor de produção |
| `bun run db:push` | Empurra schema Drizzle para o PGLite e regenera diagrama ER |
| `bun run db:ensure` | Detecta e limpa PGLite corrompido automaticamente |
| `bun test` | Roda todos os testes E2E (routers tRPC) |
| `bun run test:coverage` | Roda testes com relatório de cobertura |

## Estrutura do Projeto

```
src/
├── app/
│   ├── admin/           # Dashboard, produtos, clientes, pedidos, PDV, caixa
│   ├── api/
│   │   ├── auth/        # Handler catch-all do Better Auth
│   │   ├── trpc/        # Handler HTTP do tRPC (/api/trpc/*)
│   │   ├── docs/        # Documentação interativa via Scalar
│   │   └── openapi.json/# Spec OpenAPI 3.0 gerada automaticamente
│   ├── login/           # Página de login
│   └── signup/          # Página de cadastro
├── components/
│   ├── ui/              # Componentes shadcn (Button, Card, Dialog, etc.)
│   └── trpc-provider.tsx # TRPCProvider + setup React Query
├── lib/
│   ├── db/
│   │   ├── index.ts     # Singleton PGLite + instância Drizzle
│   │   ├── schema.ts    # Schema Drizzle (6 tabelas de negócio)
│   │   ├── auth-schema.ts # Tabelas do Better Auth (auto-geradas)
│   │   └── seed.ts      # Seed com dados demo via Faker
│   ├── trpc/
│   │   ├── init.ts      # Contexto tRPC, router, procedures (public + protected)
│   │   ├── router.ts    # Router raiz (products, customers, orders, etc.)
│   │   ├── openapi.ts   # Gerador de spec OpenAPI a partir dos routers tRPC
│   │   └── routers/     # Routers individuais com validação Zod
│   │       └── __tests__/# Testes E2E (bun:test + PGLite in-memory)
│   ├── auth.ts          # Config Better Auth (server)
│   ├── auth-client.ts   # Client auth (useSession, signIn, etc.)
│   └── auth-guard.ts    # Helper getAuthUser() para procedures tRPC
├── proxy.ts             # Middleware Next.js 16 (proteção de rotas)
└── instrumentation.ts   # Executa seed no startup do Next.js
```

## API

Todas as procedures exigem autenticação via cookie de sessão do Better Auth. A API usa **tRPC** para type safety de ponta a ponta — os componentes do frontend consomem as procedures diretamente com inferência completa de TypeScript.

### Documentação Interativa

Acesse **`/api/docs`** para a referência completa e interativa da API, gerada pelo Scalar a partir das definições dos routers tRPC.

A spec OpenAPI 3.0 raw está disponível em `/api/openapi.json`.

### Procedures tRPC

| Router | Procedures | Descrição |
|--------|-----------|-----------|
| `products` | `list`, `create`, `update`, `delete` | CRUD de produtos com estoque e categorias |
| `customers` | `list`, `create`, `update`, `delete` | CRUD de clientes com status |
| `orders` | `list`, `create`, `update`, `delete` | Gestão de pedidos com itens e transações |
| `transactions` | `list`, `create`, `update`, `delete` | Registro de transações (receitas/despesas) |
| `paymentMethods` | `list`, `create`, `update`, `delete` | Gestão de métodos de pagamento |
| `dashboard` | `stats` | Receita, despesas, lucro, fluxo de caixa e margens agregados |

## Testes

Todos os 6 routers tRPC têm 100% de cobertura de teste (70 testes, 216 assertions) usando `bun:test` com bancos PGLite in-memory.

```bash
# Rodar todos os testes
bun test

# Rodar com relatório de cobertura
bun run test:coverage
```

```mermaid
flowchart TB
  subgraph TestFile["Cada arquivo de teste"]
    PGLite["PGLite\n(in-memory)"]
    Mock["mock.module\n(@/lib/db)"]
    Caller["createCallerFactory\n(autenticado / não-autenticado)"]
    DDL["DDL via\ngetTableConfig"]
  end

  Schema["schema.ts\n(fonte única de verdade)"] -->|deriva| DDL
  DDL -->|CREATE TABLE| PGLite
  Mock -->|injeta| PGLite
  Caller -->|chama router| Mock

  subgraph Verificações
    Create["create → list() confirma persistência"]
    Update["update → list() confirma alteração + campos inalterados"]
    Delete["delete → list() confirma remoção"]
    Isolation["cross-user → dados invisíveis"]
    Validation["Zod rejeita → contagem inalterada"]
  end

  Caller --> Verificações
```

Cada arquivo de teste recebe uma instância PGLite isolada via `mock.module("@/lib/db", ...)`. O DDL é derivado automaticamente do schema Drizzle usando `getTableConfig` — sem SQL hardcoded para manter em sincronia. Os testes verificam o estado real do banco após cada mutação: `list()` após create/update/delete, isolamento entre usuários, comportamento de FK cascade e rejeições de validação Zod.

## Deploy com Docker

O projeto inclui Dockerfile multi-stage baseado em Alpine e Docker Compose com volume persistente.

```bash
# Build e start
docker compose up -d

# Ver logs
docker compose logs -f

# Parar
docker compose down

# Parar e apagar dados do banco
docker compose down -v
```

O `compose.yaml` espera as variáveis de ambiente `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL`. Crie um `.env` na raiz ou passe via `-e`:

```bash
BETTER_AUTH_SECRET=sua-chave-secreta-de-32-chars-minimo
BETTER_AUTH_URL=https://seu-dominio.com
```

### Coolify / PaaS

O projeto funciona com Coolify e plataformas similares que detectam `compose.yaml`. Configure as variáveis de ambiente na UI da plataforma. A porta interna padrão é `3111` (configurável via env `PORT`).

## Banco de Dados

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

    customers |o--o{ orders : "has"
    orders |o--o{ order_items : "contains"
    products |o--o{ order_items : "references"
    orders |o--o{ transactions : "generates"
    payment_methods |o--o{ transactions : "uses"
```

<!-- ER_END -->

Todos os valores monetários são armazenados como **inteiros em centavos** (ex: R$ 49,99 = `4999`). Isso evita problemas de precisão com ponto flutuante. Na interface, os valores são divididos por 100 para exibição. Todas as tabelas com `user_uid` aplicam multi-tenancy — `payment_methods` é a única tabela global.

### PGLite (padrão)

O PGLite roda PostgreSQL completo via WASM, direto no processo do Node.js. Os dados ficam em `./data/pglite` (filesystem). Não precisa de servidor PostgreSQL externo.

**Vantagens:** zero config, sem dependências, ideal para dev e projetos pequenos.

**Limitações:** single-process (sem conexões concorrentes de fora), performance abaixo de um PostgreSQL nativo para cargas pesadas, sem replicação.

### Migrando para PostgreSQL

Quando o projeto crescer e precisar de um banco real, a migração é simples porque o Drizzle ORM abstrai a camada de acesso — o schema é idêntico.

#### 1. Instale o driver do PostgreSQL

```bash
bun add pg
bun remove @electric-sql/pglite
```

#### 2. Atualize `src/lib/db/index.ts`

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export const db = drizzle(process.env.DATABASE_URL!, { schema });
```

#### 3. Atualize `drizzle.config.ts`

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

#### 4. Adicione a env

```
DATABASE_URL=postgresql://user:password@host:5432/finopenpos
```

#### 5. Empurre o schema e rode

```bash
bun run db:push
bun run dev
```

#### 6. Limpe o que não precisa mais

- Delete `scripts/ensure-db.ts` (só existe para recovery do PGLite)
- Remova `db:ensure` do script `dev` e `build` no `package.json`
- Remova `serverExternalPackages` do `next.config.mjs`
- No Docker, troque o volume PGLite por uma conexão ao PostgreSQL via `DATABASE_URL`

> O schema Drizzle (`src/lib/db/schema.ts`) não muda. Todas as queries, relations e procedures tRPC continuam funcionando sem alteração.

## Contribuindo

Contribuições são bem-vindas! Abra uma issue ou envie um Pull Request.

## Licença

MIT License — veja [LICENSE](LICENSE).
