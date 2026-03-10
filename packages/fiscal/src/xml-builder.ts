import { STATE_IBGE_CODES } from "./state-codes";
import { NFE_NAMESPACE, NFE_VERSION, PAYMENT_TYPES } from "./constants";
import { formatCents, formatDecimal } from "./format-utils";
import { tag, escapeXml } from "./xml-utils";
export { tag, escapeXml } from "./xml-utils";
import { buildIcmsXml, createIcmsTotals, mergeIcmsTotals, type IcmsTotals } from "./tax-icms";
import { buildPisXml, buildCofinsXml, buildIpiXml, buildIiXml } from "./tax-pis-cofins-ipi";
import { TaxId } from "./value-objects/tax-id";
import { AccessKey } from "./value-objects/access-key";
import type {
  AccessKeyParams,
  InvoiceBuildData,
  InvoiceItemData,
  PaymentData,
  InvoiceModel,
  EmissionType,
  RetTribData,
} from "./types";

/**
 * Build a complete NF-e or NFC-e XML (unsigned).
 * The XML follows layout 4.00 as defined by MOC.
 *
 * [pt-BR] Constrói o XML completo da NF-e/NFC-e (sem assinatura).
 * Segue o layout 4.00 conforme definido pelo MOC.
 *
 * @param data - Invoice build data with issuer, items, payments, etc.
 * [pt-BR] @param data - Dados de construção da nota com emitente, itens, pagamentos, etc.
 * @returns Object with unsigned XML string and 44-digit access key
 * [pt-BR] @returns Objeto com XML sem assinatura e chave de acesso de 44 dígitos
 */
export function buildInvoiceXml(data: InvoiceBuildData): {
  xml: string;
  accessKey: string;
} {
  const stateIbge = STATE_IBGE_CODES[data.issuer.stateCode];
  if (!stateIbge) {
    throw new Error(`Unknown state code: ${data.issuer.stateCode}`);
  }

  const numericCode = generateNumericCode();
  const yearMonth = formatYearMonth(data.issuedAt);

  const accessKeyParams: AccessKeyParams = {
    stateCode: stateIbge,
    yearMonth,
    taxId: data.issuer.taxId,
    model: data.model,
    series: data.series,
    number: data.number,
    emissionType: data.emissionType,
    numericCode,
  };

  const accessKey = buildAccessKey(accessKeyParams);
  const infNFeId = `NFe${accessKey}`;

  // Build items and accumulate tax totals
  const icmsTotals = createIcmsTotals();
  let totalProducts = 0;
  let totalIpi = 0;
  let totalPis = 0;
  let totalCofins = 0;
  let totalIi = 0;

  const detElements = data.items.map((item) => {
    totalProducts += item.totalPrice;
    const detResult = buildDet(item, data);
    mergeIcmsTotals(icmsTotals, detResult.icmsTotals);
    totalIpi += detResult.vIPI;
    totalPis += detResult.vPIS;
    totalCofins += detResult.vCOFINS;
    totalIi += detResult.vII;
    return detResult.xml;
  });

  const infNFe = tag("infNFe", { xmlns: NFE_NAMESPACE, versao: NFE_VERSION, Id: infNFeId }, [
    buildIde(data, stateIbge, numericCode, accessKey),
    buildEmit(data),
    ...(data.recipient ? [buildDest(data)] : []),
    ...(data.withdrawal ? [buildWithdrawal(data.withdrawal)] : []),
    ...(data.delivery ? [buildDelivery(data.delivery)] : []),
    ...(data.authorizedXml ? data.authorizedXml.map((a) => buildAutXml(a)) : []),
    ...detElements,
    buildTotal(totalProducts, icmsTotals, { vIPI: totalIpi, vPIS: totalPis, vCOFINS: totalCofins, vII: totalIi }, data.retTrib),
    buildTransp(data),
    ...(data.billing ? [buildCobr(data.billing)] : []),
    buildPag(data.payments, data.changeAmount, data.paymentCardDetails),
    ...(data.intermediary ? [buildIntermediary(data.intermediary)] : []),
    buildInfAdic(data),
    ...(data.export ? [buildExport(data.export)] : []),
    ...(data.purchase ? [buildPurchase(data.purchase)] : []),
    ...(data.techResponsible ? [buildTechResponsible(data.techResponsible)] : []),
  ]);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>${tag("NFe", { xmlns: NFE_NAMESPACE }, [infNFe])}`;

  return { xml, accessKey };
}

/**
 * Build the access key (chave de acesso) -- 44 digits.
 * Delegates to AccessKey.build(); kept for backward compatibility.
 *
 * [pt-BR] Gera a chave de acesso -- 44 dígitos.
 * Delega para AccessKey.build(); mantido para compatibilidade.
 *
 * @param params - Access key components (state, date, tax ID, model, etc.)
 * [pt-BR] @param params - Componentes da chave de acesso (UF, data, CNPJ, modelo, etc.)
 */
export function buildAccessKey(params: AccessKeyParams): string {
  return AccessKey.build(params).toString();
}

// ── XML group builders ──────────────────────────────────────────────────────

function buildIde(
  data: InvoiceBuildData,
  stateIbge: string,
  numericCode: string,
  accessKey: string
): string {
  // Build referenced documents (NFref) if present
  const refElements = buildReferences(data.references);

  return tag("ide", {}, [
    tag("cUF", {}, stateIbge),
    tag("cNF", {}, numericCode),
    tag("natOp", {}, data.operationNature),
    tag("mod", {}, String(data.model)),
    tag("serie", {}, String(data.series)),
    tag("nNF", {}, String(data.number)),
    tag("dhEmi", {}, formatDateTimeNfe(data.issuedAt, data.issuer.stateCode)),
    tag("tpNF", {}, String(data.operationType ?? 1)),
    tag("idDest", {}, "1"),
    tag("cMunFG", {}, data.issuer.cityCode),
    tag("tpImp", {}, data.printFormat ?? "1"),
    tag("tpEmis", {}, String(data.emissionType)),
    tag("cDV", {}, accessKey.slice(-1)),
    tag("tpAmb", {}, String(data.environment)),
    tag("finNFe", {}, String(data.purposeCode ?? 1)),
    tag("indFinal", {}, data.consumerType ?? "0"),
    tag("indPres", {}, data.buyerPresence ?? "0"),
    tag("indIntermed", {}, data.intermediaryIndicator ?? "0"),
    tag("procEmi", {}, data.emissionProcess ?? "0"),
    tag("verProc", {}, "FinOpenPOS 1.0"),
    ...refElements,
  ]);
}

/** Build address child tags (xLgr … xPais). */
function buildAddressFields(a: {
  street: string; number: string; complement?: string;
  district: string; cityCode: string; cityName: string;
  stateCode: string; zipCode?: string; includeCountry?: boolean;
}): string[] {
  return [
    tag("xLgr", {}, a.street),
    tag("nro", {}, a.number),
    ...(a.complement ? [tag("xCpl", {}, a.complement)] : []),
    tag("xBairro", {}, a.district),
    tag("cMun", {}, a.cityCode),
    tag("xMun", {}, a.cityName),
    tag("UF", {}, a.stateCode),
    ...(a.zipCode ? [tag("CEP", {}, a.zipCode)] : []),
    ...(a.includeCountry ? [tag("cPais", {}, "1058"), tag("xPais", {}, "Brasil")] : []),
  ];
}

function buildEmit(data: InvoiceBuildData): string {
  return tag("emit", {}, [
    tag("CNPJ", {}, data.issuer.taxId),
    tag("xNome", {}, data.issuer.companyName),
    ...(data.issuer.tradeName ? [tag("xFant", {}, data.issuer.tradeName)] : []),
    tag("enderEmit", {}, buildAddressFields({
      street: data.issuer.street, number: data.issuer.streetNumber,
      complement: data.issuer.addressComplement, district: data.issuer.district,
      cityCode: data.issuer.cityCode, cityName: data.issuer.cityName,
      stateCode: data.issuer.stateCode, zipCode: data.issuer.zipCode,
      includeCountry: true,
    })),
    tag("IE", {}, data.issuer.stateTaxId),
    tag("CRT", {}, String(data.issuer.taxRegime)),
  ]);
}

function buildDest(data: InvoiceBuildData): string {
  if (!data.recipient) return "";

  const tid = new TaxId(data.recipient.taxId);
  const taxIdTag = tag(tid.tagName(), {}, tid.padded());

  const isNfce = data.model === 65;

  const r = data.recipient;
  const uf = r.stateCode || data.issuer.stateCode;

  return tag("dest", {}, [
    taxIdTag,
    ...(r.name ? [tag("xNome", {}, r.name)] : []),
    ...(!isNfce
      ? [
          tag("enderDest", {}, [
            tag("xLgr", {}, r.street || data.issuer.street),
            tag("nro", {}, r.streetNumber || data.issuer.streetNumber),
            ...(r.complement ? [tag("xCpl", {}, r.complement)] : []),
            tag("xBairro", {}, r.district || data.issuer.district),
            tag("cMun", {}, r.cityCode || data.issuer.cityCode),
            tag("xMun", {}, r.cityName || data.issuer.cityName),
            tag("UF", {}, uf),
            tag("CEP", {}, r.zipCode || data.issuer.zipCode),
            tag("cPais", {}, "1058"),
            tag("xPais", {}, "Brasil"),
          ]),
        ]
      : []),
    tag("indIEDest", {}, r.stateTaxId ? "1" : "9"),
    ...(r.stateTaxId ? [tag("IE", {}, r.stateTaxId)] : []),
  ]);
}

interface DetResult {
  xml: string;
  icmsTotals: IcmsTotals;
  vIPI: number;
  vPIS: number;
  vCOFINS: number;
  vII: number;
}

function buildDet(item: InvoiceItemData, data: InvoiceBuildData): DetResult {
  // Build ICMS using the full tax module
  const isSimples = data.issuer.taxRegime === 1 || data.issuer.taxRegime === 2;
  const icmsResult = buildIcmsXml({
    taxRegime: data.issuer.taxRegime,
    orig: item.orig ?? "0",
    CST: isSimples ? undefined : item.icmsCst,
    CSOSN: isSimples ? (item.icmsCst || "102") : undefined,
    modBC: item.icmsModBC != null ? String(item.icmsModBC) : undefined,
    vBC: item.totalPrice,
    pICMS: item.icmsRate,
    vICMS: item.icmsAmount,
    pRedBC: item.icmsRedBC,
    modBCST: item.icmsModBCST != null ? String(item.icmsModBCST) : undefined,
    pMVAST: item.icmsPMVAST,
    pRedBCST: item.icmsRedBCST,
    vBCST: item.icmsVBCST,
    pICMSST: item.icmsPICMSST,
    vICMSST: item.icmsVICMSST,
    vICMSDeson: item.icmsVICMSDeson,
    motDesICMS: item.icmsMotDesICMS != null ? String(item.icmsMotDesICMS) : undefined,
    pFCP: item.icmsPFCP,
    vFCP: item.icmsVFCP,
    vBCFCP: item.icmsVBCFCP,
    pFCPST: item.icmsPFCPST,
    vFCPST: item.icmsVFCPST,
    vBCFCPST: item.icmsVBCFCPST,
    pCredSN: item.icmsPCredSN,
    vCredICMSSN: item.icmsVCredICMSSN,
    vICMSSubstituto: item.icmsVICMSSubstituto,
  });

  // Build PIS
  const pisXml = buildPisXml({
    CST: item.pisCst,
    vBC: item.pisVBC ?? 0,
    pPIS: item.pisPPIS ?? 0,
    vPIS: item.pisVPIS ?? 0,
    qBCProd: item.pisQBCProd,
    vAliqProd: item.pisVAliqProd,
  });

  // Build COFINS
  const cofinsXml = buildCofinsXml({
    CST: item.cofinsCst,
    vBC: item.cofinsVBC ?? 0,
    pCOFINS: item.cofinsPCOFINS ?? 0,
    vCOFINS: item.cofinsVCOFINS ?? 0,
    qBCProd: item.cofinsQBCProd,
    vAliqProd: item.cofinsVAliqProd,
  });

  // Build IPI (optional)
  let ipiXml = "";
  let vIPI = 0;
  if (item.ipiCst) {
    ipiXml = buildIpiXml({
      CST: item.ipiCst,
      cEnq: item.ipiCEnq ?? "999",
      vBC: item.ipiVBC,
      pIPI: item.ipiPIPI,
      vIPI: item.ipiVIPI,
      qUnid: item.ipiQUnid,
      vUnid: item.ipiVUnid,
    });
    vIPI = item.ipiVIPI ?? 0;
  }

  // Build II (optional, import only)
  let iiXml = "";
  let vII = 0;
  if (item.iiVBC) {
    iiXml = buildIiXml({
      vBC: item.iiVBC,
      vDespAdu: item.iiVDespAdu ?? 0,
      vII: item.iiVII ?? 0,
      vIOF: item.iiVIOF ?? 0,
    });
    vII = item.iiVII ?? 0;
  }

  // Build product-specific option elements (inside prod)
  const prodOptions: string[] = [];

  // rastro (batch tracking) — up to 500 per item
  if (item.rastro) {
    const rastros = item.rastro.slice(0, 500);
    for (const r of rastros) {
      prodOptions.push(
        tag("rastro", {}, [
          tag("nLote", {}, r.nLote),
          tag("qLote", {}, formatDecimal(r.qLote, 3)),
          tag("dFab", {}, r.dFab),
          tag("dVal", {}, r.dVal),
          ...(r.cAgreg ? [tag("cAgreg", {}, r.cAgreg)] : []),
        ])
      );
    }
  }

  // CHOICE group: veicProd, med, arma, comb, nRECOPI (mutually exclusive)
  if (item.veicProd) {
    const v = item.veicProd;
    prodOptions.push(
      tag("veicProd", {}, [
        tag("tpOp", {}, v.tpOp),
        tag("chassi", {}, v.chassi),
        tag("cCor", {}, v.cCor),
        tag("xCor", {}, v.xCor),
        tag("pot", {}, v.pot),
        tag("cilin", {}, v.cilin),
        tag("pesoL", {}, v.pesoL),
        tag("pesoB", {}, v.pesoB),
        tag("nSerie", {}, v.nSerie),
        tag("tpComb", {}, v.tpComb),
        tag("nMotor", {}, v.nMotor),
        tag("CMT", {}, v.CMT),
        tag("dist", {}, v.dist),
        tag("anoMod", {}, v.anoMod),
        tag("anoFab", {}, v.anoFab),
        tag("tpPint", {}, v.tpPint),
        tag("tpVeic", {}, v.tpVeic),
        tag("espVeic", {}, v.espVeic),
        tag("VIN", {}, v.VIN),
        tag("condVeic", {}, v.condVeic),
        tag("cMod", {}, v.cMod),
        tag("cCorDENATRAN", {}, v.cCorDENATRAN),
        tag("lota", {}, v.lota),
        tag("tpRest", {}, v.tpRest),
      ])
    );
  } else if (item.med) {
    const m = item.med;
    prodOptions.push(
      tag("med", {}, [
        ...(m.cProdANVISA ? [tag("cProdANVISA", {}, m.cProdANVISA)] : []),
        ...(m.xMotivoIsencao ? [tag("xMotivoIsencao", {}, m.xMotivoIsencao)] : []),
        tag("vPMC", {}, formatCents(m.vPMC)),
      ])
    );
  } else if (item.arma) {
    const arms = item.arma.slice(0, 500);
    for (const a of arms) {
      prodOptions.push(
        tag("arma", {}, [
          tag("tpArma", {}, a.tpArma),
          tag("nSerie", {}, a.nSerie),
          tag("nCano", {}, a.nCano),
          tag("descr", {}, a.descr),
        ])
      );
    }
  } else if (item.nRECOPI) {
    prodOptions.push(tag("nRECOPI", {}, item.nRECOPI));
  }

  // Build det-level elements (after imposto)
  const detExtras: string[] = [];
  if (item.infAdProd) {
    detExtras.push(tag("infAdProd", {}, item.infAdProd));
  }
  if (item.obsItem) {
    const obsChildren: string[] = [];
    if (item.obsItem.obsCont) {
      obsChildren.push(
        tag("obsCont", { xCampo: item.obsItem.obsCont.xCampo }, [
          tag("xTexto", {}, item.obsItem.obsCont.xTexto),
        ])
      );
    }
    if (item.obsItem.obsFisco) {
      obsChildren.push(
        tag("obsFisco", { xCampo: item.obsItem.obsFisco.xCampo }, [
          tag("xTexto", {}, item.obsItem.obsFisco.xTexto),
        ])
      );
    }
    detExtras.push(tag("obsItem", {}, obsChildren));
  }
  if (item.dfeReferenciado) {
    detExtras.push(
      tag("DFeReferenciado", {}, [
        tag("chaveAcesso", {}, item.dfeReferenciado.chaveAcesso),
        ...(item.dfeReferenciado.nItem ? [tag("nItem", {}, item.dfeReferenciado.nItem)] : []),
      ])
    );
  }

  const xml = tag("det", { nItem: String(item.itemNumber) }, [
    tag("prod", {}, [
      tag("cProd", {}, item.productCode),
      tag("cEAN", {}, item.cEAN ?? "SEM GTIN"),
      tag("xProd", {}, item.description),
      tag("NCM", {}, item.ncm),
      ...(item.cest ? [tag("CEST", {}, item.cest)] : []),
      tag("CFOP", {}, item.cfop),
      tag("uCom", {}, item.unitOfMeasure),
      tag("qCom", {}, formatDecimal(item.quantity, 4)),
      tag("vUnCom", {}, formatCents(item.unitPrice, 10)),
      tag("vProd", {}, formatCents(item.totalPrice)),
      tag("cEANTrib", {}, item.cEANTrib ?? "SEM GTIN"),
      tag("uTrib", {}, item.unitOfMeasure),
      tag("qTrib", {}, formatDecimal(item.quantity, 4)),
      tag("vUnTrib", {}, formatCents(item.unitPrice, 10)),
      ...(item.vFrete ? [tag("vFrete", {}, formatCents(item.vFrete))] : []),
      ...(item.vSeg ? [tag("vSeg", {}, formatCents(item.vSeg))] : []),
      ...(item.vDesc ? [tag("vDesc", {}, formatCents(item.vDesc))] : []),
      ...(item.vOutro ? [tag("vOutro", {}, formatCents(item.vOutro))] : []),
      tag("indTot", {}, "1"),
      ...prodOptions,
    ]),
    tag("imposto", {}, [
      icmsResult.xml,
      ipiXml,
      pisXml,
      cofinsXml,
      iiXml,
    ].filter(Boolean)),
    ...detExtras,
  ]);

  return {
    xml,
    icmsTotals: icmsResult.totals,
    vIPI,
    vPIS: item.pisVPIS ?? 0,
    vCOFINS: item.cofinsVCOFINS ?? 0,
    vII: vII,
  };
}

interface OtherTotals {
  vIPI: number;
  vPIS: number;
  vCOFINS: number;
  vII: number;
}

function buildTotal(totalProducts: number, icms: IcmsTotals, other: OtherTotals, retTrib?: RetTribData): string {
  const vNF = totalProducts; // vNF = vProd - vDesc + vST + vFrete + vSeg + vOutro + vII + vIPI + vServ
  const totalChildren: string[] = [
    tag("ICMSTot", {}, [
      tag("vBC", {}, formatCents(icms.vBC)),
      tag("vICMS", {}, formatCents(icms.vICMS)),
      tag("vICMSDeson", {}, formatCents(icms.vICMSDeson)),
      tag("vFCPUFDest", {}, formatCents(icms.vFCPUFDest)),
      tag("vICMSUFDest", {}, formatCents(icms.vICMSUFDest)),
      tag("vICMSUFRemet", {}, formatCents(icms.vICMSUFRemet)),
      tag("vFCP", {}, formatCents(icms.vFCP)),
      tag("vBCST", {}, formatCents(icms.vBCST)),
      tag("vST", {}, formatCents(icms.vST)),
      tag("vFCPST", {}, formatCents(icms.vFCPST)),
      tag("vFCPSTRet", {}, formatCents(icms.vFCPSTRet)),
      tag("vProd", {}, formatCents(totalProducts)),
      tag("vFrete", {}, "0.00"),
      tag("vSeg", {}, "0.00"),
      tag("vDesc", {}, "0.00"),
      tag("vII", {}, formatCents(other.vII)),
      tag("vIPI", {}, formatCents(other.vIPI)),
      tag("vIPIDevol", {}, "0.00"),
      tag("vPIS", {}, formatCents(other.vPIS)),
      tag("vCOFINS", {}, formatCents(other.vCOFINS)),
      tag("vOutro", {}, "0.00"),
      tag("vNF", {}, formatCents(vNF)),
    ]),
  ];

  if (retTrib) {
    const optCentsTag = (name: string, v: number | undefined | null) =>
      v != null ? tag(name, {}, formatCents(v)) : "";
    const retChildren = [
      optCentsTag("vRetPIS", retTrib.vRetPIS),
      optCentsTag("vRetCOFINS", retTrib.vRetCOFINS),
      optCentsTag("vRetCSLL", retTrib.vRetCSLL),
      optCentsTag("vBCIRRF", retTrib.vBCIRRF),
      optCentsTag("vIRRF", retTrib.vIRRF),
      optCentsTag("vBCRetPrev", retTrib.vBCRetPrev),
      optCentsTag("vRetPrev", retTrib.vRetPrev),
    ].filter(Boolean);
    if (retChildren.length) totalChildren.push(tag("retTrib", {}, retChildren));
  }

  return tag("total", {}, totalChildren);
}

function buildReferences(
  references?: InvoiceBuildData["references"]
): string[] {
  if (!references || references.length === 0) return [];

  return references.map((ref) => {
    switch (ref.type) {
      case "nfe":
        return tag("NFref", {}, [tag("refNFe", {}, ref.accessKey)]);
      case "nf":
        return tag("NFref", {}, [
          tag("refNF", {}, [
            tag("cUF", {}, ref.stateCode),
            tag("AAMM", {}, ref.yearMonth),
            tag("CNPJ", {}, ref.taxId),
            tag("mod", {}, ref.model),
            tag("serie", {}, ref.series),
            tag("nNF", {}, ref.number),
          ]),
        ]);
      case "nfp":
        return tag("NFref", {}, [
          tag("refNFP", {}, [
            tag("cUF", {}, ref.stateCode),
            tag("AAMM", {}, ref.yearMonth),
            tag(new TaxId(ref.taxId).tagName(), {}, ref.taxId),
            tag("mod", {}, ref.model),
            tag("serie", {}, ref.series),
            tag("nNF", {}, ref.number),
          ]),
        ]);
      case "cte":
        return tag("NFref", {}, [tag("refCTe", {}, ref.accessKey)]);
      case "ecf":
        return tag("NFref", {}, [
          tag("refECF", {}, [
            tag("mod", {}, ref.model),
            tag("nECF", {}, ref.ecfNumber),
            tag("nCOO", {}, ref.cooNumber),
          ]),
        ]);
    }
  });
}

function buildWithdrawal(w: NonNullable<InvoiceBuildData["withdrawal"]>): string {
  const tid = new TaxId(w.taxId);
  return tag("retirada", {}, [
    tag(tid.tagName(), {}, tid.padded()),
    ...(w.name ? [tag("xNome", {}, w.name)] : []),
    ...buildAddressFields(w),
  ]);
}

function buildDelivery(d: NonNullable<InvoiceBuildData["delivery"]>): string {
  const tid = new TaxId(d.taxId);
  return tag("entrega", {}, [
    tag(tid.tagName(), {}, tid.padded()),
    ...(d.name ? [tag("xNome", {}, d.name)] : []),
    ...buildAddressFields(d),
  ]);
}

function buildAutXml(entry: { taxId: string }): string {
  const tid = new TaxId(entry.taxId);
  const taxIdTag = tag(tid.tagName(), {}, tid.padded());

  return tag("autXML", {}, [taxIdTag]);
}

function buildTransp(data: InvoiceBuildData): string {
  const t = data.transport;
  if (!t) {
    return tag("transp", {}, [
      tag("modFrete", {}, "9"), // 9=no freight
    ]);
  }

  const children: string[] = [tag("modFrete", {}, t.freightMode)];

  // retTransp (retained ICMS on transport) — comes before transporta in schema
  if (t.retainedIcms) {
    const r = t.retainedIcms;
    children.push(
      tag("retTransp", {}, [
        tag("vServ", {}, formatCents(r.vBCRet)),
        tag("vBCRet", {}, formatCents(r.vBCRet)),
        tag("pICMSRet", {}, formatDecimal(r.pICMSRet / 100, 4)),
        tag("vICMSRet", {}, formatCents(r.vICMSRet)),
        tag("CFOP", {}, r.cfop),
        tag("cMunFG", {}, r.cityCode),
      ])
    );
  }

  // transporta (carrier info)
  if (t.carrier) {
    const c = t.carrier;
    const carrierChildren: string[] = [];
    if (c.taxId) {
      const tid = new TaxId(c.taxId);
      carrierChildren.push(tag(tid.tagName(), {}, tid.padded()));
    }
    if (c.name) carrierChildren.push(tag("xNome", {}, c.name));
    if (c.stateTaxId) carrierChildren.push(tag("IE", {}, c.stateTaxId));
    if (c.address) carrierChildren.push(tag("xEnder", {}, c.address));
    if (c.stateCode) carrierChildren.push(tag("UF", {}, c.stateCode));
    children.push(tag("transporta", {}, carrierChildren));
  }

  // veicTransp (transport vehicle)
  if (t.vehicle) {
    children.push(
      tag("veicTransp", {}, [
        tag("placa", {}, t.vehicle.plate),
        tag("UF", {}, t.vehicle.stateCode),
        ...(t.vehicle.rntc ? [tag("RNTC", {}, t.vehicle.rntc)] : []),
      ])
    );
  }

  // reboque (trailers)
  if (t.trailers) {
    for (const trailer of t.trailers) {
      children.push(
        tag("reboque", {}, [
          tag("placa", {}, trailer.plate),
          tag("UF", {}, trailer.stateCode),
          ...(trailer.rntc ? [tag("RNTC", {}, trailer.rntc)] : []),
        ])
      );
    }
  }

  // vol (volumes)
  if (t.volumes) {
    for (const vol of t.volumes) {
      const volChildren: string[] = [];
      if (vol.quantity != null) volChildren.push(tag("qVol", {}, String(vol.quantity)));
      if (vol.species) volChildren.push(tag("esp", {}, vol.species));
      if (vol.brand) volChildren.push(tag("marca", {}, vol.brand));
      if (vol.number) volChildren.push(tag("nVol", {}, vol.number));
      if (vol.netWeight != null) volChildren.push(tag("pesoL", {}, formatDecimal(vol.netWeight, 3)));
      if (vol.grossWeight != null) volChildren.push(tag("pesoB", {}, formatDecimal(vol.grossWeight, 3)));
      if (vol.seals) {
        for (const seal of vol.seals) {
          volChildren.push(tag("lacres", {}, [tag("nLacre", {}, seal)]));
        }
      }
      children.push(tag("vol", {}, volChildren));
    }
  }

  return tag("transp", {}, children);
}

function buildCobr(billing: NonNullable<InvoiceBuildData["billing"]>): string {
  const children: string[] = [];

  if (billing.invoice) {
    const inv = billing.invoice;
    children.push(
      tag("fat", {}, [
        tag("nFat", {}, inv.number),
        tag("vOrig", {}, formatCents(inv.originalValue)),
        ...(inv.discountValue != null ? [tag("vDesc", {}, formatCents(inv.discountValue))] : []),
        tag("vLiq", {}, formatCents(inv.netValue)),
      ])
    );
  }

  if (billing.installments) {
    for (const inst of billing.installments) {
      children.push(
        tag("dup", {}, [
          tag("nDup", {}, inst.number),
          tag("dVenc", {}, inst.dueDate),
          tag("vDup", {}, formatCents(inst.value)),
        ])
      );
    }
  }

  return tag("cobr", {}, children);
}

function buildPag(
  payments: PaymentData[],
  changeAmount?: number,
  cardDetails?: InvoiceBuildData["paymentCardDetails"]
): string {
  if (payments.length === 0) {
    return tag("pag", {}, [
      tag("detPag", {}, [
        tag("tPag", {}, PAYMENT_TYPES.none),
        tag("vPag", {}, "0.00"),
      ]),
    ]);
  }

  const detPagElements = payments.map((p, i) => {
    const detChildren: string[] = [
      tag("tPag", {}, p.method),
      tag("vPag", {}, formatCents(p.amount)),
    ];

    // Add card details if present for this payment index
    const card = cardDetails?.[i];
    if (card?.integType) {
      const cardChildren: string[] = [
        tag("tpIntegra", {}, card.integType),
      ];
      if (card.cardTaxId) cardChildren.push(tag("CNPJ", {}, card.cardTaxId));
      if (card.cardBrand) cardChildren.push(tag("tBand", {}, card.cardBrand));
      if (card.authCode) cardChildren.push(tag("cAut", {}, card.authCode));
      detChildren.push(tag("card", {}, cardChildren));
    }

    return tag("detPag", {}, detChildren);
  });

  // vTroco must come AFTER all detPag elements
  if (changeAmount != null && changeAmount > 0) {
    detPagElements.push(tag("vTroco", {}, formatCents(changeAmount)));
  }

  return tag("pag", {}, detPagElements);
}

function buildInfAdic(data: InvoiceBuildData): string {
  const notes: string[] = [];

  if (data.contingency) {
    notes.push(
      `Emitida em contingencia (${data.contingency.type}). ` +
      `Motivo: ${data.contingency.reason}`
    );
  }

  if (data.environment === 2) {
    notes.push("EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL");
  }

  const addInfo = data.additionalInfo;
  const hasAdditionalInfo = addInfo && (
    addInfo.taxpayerNote ||
    addInfo.taxAuthorityNote ||
    (addInfo.contributorObs && addInfo.contributorObs.length > 0) ||
    (addInfo.fiscalObs && addInfo.fiscalObs.length > 0) ||
    (addInfo.processRefs && addInfo.processRefs.length > 0)
  );

  if (notes.length === 0 && !hasAdditionalInfo) return "";

  const children: string[] = [];

  // infAdFisco must come before infCpl per schema
  if (addInfo?.taxAuthorityNote) {
    children.push(tag("infAdFisco", {}, addInfo.taxAuthorityNote));
  }

  // infCpl: merge contingency/environment notes with taxpayer note
  const allNotes = [...notes];
  if (addInfo?.taxpayerNote) {
    allNotes.push(addInfo.taxpayerNote);
  }
  if (allNotes.length > 0) {
    children.push(tag("infCpl", {}, allNotes.join("; ")));
  }

  // obsCont (max 10)
  if (addInfo?.contributorObs) {
    for (const obs of addInfo.contributorObs.slice(0, 10)) {
      children.push(
        tag("obsCont", { xCampo: obs.field }, [
          tag("xTexto", {}, obs.text),
        ])
      );
    }
  }

  // obsFisco (max 10)
  if (addInfo?.fiscalObs) {
    for (const obs of addInfo.fiscalObs.slice(0, 10)) {
      children.push(
        tag("obsFisco", { xCampo: obs.field }, [
          tag("xTexto", {}, obs.text),
        ])
      );
    }
  }

  // procRef (max 100)
  if (addInfo?.processRefs) {
    for (const proc of addInfo.processRefs.slice(0, 100)) {
      children.push(
        tag("procRef", {}, [
          tag("nProc", {}, proc.number),
          tag("indProc", {}, proc.origin),
        ])
      );
    }
  }

  return tag("infAdic", {}, children);
}

function buildIntermediary(
  intermed: NonNullable<InvoiceBuildData["intermediary"]>
): string {
  return tag("infIntermed", {}, [
    tag("CNPJ", {}, intermed.taxId),
    ...(intermed.idCadIntTran ? [tag("idCadIntTran", {}, intermed.idCadIntTran)] : []),
  ]);
}

function buildTechResponsible(
  tech: NonNullable<InvoiceBuildData["techResponsible"]>
): string {
  return tag("infRespTec", {}, [
    tag("CNPJ", {}, tech.taxId),
    tag("xContato", {}, tech.contact),
    tag("email", {}, tech.email),
    ...(tech.phone ? [tag("fone", {}, tech.phone)] : []),
  ]);
}

function buildPurchase(
  purchase: NonNullable<InvoiceBuildData["purchase"]>
): string {
  const children: string[] = [];
  if (purchase.purchaseNote) children.push(tag("xNEmp", {}, purchase.purchaseNote));
  if (purchase.orderNumber) children.push(tag("xPed", {}, purchase.orderNumber));
  if (purchase.contractNumber) children.push(tag("xCont", {}, purchase.contractNumber));
  return tag("compra", {}, children);
}

function buildExport(
  exp: NonNullable<InvoiceBuildData["export"]>
): string {
  return tag("exporta", {}, [
    tag("UFSaidaPais", {}, exp.exitState),
    tag("xLocExporta", {}, exp.exportLocation),
    ...(exp.dispatchLocation ? [tag("xLocDespacho", {}, exp.dispatchLocation)] : []),
  ]);
}

// ── Utility functions ───────────────────────────────────────────────────────

// tag() and escapeXml() imported from ./xml-utils

/** Generate 8-digit random numeric code */
function generateNumericCode(): string {
  return String(Math.floor(Math.random() * 100000000)).padStart(8, "0");
}

/** Format date as AAMM */
function formatYearMonth(date: Date): string {
  const yy = String(date.getFullYear()).slice(2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return yy + mm;
}

/**
 * Format date/time for NF-e (ISO 8601 with timezone offset).
 * Example: 2025-01-15T10:30:00-03:00
 */
function formatDateTimeNfe(date: Date, stateCode: string): string {
  // Brazil timezone offsets by state
  const offsets: Record<string, string> = {
    AC: "-05:00", AM: "-04:00", AP: "-03:00", PA: "-03:00", RO: "-04:00",
    RR: "-04:00", TO: "-03:00", MT: "-04:00", MS: "-04:00",
    // All others are -03:00 (Brasilia time)
  };
  const offset = offsets[stateCode] || "-03:00";

  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());

  return `${y}-${m}-${d}T${h}:${min}:${s}${offset}`;
}

// formatCents and formatDecimal imported from ./format-utils

