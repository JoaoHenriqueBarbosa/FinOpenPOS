/**
 * Event type constants matching PHP sped-nfe
 *
 * [pt-BR] Constantes de tipos de evento compativeis com o sped-nfe PHP
 */
export const EVENT_TYPES = {
  CCE: 110110,
  CANCELLATION: 110111,
  CANCELLATION_BY_SUBSTITUTION: 110112,
  EPEC: 110140,
  INTERESTED_ACTOR: 110150,
  DELIVERY_PROOF: 110130,
  DELIVERY_PROOF_CANCELLATION: 110131,
  EXTENSION_REQUEST_1: 111500,
  EXTENSION_REQUEST_2: 111501,
  EXTENSION_CANCELLATION_1: 111502,
  EXTENSION_CANCELLATION_2: 111503,
  DELIVERY_FAILURE: 110192,
  DELIVERY_FAILURE_CANCELLATION: 110193,
  CONFIRMATION: 210200,
  AWARENESS: 210210,
  UNKNOWN_OPERATION: 210220,
  OPERATION_NOT_PERFORMED: 210240,
} as const;

/**
 * Map event type to its description
 *
 * [pt-BR] Retorna a descricao textual do tipo de evento SEFAZ
 */
export function getEventDescription(eventType: number | string): string {
  const descriptions: Record<string, string> = {
    [EVENT_TYPES.CCE]: "Carta de Correcao",
    [EVENT_TYPES.CANCELLATION]: "Cancelamento",
    [EVENT_TYPES.CANCELLATION_BY_SUBSTITUTION]: "Cancelamento por substituicao",
    [EVENT_TYPES.EPEC]: "EPEC",
    [EVENT_TYPES.INTERESTED_ACTOR]: "Ator interessado na NF-e",
    [EVENT_TYPES.DELIVERY_PROOF]: "Comprovante de Entrega da NF-e",
    [EVENT_TYPES.DELIVERY_PROOF_CANCELLATION]: "Cancelamento Comprovante de Entrega da NF-e",
    [EVENT_TYPES.EXTENSION_REQUEST_1]: "Pedido de Prorrogacao",
    [EVENT_TYPES.EXTENSION_REQUEST_2]: "Pedido de Prorrogacao",
    [EVENT_TYPES.EXTENSION_CANCELLATION_1]: "Cancelamento de Pedido de Prorrogacao",
    [EVENT_TYPES.EXTENSION_CANCELLATION_2]: "Cancelamento de Pedido de Prorrogacao",
    [EVENT_TYPES.CONFIRMATION]: "Confirmacao da Operacao",
    [EVENT_TYPES.AWARENESS]: "Ciencia da Operacao",
    [EVENT_TYPES.UNKNOWN_OPERATION]: "Desconhecimento da Operacao",
    [EVENT_TYPES.OPERATION_NOT_PERFORMED]: "Operacao nao Realizada",
    [EVENT_TYPES.DELIVERY_FAILURE]: "Insucesso na Entrega da NF-e",
    [EVENT_TYPES.DELIVERY_FAILURE_CANCELLATION]: "Cancelamento Insucesso na Entrega da NF-e",
  };
  return descriptions[String(eventType)] ?? "";
}

/**
 * Build an event ID: ID{tpEvento}{chNFe}{seqPadded}
 *
 * [pt-BR] Constroi o identificador do evento: ID{tpEvento}{chNFe}{nSeqEvento com 2 digitos}
 */
export function buildEventId(
  eventType: number | string,
  accessKey: string,
  seqNum: number,
): string {
  return `ID${eventType}${accessKey}${String(seqNum).padStart(2, "0")}`;
}

/**
 * Generate lot ID from explicit value or Date.now() fallback
 *
 * [pt-BR] Gera o ID do lote a partir do valor explicito ou fallback para Date.now()
 */
export function defaultLotId(lotId?: string): string {
  return lotId ?? String(Date.now());
}
