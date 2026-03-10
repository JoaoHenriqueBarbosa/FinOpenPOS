---
layout: docs
title: "SEFAZ\_STATUS"
---

[@finopenpos/fiscal](/docs/api-reference/index) / SEFAZ\_STATUS



```ts
const SEFAZ_STATUS: {
  ALREADY_CANCELLED: 155;
  AUTHORIZED: 100;
  AUTHORIZED_LATE: 150;
  DENIED: 110;
  DENIED_IN_DATABASE: 205;
  DENIED_ISSUER_IRREGULAR: 301;
  DENIED_RECIPIENT_IRREGULAR: 302;
  DENIED_RECIPIENT_NOT_ENABLED: 303;
  EVENT_REGISTERED: 135;
  EVENT_REGISTERED_UNLINKED: 136;
  SERVICE_RUNNING: 107;
  VOIDED: 102;
};
```

Defined in: [sefaz-status-codes.ts:9](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-status-codes.ts#L9)

SEFAZ status codes (cStat) used across the fiscal module.
These replace magic numbers scattered in invoice-service.ts, complement.ts, etc.
Reference: Manual de Orientacao do Contribuinte (MOC) v7.0+

Substituem numeros magicos espalhados no codigo. Referencia: MOC v7.0+

## Type Declaration

| Name | Type | Default value | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
