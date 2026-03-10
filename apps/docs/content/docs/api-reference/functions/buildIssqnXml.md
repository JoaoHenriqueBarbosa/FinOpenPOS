---
layout: docs
title: "buildIssqnXml()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / buildIssqnXml



```ts
function buildIssqnXml(data, totals?): string;
```

Defined in: [tax-issqn.ts:141](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-issqn.ts#L141)

Build ISSQN XML string and accumulate totals (backward-compatible wrapper).


## Parameters

| Parameter | Type |
| ------ | ------ |
| `data` | [`IssqnData`](/docs/api-reference/interfaces/IssqnData) |
| `totals?` | [`IssqnTotals`](/docs/api-reference/interfaces/IssqnTotals) |

## Returns

`string`
