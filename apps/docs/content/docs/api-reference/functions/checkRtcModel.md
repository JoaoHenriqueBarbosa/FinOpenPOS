---
layout: docs
title: "checkRtcModel()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / checkRtcModel



```ts
function checkRtcModel(model, chNFe?): void;
```

Defined in: [sefaz-reform-events.ts:163](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-reform-events.ts#L163)

Validate that the model is 55 (NFe) and the access key also indicates model 55.
RTC events only apply to model 55. Ported from PHP TraitEventsRTC::checkModel().

Eventos RTC se aplicam apenas ao modelo 55.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `model` | `number` |
| `chNFe?` | `string` |

## Returns

`void`
