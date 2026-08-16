# Extensibilidade via Addons

## Decisão (ADR)

**Status:** aceito — branch `feat/addon-extensibility`

O FinOpenPOS passa a ser um **microkernel extensível**: o core fornece os
domínios operacionais event-sourced (ver `12-event-sourcing.md`), auth e a
infraestrutura de UI/API; todo o resto é **addon**. O domínio fiscal
(NF-e/NFC-e) é o primeiro addon nativo (`@finopenpos/addon-fiscal`) e o core
não tem mais nenhuma referência a ele fora do registro de instalação.

O desenho segue o padrão consolidado da indústria (arquitetura
plugin/microkernel — modelo de contribuições do VS Code, módulos do Medusa,
plugins do Payload): núcleo mínimo + **contribution points declarativos** +
**contratos estáveis** + **injeção de dependência** + **isolamento de
falhas**.

## Arquitetura

```
@finopenpos/addon-kit            ← contratos (microkernel SDK)
  types.ts    AddonDefinition, AddonContext, HostApi v1, EventSubscription
  registry.ts validateAddons, setupAddons, seedAddons,
              createAddonDispatcher, mergeAddonMessages
  ui.tsx      AddonUIDefinition (nav/pages), AddonServicesProvider,
              useAddonTRPC, matchAddonPage

@finopenpos/addon-fiscal         ← primeiro addon nativo
  index.ts    defineAddon({ manifest, routers, tables, messages, setup, seed })
  ui/index.ts defineAddonUI({ nav, pages })

apps/web (host)
  lib/addons/installed.ts        ← registro server (1 linha por addon)
  lib/addons/installed-ui.tsx    ← registro client
  lib/addons/host-api.ts         ← implementação da Host API v1
  lib/addons/bootstrap.ts        ← setup/seed/dispatcher (instrumentation)
  app/admin/[...addon]/page.tsx  ← monta páginas contribuídas sob /admin
```

## Contribution points

| Ponto | Como o addon contribui | Como o host consome |
|---|---|---|
| **API (tRPC/OpenAPI)** | `routers` — namespaces na raiz do appRouter | spread tipado em `router.ts`; OpenAPI publicado automaticamente |
| **Schema** | `tables` (Drizzle, ordem FK-safe) | composto no schema do drizzle-kit e no DDL dos testes |
| **Eventos de domínio** | `subscriptions` (filtros por streamType/eventType) | `EventStore.onAppended` → dispatcher com isolamento de falhas |
| **Navegação admin** | `ui.nav` (href, labelKey, icon) | admin-layout concatena aos itens do core |
| **Páginas admin** | `ui.pages` (pattern `fiscal/:id` etc.) | rota catch-all `/admin/[...addon]` |
| **i18n** | `messages` por locale | deep-merge nas mensagens do host (next-intl) |
| **Dados de referência** | `seed(ctx)` | chamado no boot após o seed do core |

## Contratos e desacoplamento

- **Addons dependem só de `@finopenpos/addon-kit`** (e de pacotes públicos).
  Nenhum import de internals do host — verificável por grep: o addon fiscal
  não contém nenhum `@/...`.
- **AddonContext** (injetado em `setup()`): `db` (Drizzle/PGlite, cast para
  o recorte do addon), `eventStore`, `api` (Host API), `logger`.
- **Host API v1**: superfície versionada para ler os domínios operacionais
  do core (ex.: `loadOrderWithItems`), análoga ao módulo `vscode` das
  extensões. É o único acoplamento permitido com o domínio do host.
- **UI por injeção**: o host entrega `useTRPC` e `formatCurrency` via
  `AddonServicesProvider`; o addon tipa o cliente com o próprio recorte
  (`useAddonTRPC<TRPCOptionsProxy<FiscalRouter>>`), mantendo tipagem
  fim-a-fim sem depender do AppRouter do host.
- **Isolamento de falhas**: handler de evento que lança erro é logado e não
  propaga — um addon quebrado não derruba comandos do core nem outros
  addons. Colisões de id/router são rejeitadas no boot.

## Como criar um addon

1. Crie um pacote no workspace com `defineAddon({...})` (server) e,
   opcionalmente, `defineAddonUI({...})` (client).
2. Declare o que contribuir: routers, tabelas, assinaturas de eventos,
   mensagens, nav, páginas, seed.
3. Instale no host: adicione a dependência e uma linha em
   `apps/web/src/lib/addons/installed.ts` (+ `installed-ui.tsx` se tiver UI).

Nada mais no host precisa mudar: schema, API, OpenAPI, navegação, rotas,
i18n e seed são descobertos pelos contribution points.

## Limites conhecidos (v1)

- Registro em **tempo de compilação** (como Medusa/Payload): instalar addon
  = adicionar dependência + 1 linha no registro. Não há carga dinâmica em
  runtime nem sandbox de execução — addons rodam in-process com confiança
  total (adequado ao modelo self-hosted do projeto).
- Entrega de eventos é in-process, at-most-once. Addons que precisem de
  garantia de processamento devem reprocessar do event log (a posição
  `global_seq` permite retomar de um checkpoint próprio).
- A Host API é v1 e cresce sob demanda, com compatibilidade retroativa.
