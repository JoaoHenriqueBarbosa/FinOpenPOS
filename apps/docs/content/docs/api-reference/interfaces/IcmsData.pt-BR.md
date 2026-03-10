---
layout: docs
title: "IcmsData"
---

[@finopenpos/fiscal](/docs/api-reference/index) / IcmsData



Defined in: [tax-icms.ts:53](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L53)

Unified input data for all ICMS variations.
Dados unificados para todas as variações de ICMS.

Valores monetários em centavos; alíquotas em centésimos ou * 10000.

## Properties

### adRemICMS?

```ts
Ad rem ICMS rate (hundredths, 4dp) Alíquota ad rem do ICMS (centésimos, 4dp)
```

Defined in: [tax-icms.ts:171](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L171)


***

### adRemICMSRet?

```ts
Ad rem retained rate (hundredths, 4dp) Alíquota ad rem retida (centésimos, 4dp)
```

Defined in: [tax-icms.ts:187](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L187)


***

### adRemICMSReten?

```ts
Ad rem retention rate (hundredths, 4dp) Alíquota ad rem de retenção (centésimos, 4dp)
```

Defined in: [tax-icms.ts:177](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L177)


***

### cBenefRBC?

```ts
Benefit code for BC reduction Código de benefício fiscal para redução da BC
```

Defined in: [tax-icms.ts:197](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L197)


***

### CSOSN?

```ts
Tax situation code (Simples Nacional) Código da situação da operação no Simples Nacional
```

Defined in: [tax-icms.ts:65](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L65)


***

### CST?

```ts
Tax situation code (regime Normal) Código da situação tributária (regime Normal)
```

Defined in: [tax-icms.ts:63](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L63)


***

### indDeduzDeson?

```ts
Deduct desonerated from item value (0/1) Indica se deduz o valor desonerado do item (0/1)
```

Defined in: [tax-icms.ts:115](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L115)


***

### modBC?

```ts
BC determination method Modalidade de determinação da BC
```

Defined in: [tax-icms.ts:69](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L69)


***

### modBCST?

```ts
ST BC determination method Modalidade de determinação da BC da ST
```

Defined in: [tax-icms.ts:89](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L89)


***

### motDesICMS?

```ts
Desoneration reason Motivo da desoneração
```

Defined in: [tax-icms.ts:113](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L113)


***

### motDesICMSST?

```ts
ST desoneration reason Motivo da desoneração do ICMS ST
```

Defined in: [tax-icms.ts:121](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L121)


***

### motRedAdRem?

```ts
Ad rem reduction reason Motivo da redução ad rem
```

Defined in: [tax-icms.ts:193](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L193)


***

### orig

```ts
Origin of goods (0-8) Origem da mercadoria (0-8)
```

Defined in: [tax-icms.ts:59](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L59)


***

### pBCOp?

```ts
Own operation BC % (hundredths, 4dp) Percentual da BC da operação própria (centésimos, 4dp)
```

Defined in: [tax-icms.ts:207](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L207)


***

### pCredSN?

```ts
SN credit rate (hundredths, 2dp or 4dp) Alíquota de crédito do Simples Nacional (centésimos, 2dp ou 4dp)
```

Defined in: [tax-icms.ts:201](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L201)


***

### pDif?

```ts
Deferral % (hundredths, 4dp) Percentual do diferimento (centésimos, 4dp)
```

Defined in: [tax-icms.ts:155](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L155)


***

### pFCP?

```ts
FCP rate (hundredths, 4dp) Alíquota do FCP (centésimos, 4dp)
```

Defined in: [tax-icms.ts:83](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L83)


***

### pFCPDif?

```ts
FCP deferral % (hundredths, 4dp) Percentual do diferimento do FCP (centésimos, 4dp)
```

Defined in: [tax-icms.ts:161](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L161)


***

### pFCPST?

```ts
FCP ST rate (hundredths, 4dp) Alíquota do FCP ST (centésimos, 4dp)
```

Defined in: [tax-icms.ts:105](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L105)


***

### pFCPSTRet?

```ts
FCP ST retained rate (hundredths, 4dp) Alíquota do FCP ST retido (centésimos, 4dp)
```

Defined in: [tax-icms.ts:137](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L137)


***

### pFCPUFDest?

```ts
FCP rate in destination (hundredths, 4dp) Alíquota do FCP na UF de destino (centésimos, 4dp)
```

Defined in: [tax-icms.ts:223](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L223)


***

### pICMS?

```ts
ICMS rate (hundredths, 4dp) Alíquota do ICMS (centésimos, 4dp)
```

Defined in: [tax-icms.ts:75](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L75)


***

### pICMSEfet?

```ts
Effective ICMS rate (hundredths, 4dp) Alíquota do ICMS efetiva (centésimos, 4dp)
```

Defined in: [tax-icms.ts:147](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L147)


***

### pICMSInter?

```ts
Interstate ICMS rate (hundredths, 2dp) Alíquota interestadual do ICMS (centésimos, 2dp)
```

Defined in: [tax-icms.ts:227](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L227)


***

### pICMSInterPart?

```ts
Interstate partition % (always 100) Percentual provisório de partilha interestadual (sempre 100)
```

Defined in: [tax-icms.ts:229](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L229)


***

### pICMSST?

```ts
ST ICMS rate (hundredths, 4dp) Alíquota do ICMS ST (centésimos, 4dp)
```

Defined in: [tax-icms.ts:97](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L97)


***

### pICMSUFDest?

```ts
Internal ICMS rate in destination (hundredths, 4dp) Alíquota interna do ICMS na UF de destino (centésimos, 4dp)
```

Defined in: [tax-icms.ts:225](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L225)


***

### pMVAST?

```ts
MVA ST % (hundredths, 4dp) Percentual da margem de valor adicionado do ICMS ST (centésimos, 4dp)
```

Defined in: [tax-icms.ts:91](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L91)


***

### pRedAdRem?

```ts
Ad rem reduction % (hundredths, 2dp) Percentual de redução ad rem (centésimos, 2dp)
```

Defined in: [tax-icms.ts:191](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L191)


***

### pRedBC?

```ts
BC reduction % (hundredths, 4dp) Percentual de redução da BC (centésimos, 4dp)
```

Defined in: [tax-icms.ts:73](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L73)


***

### pRedBCEfet?

```ts
Effective BC reduction % (hundredths, 4dp) Percentual de redução da BC efetiva (centésimos, 4dp)
```

Defined in: [tax-icms.ts:143](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L143)


***

### pRedBCST?

```ts
ST BC reduction % (hundredths, 4dp) Percentual de redução da BC da ST (centésimos, 4dp)
```

Defined in: [tax-icms.ts:93](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L93)


***

### pST?

```ts
Consumer final rate (hundredths, 4dp) Alíquota suportada pelo consumidor final (centésimos, 4dp)
```

Defined in: [tax-icms.ts:127](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L127)


***

### qBCMono?

```ts
Mono BC quantity (hundredths, 4dp) Quantidade tributada na BC monofásica (centésimos, 4dp)
```

Defined in: [tax-icms.ts:169](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L169)


***

### qBCMonoRet?

```ts
Mono BC retained quantity (hundredths, 4dp) Quantidade tributada na BC monofásica retida (centésimos, 4dp)
```

Defined in: [tax-icms.ts:185](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L185)


***

### qBCMonoReten?

```ts
Mono BC retention quantity (hundredths, 4dp) Quantidade tributada na BC monofásica de retenção (centésimos, 4dp)
```

Defined in: [tax-icms.ts:179](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L179)


***

### taxRegime

```ts
Tax regime Regime tributário
```

Defined in: [tax-icms.ts:55](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L55)


***

### UFST?

```ts
ST destination state UF de destino da ST
```

Defined in: [tax-icms.ts:209](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L209)


***

### vBC?

```ts
ICMS base value in cents Valor da base de cálculo do ICMS em centavos
```

Defined in: [tax-icms.ts:71](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L71)


***

### vBCEfet?

```ts
Effective base value in cents Valor da BC efetiva em centavos
```

Defined in: [tax-icms.ts:145](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L145)


***

### vBCFCP?

```ts
FCP base value in cents Valor da base de cálculo do FCP em centavos
```

Defined in: [tax-icms.ts:81](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L81)


***

### vBCFCPST?

```ts
FCP ST base value in cents Valor da base de cálculo do FCP ST em centavos
```

Defined in: [tax-icms.ts:103](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L103)


***

### vBCFCPSTRet?

```ts
FCP ST retained base value in cents Valor da BC do FCP ST retido em centavos
```

Defined in: [tax-icms.ts:135](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L135)


***

### vBCFCPUFDest?

```ts
FCP base value in destination state in cents Valor da BC do FCP na UF de destino em centavos
```

Defined in: [tax-icms.ts:221](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L221)


***

### vBCST?

```ts
ST base value in cents Valor da base de cálculo da ST em centavos
```

Defined in: [tax-icms.ts:95](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L95)


***

### vBCSTDest?

```ts
ST base value at destination in cents Valor da BC do ICMS ST no destino em centavos
```

Defined in: [tax-icms.ts:213](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L213)


***

### vBCSTRet?

```ts
Retained ST base value in cents Valor da BC do ICMS ST retido em centavos
```

Defined in: [tax-icms.ts:125](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L125)


***

### vBCUFDest?

```ts
Base value in destination state in cents Valor da BC na UF de destino em centavos
```

Defined in: [tax-icms.ts:219](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L219)


***

### vCredICMSSN?

```ts
SN credit value in cents Valor do crédito do ICMS do Simples Nacional em centavos
```

Defined in: [tax-icms.ts:203](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L203)


***

### vFCP?

```ts
FCP value in cents Valor do FCP em centavos
```

Defined in: [tax-icms.ts:85](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L85)


***

### vFCPDif?

```ts
Deferred FCP value in cents Valor do FCP diferido em centavos
```

Defined in: [tax-icms.ts:163](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L163)


***

### vFCPEfet?

```ts
Effective FCP value in cents Valor do FCP efetivo em centavos
```

Defined in: [tax-icms.ts:165](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L165)


***

### vFCPST?

```ts
FCP ST value in cents Valor do FCP ST em centavos
```

Defined in: [tax-icms.ts:107](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L107)


***

### vFCPSTRet?

```ts
FCP ST retained value in cents Valor do FCP ST retido em centavos
```

Defined in: [tax-icms.ts:139](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L139)


***

### vFCPUFDest?

```ts
FCP value in destination in cents Valor do FCP na UF de destino em centavos
```

Defined in: [tax-icms.ts:231](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L231)


***

### vICMS?

```ts
ICMS value in cents Valor do ICMS em centavos
```

Defined in: [tax-icms.ts:77](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L77)


***

### vICMSDeson?

```ts
Desonerated ICMS value in cents Valor do ICMS desonerado em centavos
```

Defined in: [tax-icms.ts:111](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L111)


***

### vICMSDif?

```ts
Deferred ICMS value in cents Valor do ICMS diferido em centavos
```

Defined in: [tax-icms.ts:157](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L157)


***

### vICMSEfet?

```ts
Effective ICMS value in cents Valor do ICMS efetivo em centavos
```

Defined in: [tax-icms.ts:149](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L149)


***

### vICMSMono?

```ts
Mono ICMS value in cents Valor do ICMS monofásico em centavos
```

Defined in: [tax-icms.ts:173](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L173)


***

### vICMSMonoDif?

```ts
Mono ICMS deferred value in cents Valor do ICMS monofásico diferido em centavos
```

Defined in: [tax-icms.ts:183](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L183)


***

### vICMSMonoOp?

```ts
Mono ICMS operation value in cents Valor do ICMS da operação monofásica em centavos
```

Defined in: [tax-icms.ts:175](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L175)


***

### vICMSMonoRet?

```ts
Mono ICMS retained value in cents Valor do ICMS monofásico retido em centavos
```

Defined in: [tax-icms.ts:189](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L189)


***

### vICMSMonoReten?

```ts
Mono ICMS retention value in cents Valor do ICMS monofásico de retenção em centavos
```

Defined in: [tax-icms.ts:181](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L181)


***

### vICMSOp?

```ts
ICMS of the operation in cents Valor do ICMS da operação em centavos
```

Defined in: [tax-icms.ts:153](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L153)


***

### vICMSST?

```ts
ST ICMS value in cents Valor do ICMS ST em centavos
```

Defined in: [tax-icms.ts:99](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L99)


***

### vICMSSTDeson?

```ts
ST desonerated value in cents Valor do ICMS ST desonerado em centavos
```

Defined in: [tax-icms.ts:119](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L119)


***

### vICMSSTDest?

```ts
ST ICMS value at destination in cents Valor do ICMS ST no destino em centavos
```

Defined in: [tax-icms.ts:215](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L215)


***

### vICMSSTRet?

```ts
Retained ST ICMS value in cents Valor do ICMS ST retido em centavos
```

Defined in: [tax-icms.ts:131](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L131)


***

### vICMSSubstituto?

```ts
Substitute own ICMS value in cents Valor do ICMS próprio do substituto em centavos
```

Defined in: [tax-icms.ts:129](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L129)


***

### vICMSUFDest?

```ts
ICMS value in destination in cents Valor do ICMS na UF de destino em centavos
```

Defined in: [tax-icms.ts:233](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L233)


***

### vICMSUFRemet?

```ts
ICMS value for sender state in cents Valor do ICMS para a UF do remetente em centavos
```

Defined in: [tax-icms.ts:235](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/tax-icms.ts#L235)

