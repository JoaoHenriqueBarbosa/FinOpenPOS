/** Event type constants matching PHP sped-nfe */
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

/** Map event type to its description */
export function getEventDescription(eventType: number): string {
  const descriptions: Record<number, string> = {
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
  return descriptions[eventType] ?? "";
}
