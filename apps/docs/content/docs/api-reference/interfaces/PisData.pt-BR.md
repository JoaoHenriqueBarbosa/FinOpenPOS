---
layout: docs
title: "PisData"
---

[@finopenpos/fiscal](/docs/api-reference/index) / PisData



Defined in: [tax-pis-cofins-ipi.ts:17](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-pis-cofins-ipi.ts#L17)

Dados de entrada do PIS. Valores monetários em centavos, alíquotas como inteiro * 10000.


## Properties

### CST

```ts
CST code as 2-digit string (e.g. "01", "04", "49", "99") / Código CST como string de 2 dígitos
```

Defined in: [tax-pis-cofins-ipi.ts:19](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-pis-cofins-ipi.ts#L19)


***

### pPIS?

```ts
PIS rate -- stored as rate * 10000 (4dp) / Alíquota PIS -- armazenada como taxa * 10000 (4dp)
```

Defined in: [tax-pis-cofins-ipi.ts:23](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-pis-cofins-ipi.ts#L23)


***

### qBCProd?

```ts
Product BC quantity -- stored as qty * 10000 (4dp) / Quantidade BC Prod -- armazenada como qtd * 10000 (4dp)
```

Defined in: [tax-pis-cofins-ipi.ts:27](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-pis-cofins-ipi.ts#L27)


***

### vAliqProd?

```ts
Rate in BRL -- stored as value * 10000 (4dp) / Alíquota em reais -- armazenada como valor * 10000 (4dp)
```

Defined in: [tax-pis-cofins-ipi.ts:29](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-pis-cofins-ipi.ts#L29)


***

### vBC?

```ts
Tax base in cents / Base de cálculo em centavos
```

Defined in: [tax-pis-cofins-ipi.ts:21](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-pis-cofins-ipi.ts#L21)


***

### vPIS?

```ts
PIS value in cents / Valor do PIS em centavos
```

Defined in: [tax-pis-cofins-ipi.ts:25](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-pis-cofins-ipi.ts#L25)

