# FinOpenPOS

Sistema open-source de Ponto de Venda (PDV) e gestao de estoque com **modulo fiscal brasileiro** (NF-e/NFC-e). Construido com Next.js 16, React 19 e PostgreSQL embarcado via PGLite. Monorepo Turborepo com o modulo fiscal como pacote standalone. Zero dependencias externas para rodar — `bun install && bun run dev` e pronto.

> **[Read in English](README.md)**

## Indice

- [Features](#features)
- [Arquitetura](#arquitetura)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Scripts](#scripts)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Modulo Fiscal (NF-e / NFC-e)](#modulo-fiscal-nf-e--nfc-e)
  - [Ciclo de Vida da Nota](#ciclo-de-vida-da-nota)
  - [Motor de Impostos](#motor-de-impostos)
  - [Comunicacao com a SEFAZ](#comunicacao-com-a-sefaz)
  - [Documentacao Detalhada](#documentacao-detalhada)
- [API](#api)
  - [Documentacao Interativa](#documentacao-interativa)
  - [Procedures tRPC](#procedures-trpc)
- [Testes](#testes)
- [Deploy com Docker](#deploy-com-docker)
- [Banco de Dados](#banco-de-dados)
  - [Schema](#schema)
  - [PGLite (padrao)](#pglite-padrao)
  - [Migrando para PostgreSQL](#migrando-para-postgresql)
- [Contribuindo](#contribuindo)
- [Licenca](#licenca)

## Features

### Negocio
- **Dashboard** com graficos interativos (receita, despesas, fluxo de caixa, margem de lucro)
- **Gestao de Produtos** com categorias e controle de estoque
- **Gestao de Clientes** com status ativo/inativo
- **Gestao de Pedidos** com itens, totais e status
- **Ponto de Venda (PDV)** para processamento rapido de vendas
- **Caixa** com registro de transacoes (receitas e despesas)
- **Autenticacao** com email/senha via Better Auth
- **Documentacao da API** gerada automaticamente via Scalar em `/api/docs`

### Fiscal (NF-e / NFC-e)
- **Emissao de Notas Fiscais** — NF-e (modelo 55, B2B) e NFC-e (modelo 65, consumidor)
- **Calculo de Impostos** — ICMS (15 CST + 10 CSOSN), PIS, COFINS, IPI, II, ISSQN
- **Integracao SEFAZ** — autorizar, cancelar, inutilizar, consultar com certificado digital mTLS
- **Assinatura Digital** — XML assinado com certificado A1 e-CNPJ (PFX/PKCS#12)
- **QR Code** — geracao de QR code NFC-e (v2.00/v3.00, online + offline)
- **Contingencia** — SVC-AN, SVC-RS (NF-e) e EPEC (NFC-e) modos offline
- **Eventos da Reforma IBS/CBS** — 14 tipos de evento da reforma tributaria (PL_010)
- **Tela de Configuracoes** — dados da empresa, endereco, certificado, CSC, codigos padrao
- **Auto-preenchimento de CEP** — via ViaCEP + BrasilAPI

## Arquitetura

```mermaid
flowchart LR
  Browser["Browser React 19"]
  Proxy["proxy.ts (verifica sessao)"]
  tRPC["tRPC v11 (superjson)"]
  Auth["Better Auth (cookie de sessao)"]
  Drizzle["Drizzle ORM"]
  PGLite["PGLite (PostgreSQL WASM)"]
  Scalar["Scalar /api/docs"]
  Fiscal["Modulo Fiscal (NF-e / NFC-e)"]
  SEFAZ["SEFAZ (Receita Estadual)"]

  Browser -->|requisicao HTTP| Proxy
  Proxy -->|autenticado| tRPC
  Proxy -->|/api/auth/*| Auth
  tRPC -->|protectedProcedure| Drizzle
  tRPC -->|rotas fiscais| Fiscal
  Drizzle -->|SQL| PGLite
  tRPC -.->|spec OpenAPI| Scalar
  Auth -->|sessao| PGLite
  Fiscal -->|gera XML + assina| SEFAZ
  Fiscal -->|persiste| Drizzle
```

## Tech Stack

| Camada | Tecnologia |
|--------|------------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, Radix UI, Recharts |
| Banco de dados | PGLite (PostgreSQL via WASM) |
| ORM | Drizzle ORM |
| API | tRPC v11 (type safety ponta a ponta) |
| Autenticacao | Better Auth |
| Docs da API | Scalar (OpenAPI 3.0) |
| Assinatura XML | xml-crypto |
| Parsing XML | fast-xml-parser |
| Runtime | Bun |
| i18n | next-intl (en + pt-BR) |
| Monorepo | Turborepo, Biome |
| Modulo Fiscal | @finopenpos/fiscal (pacote standalone) |

## Quick Start

```bash
git clone https://github.com/JoaoHenriqueBarbosa/FinOpenPOS.git
cd FinOpenPOS
cp apps/web/.env.example apps/web/.env
```

Edite o `apps/web/.env` com um secret seguro:

```
BETTER_AUTH_SECRET=gere-com-openssl-rand-base64-32
BETTER_AUTH_URL=http://localhost:3001
```

```bash
bun install
bun run dev
```

Acesse http://localhost:3001 e use o botao **Fill demo credentials** para entrar com a conta de teste (`test@example.com` / `test1234`).

> O primeiro `bun run dev` cria o banco automaticamente em `apps/web/data/pglite`, empurra o schema via Drizzle e executa o seed com dados demo (20 clientes, 32 produtos, 40 pedidos, 25 transacoes) + ~5570 municipios IBGE.

## Scripts

| Comando | Descricao |
|---------|-----------|
| `bun run dev` | Inicia todos os apps via Turborepo |
| `bun run dev:web` | Inicia apenas a app web |
| `bun run check` | Lint e format com Biome |
| `cd apps/web && bun test` | Roda testes dos routers tRPC |
| `cd packages/fiscal && bun test` | Roda testes do modulo fiscal (754 testes) |
| `cd apps/web && bun run prepare-prod` | Migra do PGLite para PostgreSQL real |

## Estrutura do Projeto

```
FinOpenPOS/
├── apps/
│   └── web/                    # Aplicacao web Next.js 16
│       ├── src/
│       │   ├── app/            # Paginas (admin, login, cadastro, rotas API)
│       │   ├── components/     # Componentes UI (shadcn + custom)
│       │   ├── lib/
│       │   │   ├── db/         # Schema Drizzle + singleton PGLite
│       │   │   ├── invoice-service.ts    # Orquestrador ciclo de vida da nota
│       │   │   ├── invoice-repository.ts # Persistencia de notas (Drizzle)
│       │   │   ├── fiscal-settings-repository.ts
│       │   │   └── trpc/       # Routers tRPC (negocio + fiscal)
│       │   ├── messages/       # i18n (en.ts, pt-BR.ts)
│       │   └── proxy.ts        # Middleware Next.js 16
│       ├── scripts/            # DB ensure, ER gen, prepare-prod
│       └── data/               # Banco PGLite (gitignored)
├── packages/
│   └── fiscal/                 # @finopenpos/fiscal — lib fiscal standalone
│       └── src/
│           ├── __tests__/      # 754 testes (portados do PHP sped-nfe)
│           ├── value-objects/   # AccessKey, TaxId
│           ├── tax-icms.ts     # Motor ICMS (25 variantes)
│           ├── tax-pis-cofins-ipi.ts  # PIS/COFINS/IPI/II
│           ├── xml-builder.ts  # Geracao XML NF-e
│           ├── certificate.ts  # Extracao PFX + assinatura XML
│           ├── sefaz-*.ts      # Camada de comunicacao SEFAZ
│           └── ...             # 30+ modulos (veja docs/)
├── turbo.json                  # Config de tarefas Turborepo
├── biome.json                  # Config de linter/formatter
├── Dockerfile                  # Imagem Docker dev (PGLite)
├── Dockerfile.production       # Imagem Docker producao (PostgreSQL)
└── docs/                       # Documentacao fiscal detalhada (12 arquivos)
```

## Modulo Fiscal (NF-e / NFC-e)

O modulo fiscal vive em `packages/fiscal/` como `@finopenpos/fiscal` — um pacote standalone com zero dependencia de banco de dados. Pode ser usado independentemente em qualquer projeto TypeScript/JavaScript.

O modulo implementa emissao completa de notas fiscais eletronicas seguindo a especificacao MOC 4.00 da SEFAZ, portado da biblioteca PHP [sped-nfe](https://github.com/nfephp-org/sped-nfe) para TypeScript com arquitetura DDD.

### Ciclo de Vida da Nota

```mermaid
flowchart TD
  Start([Pedido realizado]) --> LoadSettings[Carrega config fiscal + certificado]
  LoadSettings --> BuildXML[Gera XML NF-e/NFC-e a partir dos itens]
  BuildXML --> CalcTax[Calcula impostos ICMS + PIS + COFINS + IPI]
  CalcTax --> GenKey[Gera chave de acesso 44 digitos mod-11]
  GenKey --> Sign[Assina XML com certificado A1 e-CNPJ]
  Sign --> SendSEFAZ{Envia para SEFAZ}

  SendSEFAZ -->|cStat 100| Authorized[Autorizada ✓]
  SendSEFAZ -->|cStat 110| Denied[Denegada ✗]
  SendSEFAZ -->|timeout| Contingency{Modelo?}

  Contingency -->|NFC-e 65| Offline[Salva offline status=contingencia]
  Contingency -->|NF-e 55| Error[Lanca erro]

  Authorized --> AttachProto[Anexa protocolo XML nfeProc]
  AttachProto --> SaveDB[(Salva no BD nota + itens)]
  Offline --> SaveDB
  Denied --> SaveDB

  SaveDB --> IncrNumber[Incrementa proximo numero]

  Authorized -.->|depois| Cancel[Cancelar nota]
  Cancel --> EventXML[Gera XML de evento de cancelamento]
  EventXML --> SignEvent[Assina + envia para SEFAZ]

  Offline -.->|conexao volta| Sync[Sincronizar notas pendentes]
```

### Motor de Impostos

```mermaid
flowchart LR
  subgraph Domain["Camada de Dominio (logica pura)"]
    ICMS["tax-icms.ts 15 CST + 10 CSOSN"]
    PIS["tax-pis-cofins-ipi.ts PIS / COFINS / IPI / II"]
    TE["tax-element.ts Interface TaxElement"]
  end

  subgraph Infra["Camada de Infraestrutura"]
    XB["xml-builder.ts XML NF-e completo"]
    XU["xml-utils.ts tag() + escapeXml()"]
    FU["format-utils.ts centavos → '10.50'"]
  end

  ICMS -->|retorna TaxElement| TE
  PIS -->|retorna TaxElement| TE
  TE -->|serializeTaxElement| XB
  XB --> XU
  ICMS --> FU
  PIS --> FU
```

Os modulos de imposto nunca importam codigo XML — eles retornam estruturas `TaxElement` que o builder serializa. Isso mantem a logica de dominio pura e testavel.

### Comunicacao com a SEFAZ

```mermaid
sequenceDiagram
  participant App as Invoice Service
  participant Builder as Request Builder
  participant Cert as Certificate
  participant Transport as SEFAZ Transport
  participant SEFAZ as Web Service SEFAZ

  App->>Builder: buildAuthorizationRequestXml(nfeAssinada)
  App->>Cert: extractCertFromPfx(pfx, senha)
  Cert-->>App: PEM cert + key

  App->>Transport: sefazRequest(url, xml, cert, key)
  Transport->>Transport: Monta envelope SOAP 1.2
  Transport->>Transport: Grava PEM em arquivos temp
  Transport->>SEFAZ: curl --cert cert.pem --key key.pem (mTLS)
  SEFAZ-->>Transport: Resposta SOAP
  Transport->>Transport: Extrai conteudo do body SOAP
  Transport-->>App: { httpStatus, body, content }

  App->>App: parseAuthorizationResponse(content)
  App->>App: attachProtocol(request, response)
```

> **Por que curl?** O `node:https` do Bun nao suporta PFX para mTLS. O workaround extrai PEM do PFX via openssl e usa curl para a requisicao HTTPS.

### Documentacao Detalhada

A pasta [`docs/`](docs/) contem 12 documentos aprofundados:

| Documento | Tema |
|-----------|------|
| [00-architecture.md](docs/00-architecture.md) | Camadas, grafo de dependencias, convencoes numericas |
| [01-tax-engine.md](docs/01-tax-engine.md) | ICMS/PIS/COFINS/IPI, padrao TaxElement |
| [02-xml-generation.md](docs/02-xml-generation.md) | xml-builder, complement, estrutura XML NF-e |
| [03-sefaz-communication.md](docs/03-sefaz-communication.md) | Transporte, URLs, request builders, eventos reforma |
| [04-certificate-signing.md](docs/04-certificate-signing.md) | Extracao PFX, assinatura digital XML |
| [05-value-objects.md](docs/05-value-objects.md) | AccessKey (mod-11), TaxId (CPF/CNPJ) |
| [06-invoice-workflow.md](docs/06-invoice-workflow.md) | Ciclo de vida da nota, repositorios |
| [07-contingency.md](docs/07-contingency.md) | SVC-AN/SVC-RS, EPEC, modos offline |
| [08-qrcode.md](docs/08-qrcode.md) | QR code NFC-e v2.00/v3.00 |
| [09-txt-conversion.md](docs/09-txt-conversion.md) | Conversao formato legado SPED TXT |
| [10-database-schema.md](docs/10-database-schema.md) | Tabelas fiscais, multi-tenancy |
| [11-utilities.md](docs/11-utilities.md) | GTIN, consulta CEP, codigos estaduais |

## API

Todas as procedures exigem autenticacao via cookie de sessao do Better Auth. A API usa **tRPC** para type safety de ponta a ponta — os componentes do frontend consomem as procedures diretamente com inferencia completa de TypeScript.

### Documentacao Interativa

Acesse **`/api/docs`** para a referencia completa e interativa da API, gerada pelo Scalar a partir das definicoes dos routers tRPC.

A spec OpenAPI 3.0 raw esta disponivel em `/api/openapi.json`.

### Procedures tRPC

| Router | Procedures | Descricao |
|--------|-----------|-----------|
| `products` | `list`, `create`, `update`, `delete` | CRUD de produtos com estoque e categorias |
| `customers` | `list`, `create`, `update`, `delete` | CRUD de clientes com status |
| `orders` | `list`, `create`, `update`, `delete` | Gestao de pedidos com itens e transacoes |
| `transactions` | `list`, `create`, `update`, `delete` | Registro de transacoes (receitas/despesas) |
| `paymentMethods` | `list`, `create`, `update`, `delete` | Gestao de metodos de pagamento |
| `dashboard` | `stats` | Receita, despesas, lucro, fluxo de caixa e margens |
| `fiscal` | `list`, `getById`, `issue`, `cancel`, `void`, `sync` | Gestao de notas fiscais |
| `fiscalSettings` | `get`, `upsert`, `testConnection`, `getCertificateInfo` | Configuracao fiscal |
| `cities` | `listByState` | Consulta de municipios IBGE por estado |

## Testes

840 testes em 2 suites (754 fiscal + 86 tRPC), todos passando com 0 falhas.

```bash
# Testes dos routers tRPC
cd apps/web && bun test

# Testes do modulo fiscal
cd packages/fiscal && bun test
```

> **Nota**: Rode testes fiscal e tRPC separadamente — o Bun pode dar segfault em execucoes paralelas grandes.

```mermaid
flowchart TB
  subgraph FiscalTests["Testes Fiscais (754)"]
    TaxTests["Motor de impostos ICMS / PIS / COFINS / IPI"]
    XMLTests["XML builder + complement"]
    PortedTests["Portados do PHP suite sped-nfe"]
    QRTests["QR code + certificado"]
  end

  subgraph tRPCTests["Testes tRPC (86)"]
    PGLite["PGLite (in-memory)"]
    Mock["mock.module (@/lib/db)"]
    Caller["createCallerFactory"]
  end

  Schema["schema.ts"] -->|DDL| PGLite
  Mock -->|injeta| PGLite
  Caller -->|chama router| Mock

  subgraph Verificacoes
    CRUD["CRUD → list() confirma estado"]
    Isolation["cross-user → invisivel"]
    Zod["Zod rejeita → inalterado"]
  end

  Caller --> Verificacoes
```

## Deploy com Docker

O projeto inclui Dockerfile multi-stage baseado em Alpine e Docker Compose com volume persistente.

```bash
docker compose up -d          # Build e start
docker compose logs -f        # Ver logs
docker compose down           # Parar
docker compose down -v        # Parar e apagar dados do banco
```

O `compose.yaml` espera as variaveis de ambiente `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL`. Crie um `apps/web/.env` ou passe via `-e`:

```bash
BETTER_AUTH_SECRET=sua-chave-secreta-de-32-chars-minimo
BETTER_AUTH_URL=https://seu-dominio.com
```

### Coolify / PaaS

O projeto funciona com Coolify e plataformas similares que detectam `compose.yaml`. Configure as variaveis de ambiente na UI da plataforma. A porta interna padrao e `3111` (configuravel via env `PORT`).

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

    customers |o--o{ orders : "has"
    orders |o--o{ order_items : "contains"
    products |o--o{ order_items : "references"
    orders |o--o{ transactions : "generates"
    payment_methods |o--o{ transactions : "uses"
```

<!-- ER_END -->

Todos os valores monetarios sao armazenados como **inteiros em centavos** (ex: R$ 49,99 = `4999`). Isso evita problemas de precisao com ponto flutuante. Todas as tabelas com `user_uid` aplicam multi-tenancy.

### PGLite (padrao)

O PGLite roda PostgreSQL completo via WASM, direto no processo do Node.js. Os dados ficam em `apps/web/data/pglite` (filesystem). Nao precisa de servidor PostgreSQL externo.

**Vantagens:** zero config, sem dependencias, ideal para dev e projetos pequenos.

**Limitacoes:** single-process (sem conexoes concorrentes de fora), performance abaixo de um PostgreSQL nativo para cargas pesadas, sem replicacao.

### Migrando para PostgreSQL

Quando o projeto crescer e precisar de um banco real, a migracao e simples porque o Drizzle ORM abstrai a camada de acesso — o schema e identico.

#### Migração automática

Execute o script que faz todos os passos automaticamente:

```bash
cd apps/web && bun run prepare-prod
```

Depois configure `DATABASE_URL` no seu `apps/web/.env` e rode:

```bash
cd apps/web && bun run db:push
bun run dev
```

#### Migração manual

Se preferir fazer passo a passo:

#### 1. Instale o driver do PostgreSQL

```bash
bun add pg
bun remove @electric-sql/pglite
```

#### 2. Atualize `apps/web/src/lib/db/index.ts`

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export const db = drizzle(process.env.DATABASE_URL!, { schema });
```

#### 3. Atualize `apps/web/drizzle.config.ts`

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
cd apps/web && bun run db:push
bun run dev
```

#### 6. Limpe o que nao precisa mais

- Delete `apps/web/scripts/ensure-db.ts` (so existe para recovery do PGLite)
- Remova `db:ensure` do script `dev` e `build` no `apps/web/package.json`
- Remova `serverExternalPackages` do `apps/web/next.config.mjs`
- No Docker, troque o volume PGLite por uma conexao ao PostgreSQL via `DATABASE_URL`

> O schema Drizzle (`apps/web/src/lib/db/schema.ts`) nao muda. Todas as queries, relations e procedures tRPC continuam funcionando sem alteracao.

## Contribuindo

Contribuicoes sao bem-vindas! Abra uma issue ou envie um Pull Request.

## Licenca

MIT License — veja [LICENSE](LICENSE).
