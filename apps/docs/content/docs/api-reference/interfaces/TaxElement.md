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
  - \<II\>...fields...\</II\>  (variant only, no outer)


Cobre todos os padrões de grupos tributários da NF-e:
  - \<ICMS\>\<ICMS00\>...campos...\</ICMS00\>\</ICMS\>  (externo + variante)
  - \<IPI\>\<cEnq\>999\</cEnq\>\<IPITrib\>...\</IPITrib\>\</IPI\>  (externo + campos externos + variante)
  - \<ICMSUFDest\>...campos...\</ICMSUFDest\>  (somente variante, sem externo)
  - \<II\>...campos...\</II\>  (somente variante, sem externo)

## Properties

### fields

```ts
fields: TaxField[];
```

Defined in: [tax-element.ts:52](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-element.ts#L52)


***

### outerFields

```ts
outerFields: TaxField[];
```

Defined in: [tax-element.ts:48](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-element.ts#L48)


***

### outerTag

```ts
outerTag: string | null;
```

Defined in: [tax-element.ts:46](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-element.ts#L46)


***

### variantTag

```ts
variantTag: string;
```

Defined in: [tax-element.ts:50](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-element.ts#L50)

