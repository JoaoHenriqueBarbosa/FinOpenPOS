# FinOpenPOS

Sistema open-source de Ponto de Venda (PDV) e gestao de estoque, construido com Next.js 16, React 19 e PostgreSQL embarcado via PGLite. Zero dependencias externas para rodar — `bun dev` e pronto.

> **[Read in English](README.md)**

## Features

- **Dashboard** com graficos interativos (receita, despesas, fluxo de caixa, margem de lucro)
- **Gestao de Produtos** com categorias e controle de estoque
- **Gestao de Clientes** com status ativo/inativo
- **Gestao de Pedidos** com itens, totais e status
- **Ponto de Venda (PDV)** para processamento rapido de vendas
- **Caixa** com registro de transacoes (receitas e despesas)
- **Autenticacao** com email/senha via Better Auth

## Tech Stack

| Camada | Tecnologia |
|--------|------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, Radix UI, Recharts |
| Banco de dados | PGLite (PostgreSQL via WASM) |
| ORM | Drizzle ORM |
| Autenticacao | Better Auth |
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

Acesse http://localhost:3000 e use o botao **Fill demo credentials** para entrar com a conta de teste (`test@example.com` / `test1234`).

> O primeiro `bun run dev` cria o banco automaticamente em `./data/pglite`, empurra o schema via Drizzle e executa o seed com dados demo (20 clientes, 32 produtos, 40 pedidos, 25 transacoes).

## Scripts

| Comando | Descricao |
|---------|-----------|
| `bun run dev` | Valida PGLite, push schema e inicia dev server |
| `bun run build` | Valida PGLite, push schema e build de producao |
| `bun run start` | Inicia o servidor de producao |
| `bun run db:push` | Empurra schema Drizzle para o PGLite |
| `bun run db:ensure` | Detecta e limpa PGLite corrompido automaticamente |

## Estrutura do Projeto

```
src/
├── app/
│   ├── admin/           # Dashboard, produtos, clientes, pedidos, PDV, caixa
│   ├── api/             # API routes (CRUD + analytics)
│   ├── login/           # Pagina de login
│   └── signup/          # Pagina de cadastro
├── components/ui/       # Componentes shadcn (Button, Card, Dialog, etc.)
├── lib/
│   ├── db/
│   │   ├── index.ts     # Singleton PGLite + instancia Drizzle
│   │   ├── schema.ts    # Schema Drizzle (6 tabelas de negocio)
│   │   ├── auth-schema.ts # Tabelas do Better Auth (auto-geradas)
│   │   └── seed.ts      # Seed com dados demo via Faker
│   ├── auth.ts          # Config Better Auth (server)
│   ├── auth-client.ts   # Client auth (useSession, signIn, etc.)
│   └── auth-guard.ts    # Helper getAuthUser() para API routes
├── proxy.ts             # Middleware Next.js 16 (protecao de rotas)
└── instrumentation.ts   # Executa seed no startup do Next.js
```

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

O `compose.yaml` espera as variaveis de ambiente `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL`. Crie um `.env` na raiz ou passe via `-e`:

```bash
BETTER_AUTH_SECRET=sua-chave-secreta-de-32-chars-minimo
BETTER_AUTH_URL=https://seu-dominio.com
```

### Coolify / PaaS

O projeto funciona com Coolify e plataformas similares que detectam `compose.yaml`. Configure as variaveis de ambiente na UI da plataforma. A porta interna padrao e `3111` (configuravel via env `PORT`).

## Banco de Dados

### PGLite (padrao)

O PGLite roda PostgreSQL completo via WASM, direto no processo do Node.js. Os dados ficam em `./data/pglite` (filesystem). Nao precisa de servidor PostgreSQL externo.

**Vantagens:** zero config, sem dependencias, ideal para dev e projetos pequenos.

**Limitacoes:** single-process (sem conexoes concorrentes de fora), performance abaixo de um PostgreSQL nativo para cargas pesadas, sem replicacao.

### Migrando para PostgreSQL

Quando o projeto crescer e precisar de um banco real, a migracao e simples porque o Drizzle ORM abstrai a camada de acesso — o schema e identico.

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

#### 6. Limpe o que nao precisa mais

- Delete `scripts/ensure-db.ts` (so existe para recovery do PGLite)
- Remova `db:ensure` do script `dev` e `build` no `package.json`
- Remova `serverExternalPackages` do `next.config.mjs`
- No Docker, troque o volume PGLite por uma conexao ao PostgreSQL via `DATABASE_URL`

> O schema Drizzle (`src/lib/db/schema.ts`) nao muda. Todas as queries, relations e API routes continuam funcionando sem alteracao.

## Valores Monetarios

Todos os valores monetarios sao armazenados como **inteiros em centavos** (ex: R$ 49,99 = `4999`). Isso evita problemas de precisao com ponto flutuante. Na interface, os valores sao divididos por 100 para exibicao.

## API Routes

Todas as rotas exigem autenticacao via cookie de sessao do Better Auth.

| Rota | Metodos | Descricao |
|------|---------|-----------|
| `/api/products` | GET, POST | Listar/criar produtos |
| `/api/products/[id]` | GET, PUT, DELETE | CRUD de produto |
| `/api/customers` | GET, POST | Listar/criar clientes |
| `/api/customers/[id]` | GET, PUT, DELETE | CRUD de cliente |
| `/api/orders` | GET, POST | Listar/criar pedidos |
| `/api/orders/[id]` | GET, DELETE | Obter/deletar pedido |
| `/api/transactions` | GET, POST | Listar/criar transacoes |
| `/api/transactions/[id]` | GET, PUT, DELETE | CRUD de transacao |
| `/api/payment-methods` | GET | Listar metodos de pagamento |
| `/api/admin/revenue/*` | GET | Total e por categoria |
| `/api/admin/expenses/*` | GET | Total e por categoria |
| `/api/admin/profit/*` | GET | Total e margem |
| `/api/admin/cashflow` | GET | Fluxo de caixa mensal |

## Contribuindo

Contribuicoes sao bem-vindas! Abra uma issue ou envie um Pull Request.

## Licenca

MIT License — veja [LICENSE](LICENSE).
