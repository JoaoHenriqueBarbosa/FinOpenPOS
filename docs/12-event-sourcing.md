# Event Sourcing & CQRS

## Decisão (ADR)

**Status:** aceito — branch `feat/cqrs-event-sourcing`

Os domínios operacionais (produtos, clientes, pedidos, transações e métodos
de pagamento) passam a ser **event-sourced de verdade**: a única fonte de
verdade é o log append-only `events`, e **todo estado é reconstruído por
replay dos eventos em cada leitura — não existem snapshots nem tabelas de
estado materializado**.

### Contexto

O app roda inteiramente sobre **PGlite** (Postgres embarcado, single-writer,
sem TCP). Isso descarta stores externos (EventStoreDB/Kurrent, NATS
JetStream) e também o store PostgreSQL do
[Emmett](https://event-driven-io.github.io/emmett/overview.html) — a
biblioteca de referência de event sourcing em TypeScript — porque ele depende
de `node-postgres` com pool de conexões
([detalhes](https://event-driven.io/en/emmett_postgresql_event_store/)).

A solução é um event store próprio (`@finopenpos/event-sourcing`) que adota
os mesmos padrões do Emmett e da literatura de event stores em Postgres
([schema com UNIQUE (stream, version)](https://dev.to/tim_derzhavets/building-a-production-ready-event-store-in-postgresql-schema-design-projections-and-replay-25o8),
[event storage in Postgres](https://dev.to/kspeakman/event-storage-in-postgres-4dk2),
[postgresql-event-sourcing](https://github.com/eugene-khyst/postgresql-event-sourcing)):

- **Decider pattern**: comandos validam contra o estado reconstruído e
  emitem eventos; reducers puros fazem `estado + evento → estado`.
- **Concorrência otimista** via `UNIQUE (stream_type, stream_id, version)` —
  um append com versão defasada é rejeitado pelo banco
  (`ConcurrencyError`), sem lock de aplicação.
- **Ordem total** via `global_seq serial` — base de qualquer replay e de
  time-travel (`toGlobalSeq`).

### Benchmark (decide o design físico)

`packages/event-sourcing/bench/store-bench.ts` (PGlite in-memory, Bun;
resultados em `bench/results.json`, Apple Silicon):

| Variante | Append (2k eventos) | Replay + fold |
|---|---|---|
| payload `jsonb`, insert unitário | 10.564 ops/s | — |
| payload `jsonb`, batch 100 | 91.011 ops/s | 539k eventos/s (50k) |
| payload `text`, insert unitário | 13.091 ops/s | — |
| payload `text`, batch 100 | **105.032 ops/s** | **935k eventos/s (50k)** |

Decisões extraídas:

1. **Payload como `text` (JSON serializado)**, não `jsonb`: o fold acontece
   sempre em JS — nunca filtramos dentro do payload via SQL — então o
   `jsonb` só adiciona custo de parse no PGlite. `text` rende ~1,7x no
   replay e ~15–25% no append.
2. **Append multi-row**: todos os eventos de um comando entram em um único
   `INSERT ... VALUES (...), (...)` (~8x mais rápido que inserts unitários).
3. **Reconstrução total a cada leitura é viável**: replay de 50 mil eventos
   custa ~54 ms; um POS típico (dezenas de milhares de eventos por usuário)
   fica na casa de poucos ms por consulta. Sem rede (PGlite embarcado), não
   há round-trips a amortizar.

### Fora do escopo do event sourcing

- **Domínio fiscal (NF-e/NFC-e)**: as tabelas `invoices`, `invoice_items` e
  `invoice_events` permanecem. São o espelho de um registro externo
  imutável (XML assinado + protocolo SEFAZ), já possuem log de eventos
  próprio (`invoice_events`) e guardam binários (certificado A1). As
  referências `order_id`/`product_id` agora apontam para streams do event
  store (sem FK).
- **`fiscal_settings`**: configuração + numeração sequencial NF-e/NFC-e.
- **`cities`**: dados de referência IBGE.

## Arquitetura

```
apps/web/src/lib/trpc/routers/*    ← contrato tRPC/OpenAPI inalterado
        │ comandos                       │ queries
        ▼                                ▼
apps/web/src/lib/es/*              (write side)   (read side)
  products / customers / orders /   comandos +     projeções: readAll +
  transactions / payment-methods    reducers       foldStreams por request
        ▼
packages/event-sourcing            EventStore (append, readStream, readAll,
                                   nextStreamId), foldStream(s), tipos
        ▼
tabela `events` (PGlite)           global_seq | stream_type | stream_id |
                                   version | event_type | payload(text) |
                                   user_uid | occurred_at
```

### Eventos por agregado

| Stream | Eventos |
|---|---|
| `product` | `ProductCreated`, `ProductUpdated`, `ProductDeleted` |
| `customer` | `CustomerCreated`, `CustomerUpdated`, `CustomerDeleted` |
| `order` | `OrderPlaced` (com itens embutidos), `OrderUpdated`, `OrderDeleted` |
| `transaction` | `TransactionRecorded`, `TransactionUpdated`, `TransactionDeleted` |
| `payment_method` | `PaymentMethodCreated`, `PaymentMethodRenamed`, `PaymentMethodDeleted` |

Observações:

- Os **itens do pedido** são parte do fato `OrderPlaced` (um pedido é
  colocado com seus itens — não existem eventos por item). O `id` de item
  exposto na API é sintético e estável (`order_id * 1000 + índice + 1`).
- A venda no POS gera **dois fatos**: `OrderPlaced` + `TransactionRecorded`
  (pagamento). Deletar o pedido **não apaga** a transação — fatos históricos
  permanecem no log.
- `deleted` é um evento como outro qualquer: o reducer devolve `undefined`
  e a projeção remove a entidade do read model. O histórico continua
  disponível para auditoria/replay.
- IDs numéricos são preservados (compatibilidade com o contrato da API):
  `nextStreamId` aloca `MAX(stream_id)+1` por tipo de stream; uma corrida
  (impossível no PGlite single-writer) seria rejeitada pelo UNIQUE.
- O **seed** é uma importação de eventos históricos (`occurredAt` no
  passado), exatamente como os dados teriam entrado pelo uso normal.

### Invariantes mantidas no write side

- E-mail de cliente único (global) — validado contra a projeção antes do
  append.
- Nome de método de pagamento único — idem.
- Escopo por usuário: comandos verificam `user_uid` do stream antes de
  gravar; queries filtram eventos por `user_uid` no SQL.

## Referências

- [Emmett — overview](https://event-driven-io.github.io/emmett/overview.html)
- [Event Sourcing on PostgreSQL in Node.js with Emmett](https://event-driven.io/en/emmett_postgresql_event_store/)
- [Building a Production-Ready Event Store in PostgreSQL](https://dev.to/tim_derzhavets/building-a-production-ready-event-store-in-postgresql-schema-design-projections-and-replay-25o8)
- [Event Storage in Postgres (K. Speakman)](https://dev.to/kspeakman/event-storage-in-postgres-4dk2)
- [eugene-khyst/postgresql-event-sourcing](https://github.com/eugene-khyst/postgresql-event-sourcing)
- [Practical Introduction to Event Sourcing with Emmett](https://www.architecture-weekly.com/p/practical-introduction-to-event-sourcing)
