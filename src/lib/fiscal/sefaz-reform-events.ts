/**
 * SEFAZ Reform Events — IBS/CBS tax reform (PL_010).
 *
 * Each function builds the full envEvento XML for a specific tpEvento code.
 * These mirror the PHP TraitEventsRTC methods.
 *
 * The PHP code wraps tagAdic inside:
 *   <envEvento><evento><infEvento>...<detEvento>...<descEvento>...</descEvento>tagAdic</detEvento></infEvento></evento></envEvento>
 *
 * We replicate the same structure so tests can assert on string containment.
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt2(v: number): string {
  return v.toFixed(2);
}

function fmt4(v: number): string {
  return v.toFixed(4);
}

/** Event type code to description mapping */
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

interface EventEnvelopeParams {
  tpEvento: string;
  chNFe: string;
  nSeqEvento: number;
  cOrgao: string;
  tpAmb: number;
  cnpj: string;
  tagAdic: string;
  verAplic: string;
}

function buildEventEnvelope(p: EventEnvelopeParams): string {
  const verEvento = "1.00";
  const sSeqEvento = String(p.nSeqEvento).padStart(2, "0");
  const eventId = `ID${p.tpEvento}${p.chNFe}${sSeqEvento}`;
  const descEvento = EVENT_DESCRIPTIONS[p.tpEvento] ?? "Evento";
  const dhEvento = new Date().toISOString().replace("Z", "-03:00");
  const lote = Date.now().toString();

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

// ── Config type ──────────────────────────────────────────────────────────────

export interface SefazReformConfig {
  /** IBGE state code, e.g. "35" for SP */
  cOrgao: string;
  /** Tax environment: 1=production, 2=homologation */
  tpAmb: number;
  /** CNPJ of the company */
  cnpj: string;
  /** Application version identifier */
  verAplic: string;
}

/**
 * Resolve verAplic: explicit > config > default "4.00"
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
 * RTC events only apply to model 55.
 * Ported from PHP TraitEventsRTC::checkModel().
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
 * tpEvento=112110 — Informacao de efetivo pagamento integral
 * Ported from PHP TraitEventsRTC::sefazInfoPagtoIntegral()
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
  const tagAdic = `<cOrgaoAutor>${config.cOrgao}</cOrgaoAutor>`
    + `<tpAutor>1</tpAutor>`
    + `<verAplic>${va}</verAplic>`
    + `<indQuitacao>1</indQuitacao>`;

  return buildEventEnvelope({
    tpEvento: "112110",
    chNFe,
    nSeqEvento,
    cOrgao: config.cOrgao,
    tpAmb: config.tpAmb,
    cnpj: config.cnpj,
    tagAdic,
    verAplic: va,
  });
}

// ── Event builders ───────────────────────────────────────────────────────────

export interface CredPresumidoItem {
  item: number;
  vBC: number;
  gIBS?: { cCredPres: string; pCredPres: number; vCredPres: number };
  gCBS?: { cCredPres: string; pCredPres: number; vCredPres: number };
}

/**
 * tpEvento=211110 — Solicitacao de Apropriacao de Credito Presumido
 */
export function buildSolApropCredPresumido(
  config: SefazReformConfig,
  chNFe: string,
  nSeqEvento: number,
  itens: CredPresumidoItem[],
  verAplic?: string
): string {
  const va = resolveVerAplic(verAplic, config.verAplic);
  let tagAdic = `<cOrgaoAutor>${config.cOrgao}</cOrgaoAutor>`
    + `<tpAutor>2</tpAutor>`
    + `<verAplic>${va}</verAplic>`;

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

  return buildEventEnvelope({
    tpEvento: "211110",
    chNFe, nSeqEvento,
    cOrgao: config.cOrgao,
    tpAmb: config.tpAmb,
    cnpj: config.cnpj,
    tagAdic,
    verAplic: va,
  });
}

export interface ConsumoItem {
  item: number;
  vIBS: number;
  vCBS: number;
  quantidade: number;
  unidade: string;
  chave?: string;
  nItem?: number;
}

/**
 * tpEvento=211120 — Destinacao de item para consumo pessoal
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
  let tagAdic = `<cOrgaoAutor>${config.cOrgao}</cOrgaoAutor>`
    + `<tpAutor>${tpAutor}</tpAutor>`
    + `<verAplic>${va}</verAplic>`;

  for (const item of itens) {
    tagAdic += `<gConsumo nItem="${item.item}">`
      + `<vIBS>${fmt2(item.vIBS)}</vIBS>`
      + `<vCBS>${fmt2(item.vCBS)}</vCBS>`
      + `<gControleEstoque>`
      + `<qConsumo>${fmt4(item.quantidade)}</qConsumo>`
      + `<uConsumo>${item.unidade}</uConsumo>`
      + `</gControleEstoque>`;
    if (item.chave && item.nItem != null) {
      tagAdic += `<DFeReferenciado>`
        + `<chaveAcesso>${item.chave}</chaveAcesso>`
        + `<nItem>${item.nItem}</nItem>`
        + `</DFeReferenciado>`;
    }
    tagAdic += `</gConsumo>`;
  }

  return buildEventEnvelope({
    tpEvento: "211120",
    chNFe, nSeqEvento,
    cOrgao: config.cOrgao,
    tpAmb: config.tpAmb,
    cnpj: config.cnpj,
    tagAdic,
    verAplic: va,
  });
}

/**
 * tpEvento=211128 — Aceite de debito na apuracao
 */
export function buildAceiteDebito(
  config: SefazReformConfig,
  chNFe: string,
  nSeqEvento: number,
  indAceitacao: number,
  verAplic?: string
): string {
  const va = resolveVerAplic(verAplic, config.verAplic);
  const tagAdic = `<cOrgaoAutor>${config.cOrgao}</cOrgaoAutor>`
    + `<tpAutor>2</tpAutor>`
    + `<verAplic>${va}</verAplic>`
    + `<indAceitacao>${indAceitacao}</indAceitacao>`;

  return buildEventEnvelope({
    tpEvento: "211128",
    chNFe, nSeqEvento,
    cOrgao: config.cOrgao,
    tpAmb: config.tpAmb,
    cnpj: config.cnpj,
    tagAdic,
    verAplic: va,
  });
}

export interface ImobilizacaoItem {
  item: number;
  vIBS: number;
  vCBS: number;
  quantidade: number;
  unidade: string;
}

/**
 * tpEvento=211130 — Imobilizacao de Item
 */
export function buildImobilizacaoItem(
  config: SefazReformConfig,
  chNFe: string,
  nSeqEvento: number,
  itens: ImobilizacaoItem[],
  verAplic?: string
): string {
  const va = resolveVerAplic(verAplic, config.verAplic);
  let tagAdic = `<cOrgaoAutor>${config.cOrgao}</cOrgaoAutor>`
    + `<tpAutor>2</tpAutor>`
    + `<verAplic>${va}</verAplic>`;

  for (const item of itens) {
    tagAdic += `<gImobilizacao nItem="${item.item}">`
      + `<vIBS>${fmt2(item.vIBS)}</vIBS>`
      + `<vCBS>${fmt2(item.vCBS)}</vCBS>`
      + `<gControleEstoque>`
      + `<qImobilizado>${fmt4(item.quantidade)}</qImobilizado>`
      + `<uImobilizado>${item.unidade}</uImobilizado>`
      + `</gControleEstoque>`
      + `</gImobilizacao>`;
  }

  return buildEventEnvelope({
    tpEvento: "211130",
    chNFe, nSeqEvento,
    cOrgao: config.cOrgao,
    tpAmb: config.tpAmb,
    cnpj: config.cnpj,
    tagAdic,
    verAplic: va,
  });
}

export interface CombustivelItem {
  item: number;
  vIBS: number;
  vCBS: number;
  quantidade: number;
  unidade: string;
}

/**
 * tpEvento=211140 — Solicitacao de Apropriacao de Credito de Combustivel
 */
export function buildApropriacaoCreditoComb(
  config: SefazReformConfig,
  chNFe: string,
  nSeqEvento: number,
  itens: CombustivelItem[],
  verAplic?: string
): string {
  const va = resolveVerAplic(verAplic, config.verAplic);
  let tagAdic = `<cOrgaoAutor>${config.cOrgao}</cOrgaoAutor>`
    + `<tpAutor>2</tpAutor>`
    + `<verAplic>${va}</verAplic>`;

  for (const item of itens) {
    tagAdic += `<gConsumoComb nItem="${item.item}">`
      + `<vIBS>${fmt2(item.vIBS)}</vIBS>`
      + `<vCBS>${fmt2(item.vCBS)}</vCBS>`
      + `<gControleEstoque>`
      + `<qComb>${fmt4(item.quantidade)}</qComb>`
      + `<uComb>${item.unidade}</uComb>`
      + `</gControleEstoque>`
      + `</gConsumoComb>`;
  }

  return buildEventEnvelope({
    tpEvento: "211140",
    chNFe, nSeqEvento,
    cOrgao: config.cOrgao,
    tpAmb: config.tpAmb,
    cnpj: config.cnpj,
    tagAdic,
    verAplic: va,
  });
}

export interface CreditoBensItem {
  item: number;
  vCredIBS: number;
  vCredCBS: number;
}

/**
 * tpEvento=211150 — Solicitacao de Apropriacao de Credito para bens e servicos
 */
export function buildApropriacaoCreditoBens(
  config: SefazReformConfig,
  chNFe: string,
  nSeqEvento: number,
  itens: CreditoBensItem[],
  verAplic?: string
): string {
  const va = resolveVerAplic(verAplic, config.verAplic);
  let tagAdic = `<cOrgaoAutor>${config.cOrgao}</cOrgaoAutor>`
    + `<tpAutor>2</tpAutor>`
    + `<verAplic>${va}</verAplic>`;

  for (const item of itens) {
    tagAdic += `<gCredito nItem="${item.item}">`
      + `<vCredIBS>${fmt2(item.vCredIBS)}</vCredIBS>`
      + `<vCredCBS>${fmt2(item.vCredCBS)}</vCredCBS>`
      + `</gCredito>`;
  }

  return buildEventEnvelope({
    tpEvento: "211150",
    chNFe, nSeqEvento,
    cOrgao: config.cOrgao,
    tpAmb: config.tpAmb,
    cnpj: config.cnpj,
    tagAdic,
    verAplic: va,
  });
}

/**
 * tpEvento=212110 — Manifestacao sobre Pedido de Transferencia de Credito de IBS
 */
export function buildManifestacaoTransfCredIBS(
  config: SefazReformConfig,
  chNFe: string,
  nSeqEvento: number,
  indAceitacao: number,
  verAplic?: string
): string {
  const va = resolveVerAplic(verAplic, config.verAplic);
  const tagAdic = `<cOrgaoAutor>${config.cOrgao}</cOrgaoAutor>`
    + `<tpAutor>8</tpAutor>`
    + `<verAplic>${va}</verAplic>`
    + `<indAceitacao>${indAceitacao}</indAceitacao>`;

  return buildEventEnvelope({
    tpEvento: "212110",
    chNFe, nSeqEvento,
    cOrgao: config.cOrgao,
    tpAmb: config.tpAmb,
    cnpj: config.cnpj,
    tagAdic,
    verAplic: va,
  });
}

/**
 * tpEvento=212120 — Manifestacao sobre Pedido de Transferencia de Credito de CBS
 */
export function buildManifestacaoTransfCredCBS(
  config: SefazReformConfig,
  chNFe: string,
  nSeqEvento: number,
  indAceitacao: number,
  verAplic?: string
): string {
  const va = resolveVerAplic(verAplic, config.verAplic);
  const tagAdic = `<cOrgaoAutor>${config.cOrgao}</cOrgaoAutor>`
    + `<tpAutor>8</tpAutor>`
    + `<verAplic>${va}</verAplic>`
    + `<indAceitacao>${indAceitacao}</indAceitacao>`;

  return buildEventEnvelope({
    tpEvento: "212120",
    chNFe, nSeqEvento,
    cOrgao: config.cOrgao,
    tpAmb: config.tpAmb,
    cnpj: config.cnpj,
    tagAdic,
    verAplic: va,
  });
}

/**
 * tpEvento=110001 — Cancelamento de Evento
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
  const tagAdic = `<cOrgaoAutor>${config.cOrgao}</cOrgaoAutor>`
    + `<verAplic>${va}</verAplic>`
    + `<tpEventoAut>${tpEventoAut}</tpEventoAut>`
    + `<nProtEvento>${nProtEvento}</nProtEvento>`;

  return buildEventEnvelope({
    tpEvento: "110001",
    chNFe, nSeqEvento,
    cOrgao: config.cOrgao,
    tpAmb: config.tpAmb,
    cnpj: config.cnpj,
    tagAdic,
    verAplic: va,
  });
}

export interface ImportacaoZFMItem {
  item: number;
  vIBS: number;
  vCBS: number;
  quantidade: number;
  unidade: string;
}

/**
 * tpEvento=112120 — Importacao em ALC/ZFM nao convertida em isencao
 */
export function buildImportacaoZFM(
  config: SefazReformConfig,
  chNFe: string,
  nSeqEvento: number,
  itens: ImportacaoZFMItem[],
  verAplic?: string
): string {
  const va = resolveVerAplic(verAplic, config.verAplic);
  let tagAdic = `<cOrgaoAutor>${config.cOrgao}</cOrgaoAutor>`
    + `<tpAutor>1</tpAutor>`
    + `<verAplic>${va}</verAplic>`;

  for (const item of itens) {
    tagAdic += `<gConsumo nItem="${item.item}">`
      + `<vIBS>${fmt2(item.vIBS)}</vIBS>`
      + `<vCBS>${fmt2(item.vCBS)}</vCBS>`
      + `<gControleEstoque>`
      + `<qtde>${fmt4(item.quantidade)}</qtde>`
      + `<unidade>${item.unidade}</unidade>`
      + `</gControleEstoque>`
      + `</gConsumo>`;
  }

  return buildEventEnvelope({
    tpEvento: "112120",
    chNFe, nSeqEvento,
    cOrgao: config.cOrgao,
    tpAmb: config.tpAmb,
    cnpj: config.cnpj,
    tagAdic,
    verAplic: va,
  });
}

export interface PerecimentoAdquirenteItem {
  item: number;
  vIBS: number;
  vCBS: number;
  quantidade: number;
  unidade: string;
}

/**
 * tpEvento=211124 — Perecimento, perda, roubo ou furto (adquirente, FOB)
 */
export function buildRouboPerdaTransporteAdquirente(
  config: SefazReformConfig,
  chNFe: string,
  nSeqEvento: number,
  itens: PerecimentoAdquirenteItem[],
  verAplic?: string
): string {
  const va = resolveVerAplic(verAplic, config.verAplic);
  let tagAdic = `<cOrgaoAutor>${config.cOrgao}</cOrgaoAutor>`
    + `<tpAutor>2</tpAutor>`
    + `<verAplic>${va}</verAplic>`;

  for (const item of itens) {
    tagAdic += `<gPerecimento nItem="${item.item}">`
      + `<vIBS>${fmt2(item.vIBS)}</vIBS>`
      + `<vCBS>${fmt2(item.vCBS)}</vCBS>`
      + `<gControleEstoque>`
      + `<qPerecimento>${fmt4(item.quantidade)}</qPerecimento>`
      + `<uPerecimento>${item.unidade}</uPerecimento>`
      + `</gControleEstoque>`
      + `</gPerecimento>`;
  }

  return buildEventEnvelope({
    tpEvento: "211124",
    chNFe, nSeqEvento,
    cOrgao: config.cOrgao,
    tpAmb: config.tpAmb,
    cnpj: config.cnpj,
    tagAdic,
    verAplic: va,
  });
}

export interface PerecimentoFornecedorItem {
  item: number;
  vIBS: number;
  vCBS: number;
  gControleEstoque_vIBS: number;
  gControleEstoque_vCBS: number;
  quantidade: number;
  unidade: string;
}

/**
 * tpEvento=112130 — Perecimento, perda, roubo ou furto (fornecedor, CIF)
 */
export function buildRouboPerdaTransporteFornecedor(
  config: SefazReformConfig,
  chNFe: string,
  nSeqEvento: number,
  itens: PerecimentoFornecedorItem[],
  verAplic?: string
): string {
  const va = resolveVerAplic(verAplic, config.verAplic);
  let tagAdic = `<cOrgaoAutor>${config.cOrgao}</cOrgaoAutor>`
    + `<tpAutor>1</tpAutor>`
    + `<verAplic>${va}</verAplic>`;

  for (const item of itens) {
    tagAdic += `<gPerecimento nItem="${item.item}">`
      + `<vIBS>${fmt2(item.vIBS)}</vIBS>`
      + `<vCBS>${fmt2(item.vCBS)}</vCBS>`
      + `<gControleEstoque>`
      + `<qPerecimento>${fmt4(item.quantidade)}</qPerecimento>`
      + `<uPerecimento>${item.unidade}</uPerecimento>`
      + `<vIBS>${fmt2(item.gControleEstoque_vIBS)}</vIBS>`
      + `<vCBS>${fmt2(item.gControleEstoque_vCBS)}</vCBS>`
      + `</gControleEstoque>`
      + `</gPerecimento>`;
  }

  return buildEventEnvelope({
    tpEvento: "112130",
    chNFe, nSeqEvento,
    cOrgao: config.cOrgao,
    tpAmb: config.tpAmb,
    cnpj: config.cnpj,
    tagAdic,
    verAplic: va,
  });
}

export interface ItemNaoFornecido {
  item: number;
  vIBS: number;
  vCBS: number;
  quantidade: number;
  unidade: string;
}

/**
 * tpEvento=112140 — Fornecimento nao realizado com pagamento antecipado
 */
export function buildFornecimentoNaoRealizado(
  config: SefazReformConfig,
  chNFe: string,
  nSeqEvento: number,
  itens: ItemNaoFornecido[],
  verAplic?: string
): string {
  const va = resolveVerAplic(verAplic, config.verAplic);
  let tagAdic = `<cOrgaoAutor>${config.cOrgao}</cOrgaoAutor>`
    + `<tpAutor>1</tpAutor>`
    + `<verAplic>${va}</verAplic>`;

  for (const item of itens) {
    tagAdic += `<gItemNaoFornecido nItem="${item.item}">`
      + `<vIBS>${fmt2(item.vIBS)}</vIBS>`
      + `<vCBS>${fmt2(item.vCBS)}</vCBS>`
      + `<gControleEstoque>`
      + `<qNaoFornecida>${fmt4(item.quantidade)}</qNaoFornecida>`
      + `<uNaoFornecida>${item.unidade}</uNaoFornecida>`
      + `</gControleEstoque>`
      + `</gItemNaoFornecido>`;
  }

  return buildEventEnvelope({
    tpEvento: "112140",
    chNFe, nSeqEvento,
    cOrgao: config.cOrgao,
    tpAmb: config.tpAmb,
    cnpj: config.cnpj,
    tagAdic,
    verAplic: va,
  });
}

/**
 * tpEvento=112150 — Atualizacao da data de previsao de entrega
 */
export function buildAtualizacaoDataEntrega(
  config: SefazReformConfig,
  chNFe: string,
  nSeqEvento: number,
  dataPrevista: string,
  verAplic?: string
): string {
  const va = resolveVerAplic(verAplic, config.verAplic);
  const tagAdic = `<cOrgaoAutor>${config.cOrgao}</cOrgaoAutor>`
    + `<tpAutor>1</tpAutor>`
    + `<verAplic>${va}</verAplic>`
    + `<dPrevEntrega>${dataPrevista}</dPrevEntrega>`;

  return buildEventEnvelope({
    tpEvento: "112150",
    chNFe, nSeqEvento,
    cOrgao: config.cOrgao,
    tpAmb: config.tpAmb,
    cnpj: config.cnpj,
    tagAdic,
    verAplic: va,
  });
}
