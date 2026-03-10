---
layout: docs
title: "IssqnData"
---

[@finopenpos/fiscal](/docs/api-reference/index) / IssqnData



Defined in: [tax-issqn.ts:18](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-issqn.ts#L18)

ISSQN (ISS - Imposto Sobre Servicos) input data.
Dados de entrada do ISSQN (ISS - Imposto Sobre Serviços).

Valores monetários em centavos, alíquotas em centésimos.

## Properties

### cListServ

```ts
Service list item (LC 116/2003) / Item da lista de serviços (LC 116/2003)
```

Defined in: [tax-issqn.ts:28](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-issqn.ts#L28)


***

### cMun?

```ts
Municipality of incidence (optional, IBGE) / Código do município de incidência (opcional, IBGE)
```

Defined in: [tax-issqn.ts:46](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-issqn.ts#L46)


***

### cMunFG

```ts
Municipality code of taxable event (IBGE 7 digits) / Código município do fato gerador (IBGE 7 dígitos)
```

Defined in: [tax-issqn.ts:26](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-issqn.ts#L26)


***

### cPais?

```ts
Country code (optional) / Código do país (opcional)
```

Defined in: [tax-issqn.ts:48](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-issqn.ts#L48)


***

### cServico?

```ts
Municipal service code (optional) / Código do serviço no município (opcional)
```

Defined in: [tax-issqn.ts:44](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-issqn.ts#L44)


***

### indIncentivo

```ts
Tax incentive indicator: 1=yes, 2=no / Indicador de incentivo fiscal: 1=sim, 2=não
```

Defined in: [tax-issqn.ts:32](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-issqn.ts#L32)


***

### indISS

```ts
ISS enforceability indicator: 1-7 / Indicador de exigibilidade do ISS: 1-7
```

Defined in: [tax-issqn.ts:30](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-issqn.ts#L30)


***

### nProcesso?

```ts
Judicial process number (optional) / Número do processo judicial (opcional)
```

Defined in: [tax-issqn.ts:50](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-issqn.ts#L50)


***

### vAliq

```ts
ISS rate as hundredths (500 = 5.00%) / Alíquota ISS em centésimos (500 = 5,00%)
```

Defined in: [tax-issqn.ts:22](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-issqn.ts#L22)


***

### vBC

```ts
Base de calculo in cents / Base de cálculo em centavos
```

Defined in: [tax-issqn.ts:20](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-issqn.ts#L20)


***

### vDeducao?

```ts
Deduction value (optional) in cents / Valor da dedução (opcional) em centavos
```

Defined in: [tax-issqn.ts:34](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-issqn.ts#L34)


***

### vDescCond?

```ts
Conditional discount (optional) in cents / Desconto condicionado (opcional) em centavos
```

Defined in: [tax-issqn.ts:40](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-issqn.ts#L40)


***

### vDescIncond?

```ts
Unconditional discount (optional) in cents / Desconto incondicionado (opcional) em centavos
```

Defined in: [tax-issqn.ts:38](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-issqn.ts#L38)


***

### vISSQN

```ts
ISSQN value in cents / Valor do ISSQN em centavos
```

Defined in: [tax-issqn.ts:24](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-issqn.ts#L24)


***

### vISSRet?

```ts
ISS retention value (optional) in cents / Valor da retenção do ISS (opcional) em centavos
```

Defined in: [tax-issqn.ts:42](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-issqn.ts#L42)


***

### vOutro?

```ts
Other retention value (optional) in cents / Valor de outras retenções (opcional) em centavos
```

Defined in: [tax-issqn.ts:36](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-issqn.ts#L36)

