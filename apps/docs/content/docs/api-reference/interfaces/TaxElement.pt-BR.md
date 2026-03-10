---
layout: docs
title: "TaxElement"
---

[@finopenpos/fiscal](/docs/api-reference/index) / TaxElement



Defined in: [tax-element.ts:44](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-element.ts#L44)

Structured representation of a tax XML element.

Covers all NF-e tax group patterns:
  - \<ICMS\>\<ICMS00\>...fields...\</ICMS00\>\</ICMS\>  (outer + variant)
  - \<IPI\>\<cEnq\>999\</cEnq\>\<IPITrib\>...\</IPITrib\>\</IPI\>  (outer + outerFields + variant)
  - \<ICMSUFDest\>...fields...\</ICMSUFDest\>  (variant only, no outer)
Representação estruturada de um elemento XML de imposto.


Cobre todos os padrões de grupos tributários da NF-e:
  - \<ICMS\>\<ICMS00\>...campos...\</ICMS00\>\</ICMS\>  (externo + variante)
  - \<IPI\>\<cEnq\>999\</cEnq\>\<IPITrib\>...\</IPITrib\>\</IPI\>  (externo + campos externos + variante)
  - \<ICMSUFDest\>...campos...\</ICMSUFDest\>  (somente variante, sem externo)
  - \<II\>...campos...\</II\>  (somente variante, sem externo)

## Properties

### fields

```ts
Fields inside the variant tag. / Campos dentro da tag variante.
```

Defined in: [tax-element.ts:52](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-element.ts#L52)


***

### outerFields

```ts
Fields at the outer level, before the variant (e.g., IPI's cEnq). / Campos no nível externo, antes da variante (ex: cEnq do IPI).
```

Defined in: [tax-element.ts:48](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-element.ts#L48)


***

### outerTag

```ts
Outer wrapper tag (e.g., "ICMS", "PIS", "IPI"). null = no wrapper. / Tag externa (ex: "ICMS", "PIS", "IPI"). null = sem wrapper.
```

Defined in: [tax-element.ts:46](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-element.ts#L46)


***

### variantTag

```ts
The variant/inner tag (e.g., "ICMS00", "PISAliq", "IPITrib", "II"). / Tag variante/interna (ex: "ICMS00", "PISAliq", "IPITrib", "II").
```

Defined in: [tax-element.ts:50](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-element.ts#L50)

