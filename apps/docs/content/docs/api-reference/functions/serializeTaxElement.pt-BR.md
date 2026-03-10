---
layout: docs
title: "serializeTaxElement()"
---

[@finopenpos/fiscal](/docs/api-reference/index) / serializeTaxElement



```ts
function serializeTaxElement(element): string;
```

Defined in: [tax-element.ts:146](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-element.ts#L146)

Serialize a TaxElement to an XML string.

Examples:
  \{ outerTag: "ICMS", variantTag: "ICMS00", fields: [...] \}
  -\> \<ICMS\>\<ICMS00\>...fields...\</ICMS00\>\</ICMS\>

  \{ outerTag: null, variantTag: "ICMSUFDest", fields: [...] \}
  -\> \<ICMSUFDest\>...fields...\</ICMSUFDest\>

  \{ outerTag: "IPI", outerFields: [\{cEnq, "999"\}], variantTag: "IPITrib", fields: [...] \}
Serializa um TaxElement para string XML.


Exemplos:
  \{ outerTag: "ICMS", variantTag: "ICMS00", fields: [...] \}
  -\> \<ICMS\>\<ICMS00\>...campos...\</ICMS00\>\</ICMS\>

  \{ outerTag: null, variantTag: "ICMSUFDest", fields: [...] \}
  -\> \<ICMSUFDest\>...campos...\</ICMSUFDest\>

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `element` | [`TaxElement`](/docs/api-reference/interfaces/TaxElement) |  |

## Returns

`string`
