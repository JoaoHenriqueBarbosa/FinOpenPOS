---
layout: docs
title: "VALID\_PROTOCOL\_STATUSES"
---

[@finopenpos/fiscal](/docs/api-reference/index) / VALID\_PROTOCOL\_STATUSES



```ts
const VALID_PROTOCOL_STATUSES: readonly [string, string, string, string, string, string, string];
```

Defined in: [sefaz-status-codes.ts:44](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-status-codes.ts#L44)

Valid cStat values when attaching a protocol to a signed NFe (nfeProc).
These statuses indicate the NFe was processed (authorized or denied)
and the protocol can be attached.

Indicam que a NFe foi processada (autorizada ou denegada) e o protocolo pode ser anexado.
