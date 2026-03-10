---
layout: docs
title: "buildEventId()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildEventId



```ts
function buildEventId(
   eventType, 
   accessKey, 
   seqNum): string;
```

Defined in: [sefaz-event-types.ts:59](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-event-types.ts#L59)

Build an event ID: ID\{tpEvento\}\{chNFe\}\{seqPadded\}


## Parameters

| Parameter | Type |
| ------ | ------ |
| `eventType` | `string` \| `number` |
| `accessKey` | `string` |
| `seqNum` | `number` |

## Returns

`string`
