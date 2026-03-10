---
layout: docs
title: "adjustNfeForContingency()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / adjustNfeForContingency



```ts
function adjustNfeForContingency(xml, contingency): string;
```

Defined in: [contingency-nfe.ts:27](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/contingency-nfe.ts#L27)

Ajusta XML de NF-e para modo de contingencia.


Ported from PHP NFePHP\NFe\Factories\ContingencyNFe::adjust().

Modifies the XML to set contingency emission type (tpEmis),
Modifica o XML para definir o tipo de emissao em contingencia (tpEmis),

adiciona as tags dhCont e xJust, e recalcula a chave de acesso.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `xml` | `string` |  |
| `contingency` | [`Contingency`](/docs/api-reference/classes/Contingency) |  |

## Returns

`string`



## Throws



## Throws

Erro quando contingencia nao esta ativa ou XML e NFC-e (modelo 65)
