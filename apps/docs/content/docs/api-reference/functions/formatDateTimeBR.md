---
layout: docs
title: "formatDateTimeBR()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / formatDateTimeBR



```ts
function formatDateTimeBR(date, stateCode?): string;
```

Defined in: [format-utils.ts:130](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/format-utils.ts#L130)

Format a Date as ISO 8601 with Brazil timezone offset.
SEFAZ rejects UTC "Z" suffix -- requires explicit offset like -03:00.

Uses state-specific offsets for AC (-05:00), AM/RO/MT/MS/RR (-04:00),
and -03:00 (Brasilia time) for all other states.

SEFAZ rejeita sufixo UTC "Z" -- requer offset explícito como -03:00.

Usa offsets por estado: AC (-05:00), AM/RO/MT/MS/RR (-04:00),
e -03:00 (horário de Brasília) para os demais estados.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |

## Returns

`string`
