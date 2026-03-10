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
Codigos de status da SEFAZ (cStat) usados no modulo fiscal.

Substituem numeros magicos espalhados no codigo. Referencia: MOC v7.0+

## Type Declaration

| Name | Type | Default value | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-already_cancelled"></a> `ALREADY_CANCELLED` | `155` | `155` | Cancelamento homologado fora de prazo | [sefaz-status-codes.ts:25](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-status-codes.ts#L25) |
| <a id="property-authorized"></a> `AUTHORIZED` | `100` | `100` | Autorizado o uso da NF-e | [sefaz-status-codes.ts:11](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-status-codes.ts#L11) |
| <a id="property-authorized_late"></a> `AUTHORIZED_LATE` | `150` | `150` | Autorizado o uso da NF-e (fora do prazo) | [sefaz-status-codes.ts:23](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-status-codes.ts#L23) |
| <a id="property-denied"></a> `DENIED` | `110` | `110` | Uso Denegado | [sefaz-status-codes.ts:17](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-status-codes.ts#L17) |
| <a id="property-denied_in_database"></a> `DENIED_IN_DATABASE` | `205` | `205` | NF-e esta denegada na base da SEFAZ | [sefaz-status-codes.ts:27](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-status-codes.ts#L27) |
| <a id="property-denied_issuer_irregular"></a> `DENIED_ISSUER_IRREGULAR` | `301` | `301` | Uso Denegado: Irregularidade fiscal do emitente | [sefaz-status-codes.ts:29](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-status-codes.ts#L29) |
| <a id="property-denied_recipient_irregular"></a> `DENIED_RECIPIENT_IRREGULAR` | `302` | `302` | Uso Denegado: Irregularidade fiscal do destinatario | [sefaz-status-codes.ts:31](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-status-codes.ts#L31) |
| <a id="property-denied_recipient_not_enabled"></a> `DENIED_RECIPIENT_NOT_ENABLED` | `303` | `303` | Uso Denegado: Destinatario nao habilitado a operar na UF | [sefaz-status-codes.ts:33](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-status-codes.ts#L33) |
| <a id="property-event_registered"></a> `EVENT_REGISTERED` | `135` | `135` | Evento registrado e vinculado a NF-e | [sefaz-status-codes.ts:19](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-status-codes.ts#L19) |
| <a id="property-event_registered_unlinked"></a> `EVENT_REGISTERED_UNLINKED` | `136` | `136` | Evento registrado, mas nao vinculado a NF-e | [sefaz-status-codes.ts:21](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-status-codes.ts#L21) |
| <a id="property-service_running"></a> `SERVICE_RUNNING` | `107` | `107` | Servico em Operacao | [sefaz-status-codes.ts:15](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-status-codes.ts#L15) |
| <a id="property-voided"></a> `VOIDED` | `102` | `102` | Inutilizacao de numero homologada | [sefaz-status-codes.ts:13](https://github.com/JoaoHenriqueBarbosa/FinOpenPOS/blob/c32859918d11f43537218f836329adb3d7693356/packages/fiscal/src/sefaz-status-codes.ts#L13) |
