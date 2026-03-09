/**
 * SEFAZ status codes (cStat) used across the fiscal module.
 *
 * These replace magic numbers scattered in invoice-service.ts, complement.ts, etc.
 * Reference: Manual de Orientacao do Contribuinte (MOC) v7.0+
 */
export const SEFAZ_STATUS = {
  /** 100 — Autorizado o uso da NF-e */
  AUTHORIZED: 100,
  /** 102 — Inutilizacao de numero homologada */
  VOIDED: 102,
  /** 107 — Servico em Operacao */
  SERVICE_RUNNING: 107,
  /** 110 — Uso Denegado */
  DENIED: 110,
  /** 135 — Evento registrado e vinculado a NF-e */
  EVENT_REGISTERED: 135,
  /** 136 — Evento registrado, mas nao vinculado a NF-e */
  EVENT_REGISTERED_UNLINKED: 136,
  /** 150 — Autorizado o uso da NF-e (fora do prazo) */
  AUTHORIZED_LATE: 150,
  /** 155 — Cancelamento homologado fora de prazo */
  ALREADY_CANCELLED: 155,
  /** 205 — NF-e esta denegada na base da SEFAZ */
  DENIED_IN_DATABASE: 205,
  /** 301 — Uso Denegado: Irregularidade fiscal do emitente */
  DENIED_ISSUER_IRREGULAR: 301,
  /** 302 — Uso Denegado: Irregularidade fiscal do destinatario */
  DENIED_RECIPIENT_IRREGULAR: 302,
  /** 303 — Uso Denegado: Destinatario nao habilitado a operar na UF */
  DENIED_RECIPIENT_NOT_ENABLED: 303,
} as const;

/**
 * Valid cStat values when attaching a protocol to a signed NFe (nfeProc).
 * These statuses indicate the NFe was processed (authorized or denied)
 * and the protocol can be attached.
 */
export const VALID_PROTOCOL_STATUSES = [
  String(SEFAZ_STATUS.AUTHORIZED),
  String(SEFAZ_STATUS.AUTHORIZED_LATE),
  String(SEFAZ_STATUS.DENIED),
  String(SEFAZ_STATUS.DENIED_IN_DATABASE),
  String(SEFAZ_STATUS.DENIED_ISSUER_IRREGULAR),
  String(SEFAZ_STATUS.DENIED_RECIPIENT_IRREGULAR),
  String(SEFAZ_STATUS.DENIED_RECIPIENT_NOT_ENABLED),
] as const;

/**
 * Valid cStat values for cancellation and event responses.
 * 135 = event registered, 136 = registered but unlinked, 155 = already cancelled.
 */
export const VALID_EVENT_STATUSES = [
  String(SEFAZ_STATUS.EVENT_REGISTERED),
  String(SEFAZ_STATUS.EVENT_REGISTERED_UNLINKED),
  String(SEFAZ_STATUS.ALREADY_CANCELLED),
] as const;
