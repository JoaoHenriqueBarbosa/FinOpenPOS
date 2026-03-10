---
layout: docs
title: "adjustNfeForContingency()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / adjustNfeForContingency



```ts
function adjustNfeForContingency(xml, contingency): string;
```

Defined in: [contingency-nfe.ts:27](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/contingency-nfe.ts#L27)

Adjust NF-e XML for contingency mode.


Ported from PHP NFePHP\NFe\Factories\ContingencyNFe::adjust().

Modifies the XML to set contingency emission type (tpEmis),
adds dhCont and xJust tags, and recalculates the access key.

adiciona as tags dhCont e xJust, e recalcula a chave de acesso.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |

## Returns

`string`

Modified XML string

## Throws

Error when contingency is not active or XML is NFC-e (model 65)

## Throws

Erro quando contingencia nao esta ativa ou XML e NFC-e (modelo 65)
