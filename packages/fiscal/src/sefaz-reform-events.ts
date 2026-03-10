/**
 * SEFAZ Reform Events -- IBS/CBS tax reform (PL_010).
 * Each function builds the full envEvento XML for a specific tpEvento code.
 * These mirror the PHP TraitEventsRTC methods.
 *
 * [pt-BR] Eventos da Reforma Tributaria SEFAZ -- IBS/CBS (PL_010).
 * Cada funcao constroi o XML completo do envEvento para um tpEvento especifico.
 * Espelham os metodos TraitEventsRTC do PHP.
 */

import { buildEventId, defaultLotId } from "./sefaz-event-types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt2(v: number): string {
  return v.toFixed(2);
}

function fmt4(v: number): string {
  return v.toFixed(4);
}

/**
 * Event type code to description mapping for reform events
 *
 * [pt-BR] Mapeamento de codigo do tipo de evento para descricao (eventos da reforma)
 */
const EVENT_DESCRIPTIONS: Record<string, string> = {
  "110001": "Cancelamento de Evento",
  "112110": "Informacao de efetivo pagamento integral",
  "112120": "Importacao em ALC/ZFM nao convertida em isencao",
  "112130": "Perecimento perda roubo ou furto pelo fornecedor",
  "112140": "Fornecimento nao realizado",
  "112150": "Atualizacao da data de previsao de entrega",
  "211110": "Solicitacao de Apropriacao de Credito Presumido",
  "211120": "Destinacao de item para consumo pessoal",
  "211124": "Perecimento perda roubo ou furto pelo adquirente",
  "211128": "Aceite de debito na apuracao",
  "211130": "Imobilizacao de item",
  "211140": "Solicitacao de Apropriacao de Credito de Combustivel",
  "211150": "Solicitacao de Apropriacao de Credito para bens e servicos",
  "212110": "Manifestacao sobre Pedido de Transferencia de Credito de IBS",
  "212120": "Manifestacao sobre Pedido de Transferencia de Credito de CBS",
};

/**
 * Parameters for building a reform event envelope XML
 *
 * [pt-BR] Parametros para construcao do XML do envelope de evento da reforma
 */
interface EventEnvelopeParams {
  /** Event type code / [pt-BR] Codigo do tipo de evento */
  tpEvento: string;
  /** NF-e access key / [pt-BR] Chave de acesso da NF-e */
  chNFe: string;
  /** Event sequence number / [pt-BR] Numero sequencial do evento */
  nSeqEvento: number;
  /** IBGE state code / [pt-BR] Codigo do orgao (UF IBGE) */
  cOrgao: string;
  /** Environment: 1=production, 2=homologation / [pt-BR] Ambiente: 1=producao, 2=homologacao */
  tpAmb: number;
  /** Company CNPJ / [pt-BR] CNPJ da empresa */
  cnpj: string;
  /** Additional XML tags for detEvento / [pt-BR] Tags XML adicionais para detEvento */
  tagAdic: string;
  /** Application version / [pt-BR] Versao da aplicacao */
  verAplic: string;
}

function buildEventEnvelope(p: EventEnvelopeParams): string {
  const verEvento = "1.00";
  const eventId = buildEventId(p.tpEvento, p.chNFe, p.nSeqEvento);
  const descEvento = EVENT_DESCRIPTIONS[p.tpEvento] ?? "Evento";
  const dhEvento = new Date().toISOString().replace("Z", "-03:00");
  const lote = defaultLotId();

  return `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="${verEvento}">`
    + `<idLote>${lote}</idLote>`
    + `<evento versao="${verEvento}">`
    + `<infEvento Id="${eventId}">`
    + `<cOrgao>${p.cOrgao}</cOrgao>`
    + `<tpAmb>${p.tpAmb}</tpAmb>`
    + `<CNPJ>${p.cnpj}</CNPJ>`
    + `<chNFe>${p.chNFe}</chNFe>`
    + `<dhEvento>${dhEvento}</dhEvento>`
    + `<tpEvento>${p.tpEvento}</tpEvento>`
    + `<nSeqEvento>${p.nSeqEvento}</nSeqEvento>`
    + `<verEvento>${verEvento}</verEvento>`
    + `<detEvento versao="${verEvento}">`
    + `<descEvento>${descEvento}</descEvento>`
    + p.tagAdic
    + `</detEvento>`
    + `</infEvento>`
    + `</evento>`
    + `</envEvento>`;
}

/** Build the standard cOrgaoAutor + tpAutor + verAplic tagAdic prefix [pt-BR] Constroi o prefixo padrao cOrgaoAutor + tpAutor + verAplic para tagAdic */
function reformEventHeader(config: SefazReformConfig, va: string, tpAutor?: number): string {
  let h = `<cOrgaoAutor>${config.cOrgao}</cOrgaoAutor>`;
  if (tpAutor != null) h += `<tpAutor>${tpAutor}</tpAutor>`;
  h += `<verAplic>${va}</verAplic>`;
  return h;
}

/** Wrap tagAdic in a buildEventEnvelope call with standard config params [pt-BR] Encapsula tagAdic em uma chamada buildEventEnvelope com parametros padrao de config */
function wrapReformEvent(
  config: SefazReformConfig,
  tpEvento: string,
  chNFe: string,
  nSeqEvento: number,
  tagAdic: string,
  va: string,
): string {
  return buildEventEnvelope({
    tpEvento, chNFe, nSeqEvento,
    cOrgao: config.cOrgao, tpAmb: config.tpAmb, cnpj: config.cnpj,
    tagAdic, verAplic: va,
  });
}

// ── Config type ──────────────────────────────────────────────────────────────

/**
 * Configuration for SEFAZ reform event builders
 *
 * [pt-BR] Configuracao para os construtores de eventos da reforma tributaria SEFAZ
 */
export interface SefazReformConfig {
  /** IBGE state code, e.g. "35" for SP / [pt-BR] Codigo UF IBGE, ex: "35" para SP */
  cOrgao: string;
  /** Tax environment: 1=production, 2=homologation / [pt-BR] Ambiente fiscal: 1=producao, 2=homologacao */
  tpAmb: number;
  /** CNPJ of the company / [pt-BR] CNPJ da empresa */
  cnpj: string;
  /** Application version identifier / [pt-BR] Identificador da versao da aplicacao */
  verAplic: string;
}

/**
 * Resolve verAplic: explicit > config > default "4.00"
 *
 * [pt-BR] Resolve a versao da aplicacao: valor explicito > config > padrao "4.00"
 */
export function resolveVerAplic(
  explicit: string | undefined,
  configVerAplic: string | undefined
): string {
  if (explicit) return explicit;
  if (configVerAplic) return configVerAplic;
  return "4.00";
}

// ── Model validation ─────────────────────────────────────────────────────────

/**
 * Validate that the model is 55 (NFe) and the access key also indicates model 55.
 * RTC events only apply to model 55. Ported from PHP TraitEventsRTC::checkModel().
 *
 * [pt-BR] Valida que o modelo e 55 (NFe) e a chave de acesso tambem indica modelo 55.
 * Eventos RTC se aplicam apenas ao modelo 55.
 */
export function checkRtcModel(model: number, chNFe?: string): void {
  if (model !== 55) {
    throw new Error(
      "O ambiente esta ajustado para modelo 65 (NFCe) e esse evento atende apenas o modelo 55 (NFe)"
    );
  }
  if (chNFe) {
    if (chNFe.substring(20, 22) !== "55") {
      throw new Error("A chave da NFe informada nao e uma NFe modelo 55");
    }
  }
}

/**
 * tpEvento=112110 -- Full payment confirmation event
 * Ported from PHP TraitEventsRTC::sefazInfoPagtoIntegral()
 *
 * [pt-BR] tpEvento=112110 -- Informacao de efetivo pagamento integral
 */
export function buildInfoPagtoIntegral(
  config: SefazReformConfig,
  model: number,
  chNFe: string,
  nSeqEvento: number,
  verAplic?: string
): string {
  checkRtcModel(model, chNFe);
  const va = resolveVerAplic(verAplic, config.verAplic);
  const tagAdic = reformEventHeader(config, va, 1) + `<indQuitacao>1</indQuitacao>`;
  return wrapReformEvent(config, "112110", chNFe, nSeqEvento, tagAdic, va);
}

// ── Event builders ───────────────────────────────────────────────────────────

/**
 * Item for deemed credit appropriation event
 *
 * [pt-BR] Item para o evento de apropriacao de credito presumido
 */
export interface CredPresumidoItem {
  /** Item number / [pt-BR] Numero do item */
  item: number;
  /** Tax base value / [pt-BR] Valor da base de calculo */
  vBC: number;
  /** IBS deemed credit data / [pt-BR] Dados do credito presumido IBS */
  gIBS?: { cCredPres: string; pCredPres: number; vCredPres: number };
  /** CBS deemed credit data / [pt-BR] Dados do credito presumido CBS */
  gCBS?: { cCredPres: string; pCredPres: number; vCredPres: number };
}

/**
 * tpEvento=211110 -- Deemed credit appropriation request
 *
 * [pt-BR] tpEvento=211110 -- Solicitacao de Apropriacao de Credito Presumido
 */
export function buildSolApropCredPresumido(
  config: SefazReformConfig,
  chNFe: string,
  nSeqEvento: number,
  itens: CredPresumidoItem[],
  verAplic?: string
): string {
  const va = resolveVerAplic(verAplic, config.verAplic);
  let tagAdic = reformEventHeader(config, va, 2);

  for (const item of itens) {
    const bc = fmt2(item.vBC);
    tagAdic += `<gCredPres nItem="${item.item}"><vBC>${bc}</vBC>`;
    if (item.gIBS) {
      tagAdic += `<gIBS>`
        + `<cCredPres>${item.gIBS.cCredPres}</cCredPres>`
        + `<pCredPres>${fmt4(item.gIBS.pCredPres)}</pCredPres>`
        + `<vCredPres>${fmt2(item.gIBS.vCredPres)}</vCredPres>`
        + `</gIBS>`;
    }
    if (item.gCBS) {
      tagAdic += `<gCBS>`
        + `<cCredPres>${item.gCBS.cCredPres}</cCredPres>`
        + `<pCredPres>${fmt4(item.gCBS.pCredPres)}</pCredPres>`
        + `<vCredPres>${fmt2(item.gCBS.vCredPres)}</vCredPres>`
        + `</gCBS>`;
    }
    tagAdic += `</gCredPres>`;
  }

  return wrapReformEvent(config, "211110", chNFe, nSeqEvento, tagAdic, va);
}

/**
 * Item for personal consumption destination event
 *
 * [pt-BR] Item para o evento de destinacao para consumo pessoal
 */
export interface ConsumoItem {
  /** Item number / [pt-BR] Numero do item */
  item: number;
  /** IBS tax value / [pt-BR] Valor do IBS */
  vIBS: number;
  /** CBS tax value / [pt-BR] Valor do CBS */
  vCBS: number;
  /** Consumed quantity / [pt-BR] Quantidade consumida */
  quantity: number;
  /** Unit of measurement / [pt-BR] Unidade de medida */
  unit: string;
  /** Referenced DFe access key / [pt-BR] Chave de acesso do DF-e referenciado */
  chave?: string;
  /** Referenced item number / [pt-BR] Numero do item referenciado */
  nItem?: number;
}

/**
 * tpEvento=211120 -- Item destination for personal consumption
 *
 * [pt-BR] tpEvento=211120 -- Destinacao de item para consumo pessoal
 */
export function buildDestinoConsumoPessoal(
  config: SefazReformConfig,
  chNFe: string,
  nSeqEvento: number,
  tpAutor: number,
  itens: ConsumoItem[],
  verAplic?: string
): string {
  const va = resolveVerAplic(verAplic, config.verAplic);
  let tagAdic = reformEventHeader(config, va, tpAutor);

  for (const item of itens) {
    tagAdic += `<gConsumo nItem="${item.item}">`
      + `<vIBS>${fmt2(item.vIBS)}</vIBS>`
      + `<vCBS>${fmt2(item.vCBS)}</vCBS>`
      + `<gControleEstoque>`
      + `<qConsumo>${fmt4(item.quantity)}</qConsumo>`
      + `<uConsumo>${item.unit}</uConsumo>`
      + `</gControleEstoque>`;
    if (item.chave && item.nItem != null) {
      tagAdic += `<DFeReferenciado>`
        + `<chaveAcesso>${item.chave}</chaveAcesso>`
        + `<nItem>${item.nItem}</nItem>`
        + `</DFeReferenciado>`;
    }
    tagAdic += `</gConsumo>`;
  }

  return wrapReformEvent(config, "211120", chNFe, nSeqEvento, tagAdic, va);
}

/**
 * tpEvento=211128 -- Debit acceptance in tax assessment
 *
 * [pt-BR] tpEvento=211128 -- Aceite de debito na apuracao
 */
export function buildAceiteDebito(
  config: SefazReformConfig,
  chNFe: string,
  nSeqEvento: number,
  indAceitacao: number,
  verAplic?: string
): string {
  const va = resolveVerAplic(verAplic, config.verAplic);
  const tagAdic = reformEventHeader(config, va, 2) + `<indAceitacao>${indAceitacao}</indAceitacao>`;
  return wrapReformEvent(config, "211128", chNFe, nSeqEvento, tagAdic, va);
}

/**
 * Item for asset immobilization event
 *
 * [pt-BR] Item para o evento de imobilizacao de ativo
 */
export interface ImobilizacaoItem {
  /** Item number / [pt-BR] Numero do item */
  item: number;
  /** IBS tax value / [pt-BR] Valor do IBS */
  vIBS: number;
  /** CBS tax value / [pt-BR] Valor do CBS */
  vCBS: number;
  /** Immobilized quantity / [pt-BR] Quantidade imobilizada */
  quantity: number;
  /** Unit of measurement / [pt-BR] Unidade de medida */
  unit: string;
}

/**
 * tpEvento=211130 -- Item immobilization (fixed asset registration)
 *
 * [pt-BR] tpEvento=211130 -- Imobilizacao de Item
 */
export function buildImobilizacaoItem(
  config: SefazReformConfig,
  chNFe: string,
  nSeqEvento: number,
  itens: ImobilizacaoItem[],
  verAplic?: string
): string {
  const va = resolveVerAplic(verAplic, config.verAplic);
  let tagAdic = reformEventHeader(config, va, 2);

  for (const item of itens) {
    tagAdic += `<gImobilizacao nItem="${item.item}">`
      + `<vIBS>${fmt2(item.vIBS)}</vIBS>`
      + `<vCBS>${fmt2(item.vCBS)}</vCBS>`
      + `<gControleEstoque>`
      + `<qImobilizado>${fmt4(item.quantity)}</qImobilizado>`
      + `<uImobilizado>${item.unit}</uImobilizado>`
      + `</gControleEstoque>`
      + `</gImobilizacao>`;
  }

  return wrapReformEvent(config, "211130", chNFe, nSeqEvento, tagAdic, va);
}

/**
 * Item for fuel credit appropriation event
 *
 * [pt-BR] Item para o evento de apropriacao de credito de combustivel
 */
export interface CombustivelItem {
  /** Item number / [pt-BR] Numero do item */
  item: number;
  /** IBS tax value / [pt-BR] Valor do IBS */
  vIBS: number;
  /** CBS tax value / [pt-BR] Valor do CBS */
  vCBS: number;
  /** Fuel quantity / [pt-BR] Quantidade de combustivel */
  quantity: number;
  /** Unit of measurement / [pt-BR] Unidade de medida */
  unit: string;
}

/**
 * tpEvento=211140 -- Fuel credit appropriation request
 *
 * [pt-BR] tpEvento=211140 -- Solicitacao de Apropriacao de Credito de Combustivel
 */
export function buildApropriacaoCreditoComb(
  config: SefazReformConfig,
  chNFe: string,
  nSeqEvento: number,
  itens: CombustivelItem[],
  verAplic?: string
): string {
  const va = resolveVerAplic(verAplic, config.verAplic);
  let tagAdic = reformEventHeader(config, va, 2);

  for (const item of itens) {
    tagAdic += `<gConsumoComb nItem="${item.item}">`
      + `<vIBS>${fmt2(item.vIBS)}</vIBS>`
      + `<vCBS>${fmt2(item.vCBS)}</vCBS>`
      + `<gControleEstoque>`
      + `<qComb>${fmt4(item.quantity)}</qComb>`
      + `<uComb>${item.unit}</uComb>`
      + `</gControleEstoque>`
      + `</gConsumoComb>`;
  }

  return wrapReformEvent(config, "211140", chNFe, nSeqEvento, tagAdic, va);
}

/**
 * Item for goods and services credit appropriation event
 *
 * [pt-BR] Item para o evento de apropriacao de credito para bens e servicos
 */
export interface CreditoBensItem {
  /** Item number / [pt-BR] Numero do item */
  item: number;
  /** IBS credit value / [pt-BR] Valor do credito IBS */
  vCredIBS: number;
  /** CBS credit value / [pt-BR] Valor do credito CBS */
  vCredCBS: number;
}

/**
 * tpEvento=211150 -- Goods and services credit appropriation request
 *
 * [pt-BR] tpEvento=211150 -- Solicitacao de Apropriacao de Credito para bens e servicos
 */
export function buildApropriacaoCreditoBens(
  config: SefazReformConfig,
  chNFe: string,
  nSeqEvento: number,
  itens: CreditoBensItem[],
  verAplic?: string
): string {
  const va = resolveVerAplic(verAplic, config.verAplic);
  let tagAdic = reformEventHeader(config, va, 2);

  for (const item of itens) {
    tagAdic += `<gCredito nItem="${item.item}">`
      + `<vCredIBS>${fmt2(item.vCredIBS)}</vCredIBS>`
      + `<vCredCBS>${fmt2(item.vCredCBS)}</vCredCBS>`
      + `</gCredito>`;
  }

  return wrapReformEvent(config, "211150", chNFe, nSeqEvento, tagAdic, va);
}

/**
 * tpEvento=212110 -- Manifestation on IBS credit transfer request
 *
 * [pt-BR] tpEvento=212110 -- Manifestacao sobre Pedido de Transferencia de Credito de IBS
 */
export function buildManifestacaoTransfCredIBS(
  config: SefazReformConfig,
  chNFe: string,
  nSeqEvento: number,
  indAceitacao: number,
  verAplic?: string
): string {
  const va = resolveVerAplic(verAplic, config.verAplic);
  const tagAdic = reformEventHeader(config, va, 8) + `<indAceitacao>${indAceitacao}</indAceitacao>`;
  return wrapReformEvent(config, "212110", chNFe, nSeqEvento, tagAdic, va);
}

/**
 * tpEvento=212120 -- Manifestation on CBS credit transfer request
 *
 * [pt-BR] tpEvento=212120 -- Manifestacao sobre Pedido de Transferencia de Credito de CBS
 */
export function buildManifestacaoTransfCredCBS(
  config: SefazReformConfig,
  chNFe: string,
  nSeqEvento: number,
  indAceitacao: number,
  verAplic?: string
): string {
  const va = resolveVerAplic(verAplic, config.verAplic);
  const tagAdic = reformEventHeader(config, va, 8) + `<indAceitacao>${indAceitacao}</indAceitacao>`;
  return wrapReformEvent(config, "212120", chNFe, nSeqEvento, tagAdic, va);
}

/**
 * tpEvento=110001 -- Event cancellation (cancel a previously registered event)
 *
 * [pt-BR] tpEvento=110001 -- Cancelamento de Evento
 */
export function buildCancelaEvento(
  config: SefazReformConfig,
  chNFe: string,
  nSeqEvento: number,
  tpEventoAut: string,
  nProtEvento: string,
  verAplic?: string
): string {
  const va = resolveVerAplic(verAplic, config.verAplic);
  const tagAdic = reformEventHeader(config, va)
    + `<tpEventoAut>${tpEventoAut}</tpEventoAut>`
    + `<nProtEvento>${nProtEvento}</nProtEvento>`;
  return wrapReformEvent(config, "110001", chNFe, nSeqEvento, tagAdic, va);
}

/**
 * Item for ALC/ZFM import not converted to exemption event
 *
 * [pt-BR] Item para o evento de importacao em ALC/ZFM nao convertida em isencao
 */
export interface ImportacaoZFMItem {
  /** Item number / [pt-BR] Numero do item */
  item: number;
  /** IBS tax value / [pt-BR] Valor do IBS */
  vIBS: number;
  /** CBS tax value / [pt-BR] Valor do CBS */
  vCBS: number;
  /** Quantity / [pt-BR] Quantidade */
  quantity: number;
  /** Unit of measurement / [pt-BR] Unidade de medida */
  unit: string;
}

/**
 * tpEvento=112120 -- ALC/ZFM import not converted to exemption
 *
 * [pt-BR] tpEvento=112120 -- Importacao em ALC/ZFM nao convertida em isencao
 */
export function buildImportacaoZFM(
  config: SefazReformConfig,
  chNFe: string,
  nSeqEvento: number,
  itens: ImportacaoZFMItem[],
  verAplic?: string
): string {
  const va = resolveVerAplic(verAplic, config.verAplic);
  let tagAdic = reformEventHeader(config, va, 1);

  for (const item of itens) {
    tagAdic += `<gConsumo nItem="${item.item}">`
      + `<vIBS>${fmt2(item.vIBS)}</vIBS>`
      + `<vCBS>${fmt2(item.vCBS)}</vCBS>`
      + `<gControleEstoque>`
      + `<qtde>${fmt4(item.quantity)}</qtde>`
      + `<unidade>${item.unit}</unidade>`
      + `</gControleEstoque>`
      + `</gConsumo>`;
  }

  return wrapReformEvent(config, "112120", chNFe, nSeqEvento, tagAdic, va);
}

/**
 * Item for perishment/loss/theft by acquirer event (FOB)
 *
 * [pt-BR] Item para o evento de perecimento/perda/roubo/furto pelo adquirente (FOB)
 */
export interface PerecimentoAdquirenteItem {
  /** Item number / [pt-BR] Numero do item */
  item: number;
  /** IBS tax value / [pt-BR] Valor do IBS */
  vIBS: number;
  /** CBS tax value / [pt-BR] Valor do CBS */
  vCBS: number;
  /** Quantity / [pt-BR] Quantidade */
  quantity: number;
  /** Unit of measurement / [pt-BR] Unidade de medida */
  unit: string;
}

/**
 * tpEvento=211124 -- Perishment, loss, theft by acquirer (FOB)
 *
 * [pt-BR] tpEvento=211124 -- Perecimento, perda, roubo ou furto pelo adquirente (FOB)
 */
export function buildRouboPerdaTransporteAdquirente(
  config: SefazReformConfig,
  chNFe: string,
  nSeqEvento: number,
  itens: PerecimentoAdquirenteItem[],
  verAplic?: string
): string {
  const va = resolveVerAplic(verAplic, config.verAplic);
  let tagAdic = reformEventHeader(config, va, 2);

  for (const item of itens) {
    tagAdic += `<gPerecimento nItem="${item.item}">`
      + `<vIBS>${fmt2(item.vIBS)}</vIBS>`
      + `<vCBS>${fmt2(item.vCBS)}</vCBS>`
      + `<gControleEstoque>`
      + `<qPerecimento>${fmt4(item.quantity)}</qPerecimento>`
      + `<uPerecimento>${item.unit}</uPerecimento>`
      + `</gControleEstoque>`
      + `</gPerecimento>`;
  }

  return wrapReformEvent(config, "211124", chNFe, nSeqEvento, tagAdic, va);
}

/**
 * Item for perishment/loss/theft by supplier event (CIF)
 *
 * [pt-BR] Item para o evento de perecimento/perda/roubo/furto pelo fornecedor (CIF)
 */
export interface PerecimentoFornecedorItem {
  /** Item number / [pt-BR] Numero do item */
  item: number;
  /** IBS tax value / [pt-BR] Valor do IBS */
  vIBS: number;
  /** CBS tax value / [pt-BR] Valor do CBS */
  vCBS: number;
  /** IBS value in stock control / [pt-BR] Valor do IBS no controle de estoque */
  gControleEstoque_vIBS: number;
  /** CBS value in stock control / [pt-BR] Valor do CBS no controle de estoque */
  gControleEstoque_vCBS: number;
  /** Quantity / [pt-BR] Quantidade */
  quantity: number;
  /** Unit of measurement / [pt-BR] Unidade de medida */
  unit: string;
}

/**
 * tpEvento=112130 -- Perishment, loss, theft by supplier (CIF)
 *
 * [pt-BR] tpEvento=112130 -- Perecimento, perda, roubo ou furto pelo fornecedor (CIF)
 */
export function buildRouboPerdaTransporteFornecedor(
  config: SefazReformConfig,
  chNFe: string,
  nSeqEvento: number,
  itens: PerecimentoFornecedorItem[],
  verAplic?: string
): string {
  const va = resolveVerAplic(verAplic, config.verAplic);
  let tagAdic = reformEventHeader(config, va, 1);

  for (const item of itens) {
    tagAdic += `<gPerecimento nItem="${item.item}">`
      + `<vIBS>${fmt2(item.vIBS)}</vIBS>`
      + `<vCBS>${fmt2(item.vCBS)}</vCBS>`
      + `<gControleEstoque>`
      + `<qPerecimento>${fmt4(item.quantity)}</qPerecimento>`
      + `<uPerecimento>${item.unit}</uPerecimento>`
      + `<vIBS>${fmt2(item.gControleEstoque_vIBS)}</vIBS>`
      + `<vCBS>${fmt2(item.gControleEstoque_vCBS)}</vCBS>`
      + `</gControleEstoque>`
      + `</gPerecimento>`;
  }

  return wrapReformEvent(config, "112130", chNFe, nSeqEvento, tagAdic, va);
}

/**
 * Item for unfulfilled supply with prepayment event
 *
 * [pt-BR] Item para o evento de fornecimento nao realizado com pagamento antecipado
 */
export interface ItemNaoFornecido {
  /** Item number / [pt-BR] Numero do item */
  item: number;
  /** IBS tax value / [pt-BR] Valor do IBS */
  vIBS: number;
  /** CBS tax value / [pt-BR] Valor do CBS */
  vCBS: number;
  /** Unsupplied quantity / [pt-BR] Quantidade nao fornecida */
  quantity: number;
  /** Unit of measurement / [pt-BR] Unidade de medida */
  unit: string;
}

/**
 * tpEvento=112140 -- Unfulfilled supply with prepayment
 *
 * [pt-BR] tpEvento=112140 -- Fornecimento nao realizado com pagamento antecipado
 */
export function buildFornecimentoNaoRealizado(
  config: SefazReformConfig,
  chNFe: string,
  nSeqEvento: number,
  itens: ItemNaoFornecido[],
  verAplic?: string
): string {
  const va = resolveVerAplic(verAplic, config.verAplic);
  let tagAdic = reformEventHeader(config, va, 1);

  for (const item of itens) {
    tagAdic += `<gItemNaoFornecido nItem="${item.item}">`
      + `<vIBS>${fmt2(item.vIBS)}</vIBS>`
      + `<vCBS>${fmt2(item.vCBS)}</vCBS>`
      + `<gControleEstoque>`
      + `<qNaoFornecida>${fmt4(item.quantity)}</qNaoFornecida>`
      + `<uNaoFornecida>${item.unit}</uNaoFornecida>`
      + `</gControleEstoque>`
      + `</gItemNaoFornecido>`;
  }

  return wrapReformEvent(config, "112140", chNFe, nSeqEvento, tagAdic, va);
}

/**
 * tpEvento=112150 -- Update estimated delivery date
 *
 * [pt-BR] tpEvento=112150 -- Atualizacao da data de previsao de entrega
 */
export function buildAtualizacaoDataEntrega(
  config: SefazReformConfig,
  chNFe: string,
  nSeqEvento: number,
  dataPrevista: string,
  verAplic?: string
): string {
  const va = resolveVerAplic(verAplic, config.verAplic);
  const tagAdic = reformEventHeader(config, va, 1) + `<dPrevEntrega>${dataPrevista}</dPrevEntrega>`;
  return wrapReformEvent(config, "112150", chNFe, nSeqEvento, tagAdic, va);
}
