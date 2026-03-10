/**
 * SEFAZ status codes (cStat) used across the fiscal module.
 * These replace magic numbers scattered in invoice-service.ts, complement.ts, etc.
 * Reference: Manual de Orientacao do Contribuinte (MOC) v7.0+
 *
 * [pt-BR] Codigos de status da SEFAZ (cStat) usados no modulo fiscal.
 * Substituem numeros magicos espalhados no codigo. Referencia: MOC v7.0+
 */
export const SEFAZ_STATUS = {
  /** 100 — Authorized / [pt-BR] Autorizado o uso da NF-e */
  AUTHORIZED: 100,
  /** 102 — Number voided / [pt-BR] Inutilizacao de numero homologada */
  VOIDED: 102,
  /** 107 — Service running / [pt-BR] Servico em Operacao */
  SERVICE_RUNNING: 107,
  /** 110 — Usage denied / [pt-BR] Uso Denegado */
  DENIED: 110,
  /** 135 — Event registered and linked / [pt-BR] Evento registrado e vinculado a NF-e */
  EVENT_REGISTERED: 135,
  /** 136 — Event registered but unlinked / [pt-BR] Evento registrado, mas nao vinculado a NF-e */
  EVENT_REGISTERED_UNLINKED: 136,
  /** 150 — Authorized (late) / [pt-BR] Autorizado o uso da NF-e (fora do prazo) */
  AUTHORIZED_LATE: 150,
  /** 155 — Already cancelled (late) / [pt-BR] Cancelamento homologado fora de prazo */
  ALREADY_CANCELLED: 155,
  /** 205 — Denied in SEFAZ database / [pt-BR] NF-e esta denegada na base da SEFAZ */
  DENIED_IN_DATABASE: 205,
  /** 301 — Denied: issuer fiscal irregularity / [pt-BR] Uso Denegado: Irregularidade fiscal do emitente */
  DENIED_ISSUER_IRREGULAR: 301,
  /** 302 — Denied: recipient fiscal irregularity / [pt-BR] Uso Denegado: Irregularidade fiscal do destinatario */
  DENIED_RECIPIENT_IRREGULAR: 302,
  /** 303 — Denied: recipient not enabled in UF / [pt-BR] Uso Denegado: Destinatario nao habilitado a operar na UF */
  DENIED_RECIPIENT_NOT_ENABLED: 303,
} as const;

/**
 * Valid cStat values when attaching a protocol to a signed NFe (nfeProc).
 * These statuses indicate the NFe was processed (authorized or denied)
 * and the protocol can be attached.
 *
 * [pt-BR] Valores validos de cStat ao anexar protocolo a uma NFe assinada (nfeProc).
 * Indicam que a NFe foi processada (autorizada ou denegada) e o protocolo pode ser anexado.
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
 *
 * [pt-BR] Valores validos de cStat para respostas de cancelamento e eventos.
 * 135 = evento registrado, 136 = registrado sem vinculo, 155 = ja cancelado.
 */
export const VALID_EVENT_STATUSES = [
  String(SEFAZ_STATUS.EVENT_REGISTERED),
  String(SEFAZ_STATUS.EVENT_REGISTERED_UNLINKED),
  String(SEFAZ_STATUS.ALREADY_CANCELLED),
] as const;
