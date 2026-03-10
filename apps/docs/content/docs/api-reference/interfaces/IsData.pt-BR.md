---
layout: docs
title: "IsData"
---

[@finopenpos/fiscal](/docs/api-reference/index) / IsData



Defined in: [tax-is.ts:17](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-is.ts#L17)

IS (Imposto Seletivo / IBS+CBS) input data -- PL_010 tax reform.
Dados de entrada do IS (Imposto Seletivo / IBS+CBS) -- reforma tributária PL_010.

Posicionado dentro de \<imposto\> como alternativa/adição ao ICMS.

## Properties

### cClassTribIS

```ts
IS tax classification code / Código de Classificação Tributária do IS
```

Defined in: [tax-is.ts:21](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-is.ts#L21)


***

### CSTIS

```ts
IS tax situation code / Código de Situação Tributária do IS
```

Defined in: [tax-is.ts:19](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-is.ts#L19)


***

### pIS?

```ts
IS rate (optional, e.g. "5.0000") / Alíquota IS (opcional, ex: "5.0000")
```

Defined in: [tax-is.ts:25](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-is.ts#L25)


***

### pISEspec?

```ts
Specific rate (optional, e.g. "1.5000") / Alíquota específica (opcional, ex: "1.5000")
```

Defined in: [tax-is.ts:27](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-is.ts#L27)


***

### qTrib?

```ts
Taxable quantity (optional, e.g. "10.0000") / Quantidade tributável (opcional, ex: "10.0000")
```

Defined in: [tax-is.ts:31](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-is.ts#L31)


***

### uTrib?

```ts
Taxable unit of measure (optional, e.g. "LT") / Unidade de medida tributável (opcional, ex: "LT")
```

Defined in: [tax-is.ts:29](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-is.ts#L29)


***

### vBCIS?

```ts
Tax base (optional, e.g. "100.00") / Base de cálculo (opcional, ex: "100.00")
```

Defined in: [tax-is.ts:23](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-is.ts#L23)


***

### vIS

```ts
IS tax value (e.g. "5.00") / Valor do IS (ex: "5.00")
```

Defined in: [tax-is.ts:33](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-is.ts#L33)

