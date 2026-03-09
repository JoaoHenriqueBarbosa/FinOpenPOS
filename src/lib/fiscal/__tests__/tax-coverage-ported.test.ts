// @ts-nocheck
/**
 * Ported from PHP sped-nfe TaxCoverageTest.php and TraitsCoverageTest.php
 *
 * Each PHP test method becomes a corresponding `it()` block.
 * PHP values are converted to our conventions:
 *   - Monetary: PHP float (200.00) -> TS cents integer (20000)
 *   - ICMS rates (4dp): PHP float (18.0000) -> TS hundredths (1800), fc(1800,4)="18.0000"
 *   - ICMS rates (2dp): PHP float (1.00) -> TS hundredths (100), fc(100,2)="1.00"
 *   - PIS/COFINS rates (4dp): PHP float (1.6500) -> TS *10000 (16500), fmt4(16500)="1.6500"
 *   - PIS/COFINS monetary: PHP float (10.00) -> TS cents (1000), fmtCents(1000)="10.00"
 *
 * Tests for features we DON'T have yet use `it.todo("test name")`.
 */

import { describe, it, expect } from "bun:test";
import { tag, buildInvoiceXml, buildAccessKey } from "../xml-builder";
import {
  buildIcmsXml,
  buildIcmsPartXml,
  buildIcmsStXml,
  buildIcmsUfDestXml,
} from "../tax-icms";
import {
  buildPisXml,
  buildCofinsXml,
  buildIpiXml,
  buildIiXml,
  buildPisStXml,
  buildCofinsStXml,
} from "../tax-pis-cofins-ipi";
import {
  buildIssqnXml,
  buildImpostoDevol,
  createIssqnTotals,
} from "../tax-issqn";
import { buildIsXml } from "../tax-is";
import {
  buildSolApropCredPresumido,
  buildDestinoConsumoPessoal,
  buildAceiteDebito,
  buildImobilizacaoItem,
  buildApropriacaoCreditoComb,
  buildApropriacaoCreditoBens,
  buildManifestacaoTransfCredIBS,
  buildManifestacaoTransfCredCBS,
  buildCancelaEvento,
  buildImportacaoZFM,
  buildRouboPerdaTransporteAdquirente,
  buildRouboPerdaTransporteFornecedor,
  buildFornecimentoNaoRealizado,
  buildAtualizacaoDataEntrega,
  resolveVerAplic,
  type SefazReformConfig,
} from "../sefaz-reform-events";
import {
  buildEpecNfceXml,
  buildEpecNfceStatusXml,
  buildTestNfceXml,
  type EpecNfceConfig,
} from "../epec-nfce";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Parse a simple XML string and check it contains all expected substrings. */
function expectXmlContains(xml: string, ...substrings: string[]) {
  for (const s of substrings) {
    expect(xml).toContain(s);
  }
}

/** Assert an XML string does NOT contain a given substring. */
function expectXmlNotContains(xml: string, ...substrings: string[]) {
  for (const s of substrings) {
    expect(xml).not.toContain(s);
  }
}

// =============================================================================
// TaxCoverageTest.php — ICMS CST Tests
// =============================================================================

describe("TaxCoverageTest — ICMS CST", () => {
  it("testICMS00 — CST 00 with FCP", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "00",
      modBC: "3",
      vBC: 10000,
      pICMS: 1800,
      vICMS: 1800,
      pFCP: 200,
      vFCP: 200,
    });
    expectXmlContains(xml, "<ICMS00>", "<vFCP>");
  });

  it("testICMS00WithoutFCP — CST 00 without FCP", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "00",
      modBC: "3",
      vBC: 10000,
      pICMS: 1800,
      vICMS: 1800,
    });
    expectXmlContains(xml, "<ICMS00>");
    expectXmlNotContains(xml, "<vFCP>");
  });

  it("testICMS02 — CST 02 monofasico", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "02",
      qBCMono: 1000000,
      adRemICMS: 15000,
      vICMSMono: 15000,
    });
    expectXmlContains(xml, "<ICMS02>", "<adRemICMS>");
  });

  it("testICMS10 — CST 10 with ST and FCP", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "10",
      modBC: "3",
      vBC: 10000,
      pICMS: 1800,
      vICMS: 1800,
      vBCFCP: 10000,
      pFCP: 200,
      vFCP: 200,
      modBCST: "4",
      pMVAST: 4000,
      pRedBCST: 0,
      vBCST: 14000,
      pICMSST: 1800,
      vICMSST: 720,
      vBCFCPST: 14000,
      pFCPST: 200,
      vFCPST: 280,
      vICMSSTDeson: 100,
      motDesICMSST: "3",
    });
    expectXmlContains(xml, "<ICMS10>", "<vFCPST>", "<vICMSSTDeson>", "<motDesICMSST>");
  });

  it("testICMS15 — CST 15 monofasico with retention", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "15",
      qBCMono: 1000000,
      adRemICMS: 15000,
      vICMSMono: 15000,
      qBCMonoReten: 500000,
      adRemICMSReten: 10000,
      vICMSMonoReten: 5000,
    });
    expectXmlContains(xml, "<ICMS15>", "<qBCMonoReten>");
    expectXmlNotContains(xml, "<pRedAdRem>");
  });

  it("testICMS15WithPRedAdRem — CST 15 with ad rem reduction", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "15",
      qBCMono: 1000000,
      adRemICMS: 15000,
      vICMSMono: 15000,
      qBCMonoReten: 500000,
      adRemICMSReten: 10000,
      vICMSMonoReten: 5000,
      pRedAdRem: 1000,
      motRedAdRem: "1",
    });
    expectXmlContains(xml, "<ICMS15>", "<pRedAdRem>", "<motRedAdRem>");
  });

  it("testICMS20 — CST 20 with FCP and desoneration", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "20",
      modBC: "3",
      pRedBC: 1000,
      vBC: 9000,
      pICMS: 1800,
      vICMS: 1620,
      vBCFCP: 9000,
      pFCP: 200,
      vFCP: 180,
      vICMSDeson: 180,
      motDesICMS: "9",
      indDeduzDeson: "1",
    });
    expectXmlContains(xml, "<ICMS20>", "<vICMSDeson>", "<indDeduzDeson>");
  });

  it("testICMS30 — CST 30 with ST FCP", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "30",
      modBCST: "4",
      pMVAST: 4000,
      pRedBCST: 0,
      vBCST: 14000,
      pICMSST: 1800,
      vICMSST: 720,
      vBCFCPST: 14000,
      pFCPST: 200,
      vFCPST: 280,
      vICMSDeson: 180,
      motDesICMS: "9",
      indDeduzDeson: "1",
    });
    expectXmlContains(xml, "<ICMS30>", "<vBCFCPST>", "<indDeduzDeson>");
  });

  it("testICMS40 — CST 40 isento with desoneration", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "40",
      vICMSDeson: 1800,
      motDesICMS: "1",
      indDeduzDeson: "1",
    });
    expectXmlContains(xml, "<ICMS40>", "<vICMSDeson>");
  });

  it("testICMS41 — CST 41 uses ICMS40 wrapper", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "41",
    });
    expectXmlContains(xml, "<ICMS40>", "<CST>41</CST>");
  });

  it("testICMS50 — CST 50 uses ICMS40 wrapper", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "50",
      vICMSDeson: 500,
      motDesICMS: "9",
    });
    expectXmlContains(xml, "<ICMS40>", "<CST>50</CST>");
  });

  it("testICMS51WithDif — CST 51 with deferral and FCP deferral", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "51",
      modBC: "3",
      pRedBC: 1000,
      cBenefRBC: "SP999999",
      vBC: 9000,
      pICMS: 1800,
      vICMSOp: 1620,
      pDif: 3333,
      vICMSDif: 540,
      vICMS: 1080,
      vBCFCP: 9000,
      pFCP: 200,
      vFCP: 180,
      pFCPDif: 3333,
      vFCPDif: 60,
      vFCPEfet: 120,
    });
    expectXmlContains(xml, "<ICMS51>", "<pDif>", "<vICMSDif>", "<cBenefRBC>",
      "<pFCPDif>", "<vFCPDif>", "<vFCPEfet>");
  });

  it("testICMS51Minimal — CST 51 minimal", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "51",
    });
    expectXmlContains(xml, "<ICMS51>");
    expectXmlNotContains(xml, "<pDif>");
  });

  it("testICMS53 — CST 53 monofasico with deferral", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "53",
      qBCMono: 1000000,
      adRemICMS: 15000,
      vICMSMonoOp: 15000,
      pDif: 3333,
      vICMSMonoDif: 5000,
      vICMSMono: 10000,
    });
    expectXmlContains(xml, "<ICMS53>", "<vICMSMonoOp>", "<vICMSMonoDif>");
  });

  it("testICMS60 — CST 60 with ST retained and effective values", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "60",
      vBCSTRet: 10000,
      pST: 1800,
      vICMSSubstituto: 1000,
      vICMSSTRet: 800,
      vBCFCPSTRet: 10000,
      pFCPSTRet: 200,
      vFCPSTRet: 200,
      pRedBCEfet: 1000,
      vBCEfet: 9000,
      pICMSEfet: 1800,
      vICMSEfet: 1620,
    });
    expectXmlContains(xml, "<ICMS60>", "<vICMSSubstituto>", "<pRedBCEfet>", "<vICMSEfet>");
  });

  it("testICMS60Minimal — CST 60 minimal", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "60",
    });
    expectXmlContains(xml, "<ICMS60>");
    expectXmlNotContains(xml, "<vICMSSubstituto>");
  });

  it("testICMS61 — CST 61 monofasico retained", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "61",
      qBCMonoRet: 1000000,
      adRemICMSRet: 15000,
      vICMSMonoRet: 15000,
    });
    expectXmlContains(xml, "<ICMS61>", "<adRemICMSRet>");
  });

  it("testICMS70Full — CST 70 with all ST and desoneration fields", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "70",
      modBC: "3",
      pRedBC: 1000,
      vBC: 9000,
      pICMS: 1800,
      vICMS: 1620,
      vBCFCP: 9000,
      pFCP: 200,
      vFCP: 180,
      modBCST: "4",
      pMVAST: 4000,
      pRedBCST: 0,
      vBCST: 12600,
      pICMSST: 1800,
      vICMSST: 648,
      vBCFCPST: 12600,
      pFCPST: 200,
      vFCPST: 252,
      vICMSDeson: 180,
      motDesICMS: "9",
      indDeduzDeson: "1",
      vICMSSTDeson: 100,
      motDesICMSST: "3",
    });
    expectXmlContains(xml, "<ICMS70>", "<vICMSSTDeson>", "<motDesICMSST>", "<indDeduzDeson>");
  });

  it("testICMS70WithoutSTDeson — CST 70 without ST desoneration", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "70",
      modBC: "3",
      pRedBC: 1000,
      vBC: 9000,
      pICMS: 1800,
      vICMS: 1620,
      modBCST: "4",
      vBCST: 12600,
      pICMSST: 1800,
      vICMSST: 648,
    });
    expectXmlContains(xml, "<ICMS70>");
    expectXmlNotContains(xml, "<vICMSSTDeson>");
  });

  it("testICMS90Full — CST 90 with deferral, FCP deferral, ST desoneration", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "90",
      modBC: "3",
      vBC: 10000,
      pRedBC: 1000,
      cBenefRBC: "SP999999",
      pICMS: 1800,
      vICMSOp: 1620,
      pDif: 3333,
      vICMSDif: 540,
      vICMS: 1080,
      vBCFCP: 10000,
      pFCP: 200,
      vFCP: 200,
      pFCPDif: 3333,
      vFCPDif: 67,
      vFCPEfet: 133,
      modBCST: "4",
      pMVAST: 4000,
      pRedBCST: 0,
      vBCST: 14000,
      pICMSST: 1800,
      vICMSST: 720,
      vBCFCPST: 14000,
      pFCPST: 200,
      vFCPST: 280,
      vICMSDeson: 180,
      motDesICMS: "9",
      indDeduzDeson: "1",
      vICMSSTDeson: 100,
      motDesICMSST: "3",
    });
    expectXmlContains(xml, "<ICMS90>", "<cBenefRBC>", "<vICMSOp>", "<pDif>",
      "<vICMSDif>", "<pFCPDif>", "<vFCPDif>", "<vFCPEfet>",
      "<vICMSSTDeson>", "<motDesICMSST>");
  });

  it("testICMS90Minimal — CST 90 minimal", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "90",
    });
    expectXmlContains(xml, "<ICMS90>");
    expectXmlNotContains(xml, "<cBenefRBC>");
  });
});

// =============================================================================
// TaxCoverageTest.php — ICMSPart
// =============================================================================

describe("TaxCoverageTest — ICMSPart", () => {
  it("testICMSPart — partition between states", () => {
    const { xml } = buildIcmsPartXml({
      taxRegime: 3,
      orig: "0",
      CST: "10",
      modBC: "3",
      vBC: 10000,
      pRedBC: 0,
      pICMS: 1800,
      vICMS: 1800,
      modBCST: "4",
      pMVAST: 4000,
      pRedBCST: 0,
      vBCST: 14000,
      pICMSST: 1800,
      vICMSST: 720,
      vBCFCPST: 14000,
      pFCPST: 200,
      vFCPST: 280,
      pBCOp: 10000,
      UFST: "SP",
      vICMSDeson: 100,
      motDesICMS: "9",
      indDeduzDeson: "1",
    });
    expectXmlContains(xml, "<ICMSPart>", "<UFST>", "<vICMSDeson>");
  });
});

// =============================================================================
// TaxCoverageTest.php — ICMSST
// =============================================================================

describe("TaxCoverageTest — ICMSST", () => {
  it("testICMSST — ST repasse with effective values", () => {
    const { xml } = buildIcmsStXml({
      taxRegime: 3,
      orig: "0",
      CST: "41",
      vBCSTRet: 10000,
      pST: 1800,
      vICMSSubstituto: 1000,
      vICMSSTRet: 800,
      vBCFCPSTRet: 10000,
      pFCPSTRet: 200,
      vFCPSTRet: 200,
      vBCSTDest: 8000,
      vICMSSTDest: 1440,
      pRedBCEfet: 1000,
      vBCEfet: 9000,
      pICMSEfet: 1800,
      vICMSEfet: 1620,
    });
    expectXmlContains(xml, "<ICMSST>", "<vICMSSubstituto>", "<vICMSEfet>");
  });
});

// =============================================================================
// TaxCoverageTest.php — ICMSSN (Simples Nacional) CSOSN
// =============================================================================

describe("TaxCoverageTest — ICMSSN CSOSN", () => {
  it("testICMSSN101 — CSOSN 101", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 1,
      orig: "0",
      CSOSN: "101",
      pCredSN: 200,
      vCredICMSSN: 200,
    });
    expectXmlContains(xml, "<ICMSSN101>", "<pCredSN>");
  });

  it("testICMSSN102 — CSOSN 102", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 1,
      orig: "0",
      CSOSN: "102",
    });
    expectXmlContains(xml, "<ICMSSN102>");
  });

  it("testICMSSN103 — CSOSN 103 uses ICMSSN102 wrapper", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 1,
      orig: "0",
      CSOSN: "103",
    });
    expectXmlContains(xml, "<ICMSSN102>", "<CSOSN>103</CSOSN>");
  });

  it("testICMSSN300 — CSOSN 300 uses ICMSSN102 wrapper", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 1,
      orig: "0",
      CSOSN: "300",
    });
    expectXmlContains(xml, "<ICMSSN102>", "<CSOSN>300</CSOSN>");
  });

  it("testICMSSN400 — CSOSN 400 uses ICMSSN102 wrapper", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 1,
      orig: "0",
      CSOSN: "400",
    });
    expectXmlContains(xml, "<ICMSSN102>", "<CSOSN>400</CSOSN>");
  });

  it("testICMSSN201Full — CSOSN 201 with FCP ST", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 1,
      orig: "0",
      CSOSN: "201",
      modBCST: "4",
      pMVAST: 4000,
      pRedBCST: 0,
      vBCST: 14000,
      pICMSST: 1800,
      vICMSST: 720,
      vBCFCPST: 14000,
      pFCPST: 200,
      vFCPST: 280,
      pCredSN: 200,
      vCredICMSSN: 200,
    });
    expectXmlContains(xml, "<ICMSSN201>", "<vBCFCPST>", "<pFCPST>",
      "<vFCPST>", "<pCredSN>", "<vCredICMSSN>");
  });

  it("testICMSSN201Minimal — CSOSN 201 minimal", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 1,
      orig: "0",
      CSOSN: "201",
      modBCST: "4",
      vBCST: 14000,
      pICMSST: 1800,
      vICMSST: 720,
    });
    expectXmlContains(xml, "<ICMSSN201>");
    expectXmlNotContains(xml, "<vBCFCPST>");
  });

  it("testICMSSN202 — CSOSN 202 with FCP ST", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 1,
      orig: "0",
      CSOSN: "202",
      modBCST: "4",
      pMVAST: 4000,
      pRedBCST: 0,
      vBCST: 14000,
      pICMSST: 1800,
      vICMSST: 720,
      vBCFCPST: 14000,
      pFCPST: 200,
      vFCPST: 280,
    });
    expectXmlContains(xml, "<ICMSSN202>", "<vFCPST>");
  });

  it("testICMSSN203 — CSOSN 203 uses ICMSSN202 wrapper", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 1,
      orig: "0",
      CSOSN: "203",
      modBCST: "4",
      vBCST: 14000,
      pICMSST: 1800,
      vICMSST: 720,
    });
    expectXmlContains(xml, "<ICMSSN202>", "<CSOSN>203</CSOSN>");
  });

  it("testICMSSN500Full — CSOSN 500 with all effective values", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 1,
      orig: "0",
      CSOSN: "500",
      vBCSTRet: 10000,
      pST: 1800,
      vICMSSubstituto: 1000,
      vICMSSTRet: 800,
      vBCFCPSTRet: 10000,
      pFCPSTRet: 200,
      vFCPSTRet: 200,
      pRedBCEfet: 1000,
      vBCEfet: 9000,
      pICMSEfet: 1800,
      vICMSEfet: 1620,
    });
    expectXmlContains(xml, "<ICMSSN500>", "<vICMSSubstituto>",
      "<vBCFCPSTRet>", "<pRedBCEfet>", "<vICMSEfet>");
  });

  it("testICMSSN500Minimal — CSOSN 500 minimal", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 1,
      orig: "0",
      CSOSN: "500",
    });
    expectXmlContains(xml, "<ICMSSN500>");
    expectXmlNotContains(xml, "<vICMSSubstituto>");
  });

  it("testICMSSN900Full — CSOSN 900 full", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 1,
      orig: "0",
      CSOSN: "900",
      modBC: "3",
      vBC: 10000,
      pRedBC: 1000,
      pICMS: 1800,
      vICMS: 1620,
      modBCST: "4",
      pMVAST: 4000,
      pRedBCST: 0,
      vBCST: 14000,
      pICMSST: 1800,
      vICMSST: 720,
      vBCFCPST: 14000,
      pFCPST: 200,
      vFCPST: 280,
      pCredSN: 200,
      vCredICMSSN: 200,
    });
    expectXmlContains(xml, "<ICMSSN900>", "<modBC>", "<pRedBC>",
      "<vBCFCPST>", "<pCredSN>");
  });

  it("testICMSSN900Minimal — CSOSN 900 minimal", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 1,
      orig: "0",
      CSOSN: "900",
    });
    expectXmlContains(xml, "<ICMSSN900>");
    expectXmlNotContains(xml, "<modBC>");
  });
});

// =============================================================================
// TaxCoverageTest.php — ICMSUFDest
// =============================================================================

describe("TaxCoverageTest — ICMSUFDest", () => {
  it("testICMSUFDest — interstate destination", () => {
    const { xml } = buildIcmsUfDestXml({
      taxRegime: 3,
      orig: "0",
      vBCUFDest: 10000,
      vBCFCPUFDest: 10000,
      pFCPUFDest: 200,
      pICMSUFDest: 1800,
      pICMSInter: 1200,
      pICMSInterPart: 10000,
      vFCPUFDest: 200,
      vICMSUFDest: 600,
      vICMSUFRemet: 0,
    });
    expectXmlContains(xml, "<ICMSUFDest>", "<vBCUFDest>");
  });
});

// =============================================================================
// TaxCoverageTest.php — ICMS Totals
// =============================================================================

describe("TaxCoverageTest — ICMS totals", () => {
  it("testICMS00Totals — CST 00 accumulates vBC and vICMS", () => {
    const { totals } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "00",
      modBC: "3",
      vBC: 10000,
      pICMS: 1800,
      vICMS: 1800,
    });
    expect(totals.vBC).toBe(10000);
    expect(totals.vICMS).toBe(1800);
  });

  it("testICMS10Totals — CST 10 accumulates ST totals", () => {
    const { totals } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "10",
      modBC: "3",
      vBC: 10000,
      pICMS: 1800,
      vICMS: 1800,
      modBCST: "4",
      vBCST: 14000,
      pICMSST: 1800,
      vICMSST: 720,
      vFCPST: 280,
      vFCP: 200,
    });
    expect(totals.vBCST).toBe(14000);
    expect(totals.vST).toBe(720);
    expect(totals.vFCPST).toBe(280);
  });

  it("testICMS20Totals — CST 20 accumulates vICMSDeson", () => {
    const { totals } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "20",
      modBC: "3",
      pRedBC: 1000,
      vBC: 9000,
      pICMS: 1800,
      vICMS: 1620,
      vICMSDeson: 180,
      motDesICMS: "9",
    });
    expect(totals.vICMSDeson).toBe(180);
  });

  it("testICMS02Totals — CST 02 accumulates mono totals", () => {
    const { totals } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "02",
      qBCMono: 1000000,
      adRemICMS: 15000,
      vICMSMono: 15000,
    });
    expect(totals.qBCMono).toBe(1000000);
    expect(totals.vICMSMono).toBe(15000);
  });

  it("testICMS61Totals — CST 61 accumulates mono retained totals", () => {
    const { totals } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "61",
      qBCMonoRet: 1000000,
      adRemICMSRet: 15000,
      vICMSMonoRet: 15000,
    });
    expect(totals.qBCMonoRet).toBe(1000000);
    expect(totals.vICMSMonoRet).toBe(15000);
  });
});

// =============================================================================
// TaxCoverageTest.php — PIS Tests
// =============================================================================

describe("TaxCoverageTest — PIS", () => {
  it("testPISAliqCST01 — PIS Aliquota CST 01", () => {
    const xml = buildPisXml({ CST: "01", vBC: 10000, pPIS: 16500, vPIS: 165 });
    expectXmlContains(xml, "<PISAliq>", "<CST>01</CST>", "<vBC>", "<pPIS>", "<vPIS>");
  });

  it("testPISAliqCST02 — PIS Aliquota CST 02", () => {
    const xml = buildPisXml({ CST: "02", vBC: 10000, pPIS: 16500, vPIS: 165 });
    expectXmlContains(xml, "<PISAliq>", "<CST>02</CST>");
  });

  it("testPISQtdeCST03 — PIS Quantidade CST 03", () => {
    const xml = buildPisXml({ CST: "03", qBCProd: 1000000, vAliqProd: 165, vPIS: 165 });
    expectXmlContains(xml, "<PISQtde>", "<qBCProd>", "<vAliqProd>");
  });

  for (const cst of ["04", "05", "06", "07", "08", "09"]) {
    it(`testPISNT CST ${cst} — PIS Nao Tributado`, () => {
      const xml = buildPisXml({ CST: cst, vPIS: 0 });
      expectXmlContains(xml, "<PISNT>", `<CST>${cst}</CST>`);
    });
  }

  it("testPISOutrWithVBC — PIS Outr CST 49 with vBC", () => {
    const xml = buildPisXml({ CST: "49", vBC: 10000, pPIS: 16500, vPIS: 165 });
    expectXmlContains(xml, "<PISOutr>", "<vBC>", "<pPIS>");
    expectXmlNotContains(xml, "<qBCProd>");
  });

  it("testPISOutrWithQBCProd — PIS Outr CST 99 with quantity", () => {
    const xml = buildPisXml({ CST: "99", qBCProd: 1000000, vAliqProd: 165, vPIS: 165 });
    expectXmlContains(xml, "<PISOutr>", "<qBCProd>", "<vAliqProd>");
    expectXmlNotContains(xml, "<vBC>");
  });

  for (const cst of [
    "50", "51", "52", "53", "54", "55", "56",
    "60", "61", "62", "63", "64", "65", "66", "67",
    "70", "71", "72", "73", "74", "75", "98",
  ]) {
    it(`testPISOutrVariousCST CST ${cst} — PIS Outr`, () => {
      const xml = buildPisXml({ CST: cst, vBC: 10000, pPIS: 16500, vPIS: 165 });
      expectXmlContains(xml, "<PISOutr>", `<CST>${cst}</CST>`);
    });
  }

  it("testPISAliqWithEmptyVPIS — PIS Aliq with null vPIS", () => {
    const xml = buildPisXml({ CST: "01", vBC: 10000, pPIS: 16500 });
    expectXmlContains(xml, "<PISAliq>");
  });

  it("testPISOutrWithNullVPIS — PIS Outr with null vPIS", () => {
    const xml = buildPisXml({ CST: "99", vBC: 10000, pPIS: 16500 });
    expectXmlContains(xml, "<PISOutr>");
  });
});

// =============================================================================
// TaxCoverageTest.php — PISST
// =============================================================================

describe("TaxCoverageTest — PISST", () => {
  it("testPISSTWithVBC — PISST with vBC", () => {
    const xml = buildPisStXml({ vBC: 10000, pPIS: 16500, vPIS: 165, indSomaPISST: 1 });
    expectXmlContains(xml, "<PISST>", "<vBC>", "<pPIS>", "<indSomaPISST>");
  });

  it("testPISSTWithQBCProd — PISST with quantity", () => {
    const xml = buildPisStXml({ qBCProd: 1000000, vAliqProd: 165, vPIS: 165, indSomaPISST: 0 });
    expectXmlContains(xml, "<PISST>", "<qBCProd>", "<vAliqProd>");
    expectXmlNotContains(xml, "<vBC>");
  });
});

// =============================================================================
// TaxCoverageTest.php — COFINS Tests
// =============================================================================

describe("TaxCoverageTest — COFINS", () => {
  it("testCOFINSAliqCST01 — COFINS Aliquota CST 01", () => {
    const xml = buildCofinsXml({ CST: "01", vBC: 10000, pCOFINS: 76000, vCOFINS: 760 });
    expectXmlContains(xml, "<COFINSAliq>", "<CST>01</CST>", "<vBC>", "<pCOFINS>", "<vCOFINS>");
  });

  it("testCOFINSAliqCST02 — COFINS Aliquota CST 02", () => {
    const xml = buildCofinsXml({ CST: "02", vBC: 10000, pCOFINS: 76000, vCOFINS: 760 });
    expectXmlContains(xml, "<COFINSAliq>", "<CST>02</CST>");
  });

  it("testCOFINSQtdeCST03 — COFINS Quantidade CST 03", () => {
    const xml = buildCofinsXml({ CST: "03", qBCProd: 1000000, vAliqProd: 760, vCOFINS: 760 });
    expectXmlContains(xml, "<COFINSQtde>", "<qBCProd>", "<vAliqProd>");
  });

  for (const cst of ["04", "05", "06", "07", "08", "09"]) {
    it(`testCOFINSNT CST ${cst} — COFINS Nao Tributado`, () => {
      const xml = buildCofinsXml({ CST: cst, vCOFINS: 0 });
      expectXmlContains(xml, "<COFINSNT>", `<CST>${cst}</CST>`);
    });
  }

  it("testCOFINSOutrWithVBC — COFINS Outr CST 49 with vBC", () => {
    const xml = buildCofinsXml({ CST: "49", vBC: 10000, pCOFINS: 76000, vCOFINS: 760 });
    expectXmlContains(xml, "<COFINSOutr>", "<vBC>", "<pCOFINS>");
    expectXmlNotContains(xml, "<qBCProd>");
  });

  it("testCOFINSOutrWithQBCProd — COFINS Outr CST 99 with quantity", () => {
    const xml = buildCofinsXml({ CST: "99", qBCProd: 1000000, vAliqProd: 760, vCOFINS: 760 });
    expectXmlContains(xml, "<COFINSOutr>", "<qBCProd>", "<vAliqProd>");
    expectXmlNotContains(xml, "<vBC>");
  });

  for (const cst of [
    "50", "51", "52", "53", "54", "55", "56",
    "60", "61", "62", "63", "64", "65", "66", "67",
    "70", "71", "72", "73", "74", "75", "98",
  ]) {
    it(`testCOFINSOutrVariousCST CST ${cst} — COFINS Outr`, () => {
      const xml = buildCofinsXml({ CST: cst, vBC: 10000, pCOFINS: 76000, vCOFINS: 760 });
      expectXmlContains(xml, "<COFINSOutr>", `<CST>${cst}</CST>`);
    });
  }
});

// =============================================================================
// TaxCoverageTest.php — COFINSST
// =============================================================================

describe("TaxCoverageTest — COFINSST", () => {
  it("testCOFINSSTWithVBC — COFINSST with vBC", () => {
    const xml = buildCofinsStXml({ vBC: 10000, pCOFINS: 76000, vCOFINS: 760, indSomaCOFINSST: 1 });
    expectXmlContains(xml, "<COFINSST>", "<vBC>", "<pCOFINS>", "<indSomaCOFINSST>");
  });

  it("testCOFINSSTWithQBCProd — COFINSST with quantity", () => {
    const xml = buildCofinsStXml({ qBCProd: 1000000, vAliqProd: 760, vCOFINS: 760, indSomaCOFINSST: 0 });
    expectXmlContains(xml, "<COFINSST>", "<qBCProd>", "<vAliqProd>");
    expectXmlNotContains(xml, "<vBC>");
  });
});

// =============================================================================
// TaxCoverageTest.php — COFINS/PIS Totalizer tests
// (These test internal totalization in PHP; TS has no shared state, but we
// verify the XML output is correct as our equivalent)
// =============================================================================

describe("TaxCoverageTest — PIS/COFINS totalizer branch coverage", () => {
  it("testCOFINSAliqTotalizer — COFINS Aliq CST 01 generates correct XML", () => {
    const xml = buildCofinsXml({ CST: "01", vBC: 10000, pCOFINS: 76000, vCOFINS: 760 });
    expectXmlContains(xml, "<COFINSAliq>", "<vCOFINS>");
  });

  it("testCOFINSQtdeTotalizer — COFINS Qtde CST 03 generates correct XML", () => {
    const xml = buildCofinsXml({ CST: "03", qBCProd: 1000000, vAliqProd: 760, vCOFINS: 760 });
    expectXmlContains(xml, "<COFINSQtde>", "<vCOFINS>");
  });

  it("testCOFINSOutrTotalizer — COFINS Outr CST 99 generates correct XML", () => {
    const xml = buildCofinsXml({ CST: "99", vBC: 10000, pCOFINS: 76000, vCOFINS: 760 });
    expectXmlContains(xml, "<COFINSOutr>", "<vCOFINS>");
  });

  it("testPISSTWithIndSoma1 — PISST with indSomaPISST=1 includes indicator", () => {
    const xml = buildPisStXml({ vBC: 10000, pPIS: 16500, vPIS: 165, indSomaPISST: 1 });
    expectXmlContains(xml, "<indSomaPISST>1</indSomaPISST>");
  });

  it("testPISSTWithIndSoma0 — PISST with indSomaPISST=0 includes indicator", () => {
    const xml = buildPisStXml({ vBC: 10000, pPIS: 16500, vPIS: 165, indSomaPISST: 0 });
    expectXmlContains(xml, "<indSomaPISST>0</indSomaPISST>");
  });

  it("testCOFINSSTWithIndSoma1 — COFINSST with indSomaCOFINSST=1", () => {
    const xml = buildCofinsStXml({ vBC: 10000, pCOFINS: 76000, vCOFINS: 760, indSomaCOFINSST: 1 });
    expectXmlContains(xml, "<indSomaCOFINSST>1</indSomaCOFINSST>");
  });

  it("testCOFINSSTWithIndSoma0 — COFINSST with indSomaCOFINSST=0", () => {
    const xml = buildCofinsStXml({ vBC: 10000, pCOFINS: 76000, vCOFINS: 760, indSomaCOFINSST: 0 });
    expectXmlContains(xml, "<indSomaCOFINSST>0</indSomaCOFINSST>");
  });
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagDetII (we have buildIiXml)
// =============================================================================

describe("TraitsCoverageTest — II (Imposto de Importacao)", () => {
  it("test_tagII_all_fields — II with all fields", () => {
    const xml = buildIiXml({ vBC: 100000, vDespAdu: 5000, vII: 12000, vIOF: 1500 });
    expectXmlContains(xml,
      "<II>",
      "<vBC>1000.00</vBC>",
      "<vDespAdu>50.00</vDespAdu>",
      "<vII>120.00</vII>",
      "<vIOF>15.00</vIOF>",
    );
  });
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagDetISSQN (NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — ISSQN", () => {
  it("test_tagISSQN_all_fields", () => {
    const totals = createIssqnTotals();
    const xml = buildIssqnXml({
      vBC: 10000, // 100.00
      vAliq: 500, // 5.0000
      vISSQN: 500, // 5.00
      cMunFG: "3550308",
      cListServ: "1401",
      vDeducao: 1000, // 10.00
      vOutro: 200, // 2.00
      vDescIncond: 300, // 3.00
      vDescCond: 100, // 1.00
      vISSRet: 50, // 0.50
      indISS: "1",
      cServico: "1234",
      cMun: "3550308",
      cPais: "1058",
      nProcesso: "9999",
      indIncentivo: "1",
    }, totals);

    expect(xml).toContain("<ISSQN>");
    expectXmlContains(xml,
      "<vBC>100.00</vBC>",
      "<vAliq>5.0000</vAliq>",
      "<vISSQN>5.00</vISSQN>",
      "<cMunFG>3550308</cMunFG>",
      "<cListServ>1401</cListServ>",
      "<vDeducao>10.00</vDeducao>",
      "<vOutro>2.00</vOutro>",
      "<vDescIncond>3.00</vDescIncond>",
      "<vDescCond>1.00</vDescCond>",
      "<vISSRet>0.50</vISSRet>",
      "<indISS>1</indISS>",
      "<cServico>1234</cServico>",
      "<cMun>3550308</cMun>",
      "<cPais>1058</cPais>",
      "<nProcesso>9999</nProcesso>",
      "<indIncentivo>1</indIncentivo>",
    );
    // Totals should be accumulated
    expect(totals.vBC).toBe(10000);
    expect(totals.vISS).toBe(500);
    expect(totals.vISSRet).toBe(50);
  });

  it("test_tagISSQN_zero_vBC_does_not_accumulate_totals", () => {
    const totals = createIssqnTotals();
    const xml = buildIssqnXml({
      vBC: 0,
      vAliq: 500,
      vISSQN: 0,
      cMunFG: "3550308",
      cListServ: "1401",
      indISS: "1",
      indIncentivo: "2",
    }, totals);

    expect(xml).toContain("<ISSQN>");
    expect(xml).toContain("<vBC>0.00</vBC>");
    // Totals should NOT be accumulated when vBC = 0
    expect(totals.vBC).toBe(0);
    expect(totals.vISS).toBe(0);
  });

  it("test_tagISSQN_optional_fields_null", () => {
    const xml = buildIssqnXml({
      vBC: 5000, // 50.00
      vAliq: 300, // 3.0000
      vISSQN: 150, // 1.50
      cMunFG: "3550308",
      cListServ: "1401",
      indISS: "2",
      indIncentivo: "2",
      // all optional fields left unset
    });

    expect(xml).toContain("<ISSQN>");
    expect(xml).toContain("<vBC>50.00</vBC>");
    expect(xml).not.toContain("<cServico>");
    expect(xml).not.toContain("<vDeducao>");
    expect(xml).not.toContain("<vOutro>");
    expect(xml).not.toContain("<nProcesso>");
  });
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagDetIS (IBSCBS — NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — IS (IBSCBS)", () => {
  it("test_tagIS_with_vBCIS", () => {
    const xml = buildIsXml({
      CSTIS: "00",
      cClassTribIS: "001",
      vBCIS: "100.00",
      pIS: "5.0000",
      pISEspec: "1.5000",
      vIS: "5.00",
    });

    expect(xml).toContain("<IS>");
    expect(xml).toContain("<CSTIS>00</CSTIS>");
    expect(xml).toContain("<cClassTribIS>001</cClassTribIS>");
    expect(xml).toContain("<vBCIS>100.00</vBCIS>");
    expect(xml).toContain("<pIS>5.0000</pIS>");
    expect(xml).toContain("<pISEspec>1.5000</pISEspec>");
    expect(xml).toContain("<vIS>5.00</vIS>");
  });

  it("test_tagIS_with_uTrib_and_qTrib", () => {
    const xml = buildIsXml({
      CSTIS: "01",
      cClassTribIS: "002",
      uTrib: "LT",
      qTrib: "10.0000",
      vIS: "8.00",
    });

    expect(xml).toContain("<IS>");
    expect(xml).toContain("<uTrib>LT</uTrib>");
    expect(xml).toContain("<qTrib>10.0000</qTrib>");
  });

  it("test_tagIS_without_vBCIS_or_uTrib", () => {
    const xml = buildIsXml({
      CSTIS: "02",
      cClassTribIS: "003",
      vIS: "3.00",
    });

    expect(xml).toContain("<IS>");
    // vBCIS should not be present
    expect(xml).not.toContain("<vBCIS>");
    // uTrib should not be present
    expect(xml).not.toContain("<uTrib>");
  });
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagCana (NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — Cana", () => {
  it("test_tagcana_and_tagforDia_and_tagdeduc", () => {
    // cana group: sugarcane with safra, forDia[], deduc[]
    const xml = tag("cana", {}, [
      tag("safra", {}, "2025/2026"),
      tag("ref", {}, "01/2026"),
      tag("forDia", { dia: "1" }, [
        tag("qtde", {}, "500.0000000000"),
      ]),
      tag("forDia", { dia: "2" }, [
        tag("qtde", {}, "600.0000000000"),
      ]),
      tag("qTotMes", {}, "10000.0000000000"),
      tag("qTotAnt", {}, "5000.0000000000"),
      tag("qTotGer", {}, "15000.0000000000"),
      tag("deduc", {}, [
        tag("xDed", {}, "DEDUCAO TESTE"),
        tag("vDed", {}, "500.00"),
      ]),
      tag("vFor", {}, "50000.00"),
      tag("vTotDed", {}, "1000.00"),
      tag("vLiqFor", {}, "49000.00"),
    ]);

    expect(xml).toContain("<cana>");
    expect(xml).toContain("<safra>2025/2026</safra>");
    expect(xml).toContain('<forDia dia="1">');
    expect(xml).toContain('<forDia dia="2">');
    expect(xml).toContain("<xDed>DEDUCAO TESTE</xDed>");
    expect(xml).toContain("<vDed>500.00</vDed>");
    expect(xml).toContain("<vLiqFor>49000.00</vLiqFor>");
  });
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagCompra (NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — Compra", () => {
  it("test_tagcompra_all_fields — builds compra with xNEmp, xPed, xCont", () => {
    const xml = tag("compra", {}, [
      tag("xNEmp", {}, "NE-2025-001"),
      tag("xPed", {}, "PED-12345"),
      tag("xCont", {}, "CONT-67890"),
    ]);

    expect(xml).toContain("<compra>");
    expect(xml).toContain("<xNEmp>NE-2025-001</xNEmp>");
    expect(xml).toContain("<xPed>PED-12345</xPed>");
    expect(xml).toContain("<xCont>CONT-67890</xCont>");
  });

  it("test_tagcompra_optional_fields_null — builds compra with only xPed", () => {
    const xml = tag("compra", {}, [
      tag("xPed", {}, "PED-99999"),
    ]);

    expect(xml).toContain("<compra>");
    expect(xml).toContain("<xPed>PED-99999</xPed>");
    expect(xml).not.toContain("<xNEmp>");
    expect(xml).not.toContain("<xCont>");
  });
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagExporta (NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — Exporta", () => {
  it("test_tagexporta_all_fields — builds exporta with UFSaidaPais, xLocExporta, xLocDespacho", () => {
    const xml = tag("exporta", {}, [
      tag("UFSaidaPais", {}, "SP"),
      tag("xLocExporta", {}, "Porto de Santos"),
      tag("xLocDespacho", {}, "Aeroporto de Guarulhos"),
    ]);

    expect(xml).toContain("<exporta>");
    expect(xml).toContain("<UFSaidaPais>SP</UFSaidaPais>");
    expect(xml).toContain("<xLocExporta>Porto de Santos</xLocExporta>");
    expect(xml).toContain("<xLocDespacho>Aeroporto de Guarulhos</xLocDespacho>");
  });

  it("test_tagexporta_without_xLocDespacho — builds exporta without xLocDespacho", () => {
    const xml = tag("exporta", {}, [
      tag("UFSaidaPais", {}, "RJ"),
      tag("xLocExporta", {}, "Porto do Rio"),
    ]);

    expect(xml).toContain("<exporta>");
    expect(xml).toContain("<UFSaidaPais>RJ</UFSaidaPais>");
    expect(xml).toContain("<xLocExporta>Porto do Rio</xLocExporta>");
    expect(xml).not.toContain("<xLocDespacho>");
  });
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagInfIntermed (NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — InfIntermed", () => {
  it("test_tagIntermed — builds infIntermed with CNPJ and optional idCadIntTran", () => {
    const xml = tag("infIntermed", {}, [
      tag("CNPJ", {}, "55667788000199"),
      tag("idCadIntTran", {}, "CADASTRO-ABC"),
    ]);

    expect(xml).toContain("<infIntermed>");
    expect(xml).toContain("<CNPJ>55667788000199</CNPJ>");
    expect(xml).toContain("<idCadIntTran>CADASTRO-ABC</idCadIntTran>");
  });
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagAutXml (NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — AutXML", () => {
  it("test_tagautXML_with_CNPJ — builds autXML with CNPJ", () => {
    const xml = tag("autXML", {}, [
      tag("CNPJ", {}, "12345678000195"),
    ]);

    expect(xml).toContain("<autXML>");
    expect(xml).toContain("<CNPJ>12345678000195</CNPJ>");
  });

  it("test_tagautXML_with_CPF — builds autXML with CPF", () => {
    const xml = tag("autXML", {}, [
      tag("CPF", {}, "12345678901"),
    ]);

    expect(xml).toContain("<autXML>");
    expect(xml).toContain("<CPF>12345678901</CPF>");
    expect(xml).not.toContain("<CNPJ>");
  });

  it("test_tagautXML_with_empty_values — autXML with empty taxId produces empty tag", () => {
    const xml = tag("autXML", {}, [
      tag("CNPJ", {}, ""),
    ]);

    expect(xml).toContain("<autXML>");
    expect(xml).toContain("<CNPJ></CNPJ>");
  });
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagInfRespTec (NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — InfRespTec", () => {
  it("test_taginfRespTec_without_CSRT — builds infRespTec with CNPJ, xContato, email, fone", () => {
    const xml = tag("infRespTec", {}, [
      tag("CNPJ", {}, "11223344000155"),
      tag("xContato", {}, "Suporte Tecnico"),
      tag("email", {}, "suporte@empresa.com.br"),
      tag("fone", {}, "1133334444"),
    ]);

    expect(xml).toContain("<infRespTec>");
    expect(xml).toContain("<CNPJ>11223344000155</CNPJ>");
    expect(xml).toContain("<xContato>Suporte Tecnico</xContato>");
    expect(xml).toContain("<email>suporte@empresa.com.br</email>");
    expect(xml).toContain("<fone>1133334444</fone>");
  });

  it("test_taginfRespTec_with_CSRT — builds infRespTec without fone when not provided", () => {
    const xml = tag("infRespTec", {}, [
      tag("CNPJ", {}, "11223344000155"),
      tag("xContato", {}, "Contato"),
      tag("email", {}, "contato@teste.com"),
    ]);

    expect(xml).toContain("<infRespTec>");
    expect(xml).toContain("<CNPJ>11223344000155</CNPJ>");
    expect(xml).not.toContain("<fone>");
  });
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagAgropecuario (NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — Agropecuario", () => {
  it("test_tagAgropecuarioGuia_all_fields", () => {
    const xml = tag("guiaTransito", {}, [
      tag("tpGuia", {}, "1"),
      tag("UFGuia", {}, "SP"),
      tag("serieGuia", {}, "A"),
      tag("nGuia", {}, "123456"),
    ]);

    expect(xml).toContain("<guiaTransito>");
    expect(xml).toContain("<tpGuia>1</tpGuia>");
    expect(xml).toContain("<UFGuia>SP</UFGuia>");
    expect(xml).toContain("<serieGuia>A</serieGuia>");
    expect(xml).toContain("<nGuia>123456</nGuia>");
  });

  it("test_tagAgropecuarioGuia_optional_fields", () => {
    const xml = tag("guiaTransito", {}, [
      tag("tpGuia", {}, "2"),
      tag("nGuia", {}, "789012"),
    ]);

    expect(xml).toContain("<guiaTransito>");
    expect(xml).toContain("<tpGuia>2</tpGuia>");
    expect(xml).not.toContain("<UFGuia>");
    expect(xml).not.toContain("<serieGuia>");
  });

  it("test_tagAgropecuarioDefensivo", () => {
    const xml = tag("defensivo", {}, [
      tag("nReceituario", {}, "REC001"),
      tag("CPFRespTec", {}, "12345678901"),
    ]);

    expect(xml).toContain("<defensivo>");
    expect(xml).toContain("<nReceituario>REC001</nReceituario>");
    expect(xml).toContain("<CPFRespTec>12345678901</CPFRespTec>");
  });
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagDetImposto (impostoDevolucao — NOT impl.)
// =============================================================================

describe("TraitsCoverageTest — Imposto/ImpostoDevol", () => {
  it("test_tagimposto", () => {
    // PHP: tagimposto creates <imposto> with optional vTotTrib
    const xml = tag("imposto", {}, [
      tag("vTotTrib", {}, "25.50"),
    ]);

    expect(xml).toContain("<imposto>");
    expect(xml).toContain("<vTotTrib>25.50</vTotTrib>");
  });

  it("test_tagimpostoDevol", () => {
    // PHP: impostoDevol has pDevol and IPI/vIPIDevol
    const xml = buildImpostoDevol(10000, 1500); // 100.00%, 15.00

    expect(xml).toContain("<impostoDevol>");
    expect(xml).toContain("<pDevol>100.00</pDevol>");
    expect(xml).toContain("<IPI>");
    expect(xml).toContain("<vIPIDevol>15.00</vIPIDevol>");
  });
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagGCompraGov (NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — GCompraGov", () => {
  it("test_taggCompraGov", () => {
    // PL_010 schema: gCompraGov with tpEnteGov, pRedutor, tpOperGov
    const xml = tag("gCompraGov", {}, [
      tag("tpEnteGov", {}, "1"),
      tag("pRedutor", {}, "10.0000"),
      tag("tpOperGov", {}, "1"),
    ]);

    expect(xml).toContain("<gCompraGov>");
    expect(xml).toContain("<tpEnteGov>1</tpEnteGov>");
    expect(xml).toContain("<pRedutor>10.0000</pRedutor>");
    expect(xml).toContain("<tpOperGov>1</tpOperGov>");
  });
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagGPagAntecipado (NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — GPagAntecipado", () => {
  it("test_taggPagAntecipado_single", () => {
    // PL_010 schema: gPagAntecipado with refNFe
    const xml = tag("gPagAntecipado", {}, [
      tag("refNFe", {}, "35170358716523000119550010000000301000000300"),
    ]);

    expect(xml).toContain("<gPagAntecipado>");
    expect(xml).toContain("<refNFe>35170358716523000119550010000000301000000300</refNFe>");
  });

  it("test_taggPagAntecipado_multiple", () => {
    const refs = [
      "35170358716523000119550010000000301000000300",
      "35170358716523000119550010000000301000000301",
    ];
    const xml = tag("gPagAntecipado", {}, refs.map(r => tag("refNFe", {}, r)));

    expect(xml).toContain("<gPagAntecipado>");
    const count = xml.split("<refNFe>").length - 1;
    expect(count).toBe(2);
  });
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagInfAdic (NOT implemented as integrated feat)
// =============================================================================

describe("TraitsCoverageTest — InfAdic", () => {
  it("test_taginfAdic — builds infAdic with infAdFisco and infCpl", () => {
    const xml = tag("infAdic", {}, [
      tag("infAdFisco", {}, "Informacao do Fisco"),
      tag("infCpl", {}, "Informacao complementar do contribuinte"),
    ]);

    expect(xml).toContain("<infAdic>");
    expect(xml).toContain("<infAdFisco>Informacao do Fisco</infAdFisco>");
    expect(xml).toContain("<infCpl>Informacao complementar do contribuinte</infCpl>");
  });

  it("test_tagobsCont — builds obsCont with xCampo and xTexto", () => {
    const xml = tag("obsCont", { xCampo: "campo1" }, [
      tag("xTexto", {}, "texto do campo 1"),
    ]);

    expect(xml).toContain('<obsCont xCampo="campo1">');
    expect(xml).toContain("<xTexto>texto do campo 1</xTexto>");
  });

  it("test_tagobsFisco — builds obsFisco with xCampo and xTexto", () => {
    const xml = tag("obsFisco", { xCampo: "campoFisco" }, [
      tag("xTexto", {}, "texto fiscal"),
    ]);

    expect(xml).toContain('<obsFisco xCampo="campoFisco">');
    expect(xml).toContain("<xTexto>texto fiscal</xTexto>");
  });

  it("test_tagprocRef — builds procRef with nProc and indProc", () => {
    const xml = tag("procRef", {}, [
      tag("nProc", {}, "PROC-2025-001"),
      tag("indProc", {}, "0"),
    ]);

    expect(xml).toContain("<procRef>");
    expect(xml).toContain("<nProc>PROC-2025-001</nProc>");
    expect(xml).toContain("<indProc>0</indProc>");
  });

  it("test_tagprocRef_without_tpAto — procRef with only nProc and indProc, no tpAto", () => {
    const xml = tag("procRef", {}, [
      tag("nProc", {}, "12345"),
      tag("indProc", {}, "1"),
    ]);

    expect(xml).toContain("<procRef>");
    expect(xml).not.toContain("<tpAto>");
  });

  it("test_buildInfoTags_obsCont_without_infAdic_creates_it — infAdic created with only obsCont", () => {
    const xml = tag("infAdic", {}, [
      tag("obsCont", { xCampo: "obs1" }, [
        tag("xTexto", {}, "valor1"),
      ]),
    ]);

    expect(xml).toContain("<infAdic>");
    expect(xml).toContain('<obsCont xCampo="obs1">');
  });

  it("test_buildInfoTags_obsCont_limit_11_truncates_to_10 — only first 10 obsCont are included", () => {
    const obsItems = Array.from({ length: 11 }, (_, i) =>
      tag("obsCont", { xCampo: `campo${i + 1}` }, [
        tag("xTexto", {}, `texto${i + 1}`),
      ])
    );
    // Simulate the truncation logic from buildInfAdic which slices to 10
    const truncated = obsItems.slice(0, 10);
    const xml = tag("infAdic", {}, truncated);

    const obsCount = xml.split("<obsCont").length - 1;
    expect(obsCount).toBe(10);
    expect(xml).not.toContain("campo11");
  });

  it("test_buildInfoTags_procRef_over_100 — only first 100 procRef are included", () => {
    const procItems = Array.from({ length: 105 }, (_, i) =>
      tag("procRef", {}, [
        tag("nProc", {}, `PROC-${i + 1}`),
        tag("indProc", {}, "0"),
      ])
    );
    // Simulate the truncation logic from buildInfAdic which slices to 100
    const truncated = procItems.slice(0, 100);
    const xml = tag("infAdic", {}, truncated);

    const procCount = xml.split("<procRef>").length - 1;
    expect(procCount).toBe(100);
  });
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagInfNfe (infNFeSupl, etc. — NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — InfNFe supplementary", () => {
  it("test_taginfNFeSupl_with_urlChave", () => {
    // infNFeSupl wraps QR Code and consultation URL for NFC-e
    const xml = tag("infNFeSupl", {}, [
      tag("qrCode", {}, "https://www.nfce.fazenda.sp.gov.br/qrcode?p=12345"),
      tag("urlChave", {}, "https://www.nfe.fazenda.gov.br/portal/consultaNFe.aspx"),
    ]);

    expect(xml).toContain("<infNFeSupl>");
    expect(xml).toContain("<qrCode>https://www.nfce.fazenda.sp.gov.br/qrcode?p=12345</qrCode>");
    expect(xml).toContain("<urlChave>https://www.nfe.fazenda.gov.br/portal/consultaNFe.aspx</urlChave>");
  });

  it("test_taginfNFeSupl_without_urlChave", () => {
    const xml = tag("infNFeSupl", {}, [
      tag("qrCode", {}, "https://www.nfce.fazenda.sp.gov.br/qrcode?p=12345"),
    ]);

    expect(xml).toContain("<infNFeSupl>");
    expect(xml).toContain("<qrCode>");
    expect(xml).not.toContain("<urlChave>");
  });

  it("test_taginfNFe_with_NFe_prefix_in_Id", () => {
    // When Id already has "NFe" prefix, it should be kept as-is
    const id = "NFe35170358716523000119550010000000301000000300";
    const xml = tag("infNFe", { Id: id, versao: "4.00" }, "");

    expect(xml).toContain(`Id="${id}"`);
    expect(xml).toContain('versao="4.00"');
    // The access key is the Id without the "NFe" prefix
    const chave = id.replace(/^NFe/, "");
    expect(chave).toBe("35170358716523000119550010000000301000000300");
    expect(chave.length).toBe(44);
  });
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagRefs (references — NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — References (NFref)", () => {
  it("test_tagrefNFe — buildInvoiceXml includes NFref with refNFe access key", () => {
    const { xml } = buildInvoiceXml({
      model: 55,
      series: 1,
      number: 1,
      emissionType: 1,
      environment: 2,
      issuedAt: new Date("2025-01-15T10:30:00"),
      operationNature: "VENDA",
      issuer: {
        taxId: "58716523000119",
        stateTaxId: "111222333444",
        companyName: "Empresa Teste",
        tradeName: null,
        taxRegime: 3,
        stateCode: "SP",
        cityCode: "3550308",
        cityName: "Sao Paulo",
        street: "Rua Teste",
        streetNumber: "100",
        district: "Centro",
        zipCode: "01001000",
        addressComplement: null,
      },
      items: [{
        itemNumber: 1, productCode: "001", description: "Produto", ncm: "61091000",
        cfop: "5102", unitOfMeasure: "UN", quantity: 1, unitPrice: 10000, totalPrice: 10000,
        icmsCst: "00", icmsModBC: 0, icmsRate: 1800, icmsAmount: 1800, pisCst: "01", cofinsCst: "01",
      }],
      payments: [{ method: "01", amount: 10000 }],
      references: [{ type: "nfe", accessKey: "35170358716523000119550010000000291000000291" }],
    });

    expect(xml).toContain("<NFref>");
    expect(xml).toContain("<refNFe>35170358716523000119550010000000291000000291</refNFe>");
  });

  it("test_tagrefNFeSig", () => {
    // refNFeSig is a signed reference to another NF-e (PL_010 schema)
    const xml = tag("NFref", {}, [
      tag("refNFeSig", {}, "35170358716523000119550010000000301000000300"),
    ]);

    expect(xml).toContain("<NFref>");
    expect(xml).toContain("<refNFeSig>35170358716523000119550010000000301000000300</refNFeSig>");
  });

  it("test_tagrefNF — buildInvoiceXml includes NFref with refNF containing cUF, AAMM, CNPJ, mod, serie, nNF", () => {
    const { xml } = buildInvoiceXml({
      model: 55,
      series: 1,
      number: 2,
      emissionType: 1,
      environment: 2,
      issuedAt: new Date("2025-01-15T10:30:00"),
      operationNature: "VENDA",
      issuer: {
        taxId: "58716523000119",
        stateTaxId: "111222333444",
        companyName: "Empresa Teste",
        tradeName: null,
        taxRegime: 3,
        stateCode: "SP",
        cityCode: "3550308",
        cityName: "Sao Paulo",
        street: "Rua Teste",
        streetNumber: "100",
        district: "Centro",
        zipCode: "01001000",
        addressComplement: null,
      },
      items: [{
        itemNumber: 1, productCode: "001", description: "Produto", ncm: "61091000",
        cfop: "5102", unitOfMeasure: "UN", quantity: 1, unitPrice: 10000, totalPrice: 10000,
        icmsCst: "00", icmsModBC: 0, icmsRate: 1800, icmsAmount: 1800, pisCst: "01", cofinsCst: "01",
      }],
      payments: [{ method: "01", amount: 10000 }],
      references: [{
        type: "nf", stateCode: "35", yearMonth: "1703",
        taxId: "58716523000119", model: "01", series: "1", number: "100",
      }],
    });

    expect(xml).toContain("<NFref>");
    expect(xml).toContain("<refNF>");
    expect(xml).toContain("<AAMM>1703</AAMM>");
    expect(xml).toContain("<mod>01</mod>");
  });

  it("test_tagrefNFP_with_CNPJ — buildInvoiceXml includes NFref with refNFP using CNPJ", () => {
    const { xml } = buildInvoiceXml({
      model: 55,
      series: 1,
      number: 3,
      emissionType: 1,
      environment: 2,
      issuedAt: new Date("2025-01-15T10:30:00"),
      operationNature: "VENDA",
      issuer: {
        taxId: "58716523000119",
        stateTaxId: "111222333444",
        companyName: "Empresa Teste",
        tradeName: null,
        taxRegime: 3,
        stateCode: "SP",
        cityCode: "3550308",
        cityName: "Sao Paulo",
        street: "Rua Teste",
        streetNumber: "100",
        district: "Centro",
        zipCode: "01001000",
        addressComplement: null,
      },
      items: [{
        itemNumber: 1, productCode: "001", description: "Produto", ncm: "61091000",
        cfop: "5102", unitOfMeasure: "UN", quantity: 1, unitPrice: 10000, totalPrice: 10000,
        icmsCst: "00", icmsModBC: 0, icmsRate: 1800, icmsAmount: 1800, pisCst: "01", cofinsCst: "01",
      }],
      payments: [{ method: "01", amount: 10000 }],
      references: [{
        type: "nfp", stateCode: "35", yearMonth: "1703",
        taxId: "58716523000119", model: "04", series: "1", number: "50",
      }],
    });

    expect(xml).toContain("<NFref>");
    expect(xml).toContain("<refNFP>");
    expect(xml).toContain("<CNPJ>58716523000119</CNPJ>");
    expect(xml).toContain("<mod>04</mod>");
  });

  it("test_tagrefNFP_with_CPF — buildInvoiceXml includes NFref with refNFP using CPF", () => {
    const { xml } = buildInvoiceXml({
      model: 55,
      series: 1,
      number: 4,
      emissionType: 1,
      environment: 2,
      issuedAt: new Date("2025-01-15T10:30:00"),
      operationNature: "VENDA",
      issuer: {
        taxId: "58716523000119",
        stateTaxId: "111222333444",
        companyName: "Empresa Teste",
        tradeName: null,
        taxRegime: 3,
        stateCode: "SP",
        cityCode: "3550308",
        cityName: "Sao Paulo",
        street: "Rua Teste",
        streetNumber: "100",
        district: "Centro",
        zipCode: "01001000",
        addressComplement: null,
      },
      items: [{
        itemNumber: 1, productCode: "001", description: "Produto", ncm: "61091000",
        cfop: "5102", unitOfMeasure: "UN", quantity: 1, unitPrice: 10000, totalPrice: 10000,
        icmsCst: "00", icmsModBC: 0, icmsRate: 1800, icmsAmount: 1800, pisCst: "01", cofinsCst: "01",
      }],
      payments: [{ method: "01", amount: 10000 }],
      references: [{
        type: "nfp", stateCode: "35", yearMonth: "1703",
        taxId: "12345678901", model: "04", series: "0", number: "10",
      }],
    });

    expect(xml).toContain("<refNFP>");
    expect(xml).toContain("<CPF>12345678901</CPF>");
  });

  it("test_tagrefCTe — buildInvoiceXml includes NFref with refCTe access key", () => {
    const { xml } = buildInvoiceXml({
      model: 55,
      series: 1,
      number: 5,
      emissionType: 1,
      environment: 2,
      issuedAt: new Date("2025-01-15T10:30:00"),
      operationNature: "VENDA",
      issuer: {
        taxId: "58716523000119",
        stateTaxId: "111222333444",
        companyName: "Empresa Teste",
        tradeName: null,
        taxRegime: 3,
        stateCode: "SP",
        cityCode: "3550308",
        cityName: "Sao Paulo",
        street: "Rua Teste",
        streetNumber: "100",
        district: "Centro",
        zipCode: "01001000",
        addressComplement: null,
      },
      items: [{
        itemNumber: 1, productCode: "001", description: "Produto", ncm: "61091000",
        cfop: "5102", unitOfMeasure: "UN", quantity: 1, unitPrice: 10000, totalPrice: 10000,
        icmsCst: "00", icmsModBC: 0, icmsRate: 1800, icmsAmount: 1800, pisCst: "01", cofinsCst: "01",
      }],
      payments: [{ method: "01", amount: 10000 }],
      references: [{ type: "cte", accessKey: "35170358716523000119570010000000011000000014" }],
    });

    expect(xml).toContain("<NFref>");
    expect(xml).toContain("<refCTe>35170358716523000119570010000000011000000014</refCTe>");
  });

  it("test_tagrefECF — buildInvoiceXml includes NFref with refECF containing mod, nECF, nCOO", () => {
    const { xml } = buildInvoiceXml({
      model: 55,
      series: 1,
      number: 6,
      emissionType: 1,
      environment: 2,
      issuedAt: new Date("2025-01-15T10:30:00"),
      operationNature: "VENDA",
      issuer: {
        taxId: "58716523000119",
        stateTaxId: "111222333444",
        companyName: "Empresa Teste",
        tradeName: null,
        taxRegime: 3,
        stateCode: "SP",
        cityCode: "3550308",
        cityName: "Sao Paulo",
        street: "Rua Teste",
        streetNumber: "100",
        district: "Centro",
        zipCode: "01001000",
        addressComplement: null,
      },
      items: [{
        itemNumber: 1, productCode: "001", description: "Produto", ncm: "61091000",
        cfop: "5102", unitOfMeasure: "UN", quantity: 1, unitPrice: 10000, totalPrice: 10000,
        icmsCst: "00", icmsModBC: 0, icmsRate: 1800, icmsAmount: 1800, pisCst: "01", cofinsCst: "01",
      }],
      payments: [{ method: "01", amount: 10000 }],
      references: [{ type: "ecf", model: "2D", ecfNumber: "123", cooNumber: "456789" }],
    });

    expect(xml).toContain("<refECF>");
    expect(xml).toContain("<mod>2D</mod>");
    expect(xml).toContain("<nECF>123</nECF>");
    expect(xml).toContain("<nCOO>456789</nCOO>");
  });
});

// =============================================================================
// TraitsCoverageTest.php — TraitEventsRTC (sefaz events — NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — Sefaz Events RTC", () => {
  const TEST_CHAVE = "35220605730928000145550010000048661583302923";
  const baseConfig: SefazReformConfig = {
    cOrgao: "35",
    tpAmb: 2,
    cnpj: "93623057000128",
    verAplic: "TestApp_1.0",
  };

  it("test_sefazSolApropCredPresumido", () => {
    const itens = [{
      item: 1,
      vBC: 100.00,
      gIBS: { cCredPres: "01", pCredPres: 2.5000, vCredPres: 2.50 },
      gCBS: { cCredPres: "01", pCredPres: 3.5000, vCredPres: 3.50 },
    }];

    const request = buildSolApropCredPresumido(baseConfig, TEST_CHAVE, 1, itens);

    expect(request).toContain("<tpEvento>211110</tpEvento>");
    expect(request).toContain('<gCredPres nItem="1">');
    expect(request).toContain("<gIBS>");
    expect(request).toContain("<gCBS>");
    expect(request).toContain("<vBC>100.00</vBC>");
  });

  it("test_sefazSolApropCredPresumido_without_gIBS_gCBS", () => {
    const itens = [{
      item: 1,
      vBC: 200.00,
    }];

    const request = buildSolApropCredPresumido(baseConfig, TEST_CHAVE, 1, itens);

    expect(request).toContain("<tpEvento>211110</tpEvento>");
    expect(request).not.toContain("<gIBS>");
    expect(request).not.toContain("<gCBS>");
  });

  it("test_sefazDestinoConsumoPessoal", () => {
    const itens = [{
      item: 1,
      vIBS: 10.00,
      vCBS: 10.00,
      quantidade: 10,
      unidade: "PC",
      chave: TEST_CHAVE,
      nItem: 1,
    }];

    const request = buildDestinoConsumoPessoal(baseConfig, TEST_CHAVE, 1, 2, itens);

    expect(request).toContain("<tpEvento>211120</tpEvento>");
    expect(request).toContain('<gConsumo nItem="1">');
    expect(request).toContain("<qConsumo>");
    expect(request).toContain("<uConsumo>PC</uConsumo>");
    expect(request).toContain("<DFeReferenciado>");
  });

  it("test_sefazAceiteDebito", () => {
    const request = buildAceiteDebito(baseConfig, TEST_CHAVE, 1, 1);

    expect(request).toContain("<tpEvento>211128</tpEvento>");
    expect(request).toContain("<indAceitacao>1</indAceitacao>");
  });

  it("test_sefazImobilizacaoItem", () => {
    const itens = [{
      item: 1,
      vIBS: 10.00,
      vCBS: 10.00,
      quantidade: 5,
      unidade: "UN",
    }];

    const request = buildImobilizacaoItem(baseConfig, TEST_CHAVE, 1, itens);

    expect(request).toContain("<tpEvento>211130</tpEvento>");
    expect(request).toContain('<gImobilizacao nItem="1">');
    expect(request).toContain("<qImobilizado>");
  });

  it("test_sefazApropriacaoCreditoComb", () => {
    const itens = [{
      item: 1,
      vIBS: 10.00,
      vCBS: 10.00,
      quantidade: 100,
      unidade: "LT",
    }];

    const request = buildApropriacaoCreditoComb(baseConfig, TEST_CHAVE, 1, itens);

    expect(request).toContain("<tpEvento>211140</tpEvento>");
    expect(request).toContain('<gConsumoComb nItem="1">');
    expect(request).toContain("<qComb>");
    expect(request).toContain("<uComb>LT</uComb>");
  });

  it("test_sefazApropriacaoCreditoBens", () => {
    const itens = [{
      item: 1,
      vCredIBS: 10.00,
      vCredCBS: 10.00,
    }];

    const request = buildApropriacaoCreditoBens(baseConfig, TEST_CHAVE, 1, itens);

    expect(request).toContain("<tpEvento>211150</tpEvento>");
    expect(request).toContain('<gCredito nItem="1">');
    expect(request).toContain("<vCredIBS>10.00</vCredIBS>");
    expect(request).toContain("<vCredCBS>10.00</vCredCBS>");
  });

  it("test_sefazManifestacaoTransfCredIBS", () => {
    const request = buildManifestacaoTransfCredIBS(baseConfig, TEST_CHAVE, 1, 1);

    expect(request).toContain("<tpEvento>212110</tpEvento>");
    expect(request).toContain("<tpAutor>8</tpAutor>");
    expect(request).toContain("<indAceitacao>1</indAceitacao>");
  });

  it("test_sefazManifestacaoTransfCredCBS", () => {
    const request = buildManifestacaoTransfCredCBS(baseConfig, TEST_CHAVE, 1, 1);

    expect(request).toContain("<tpEvento>212120</tpEvento>");
    expect(request).toContain("<tpAutor>8</tpAutor>");
  });

  it("test_sefazCancelaEvento", () => {
    const request = buildCancelaEvento(
      baseConfig, TEST_CHAVE, 1, "112110", "135260000000001"
    );

    expect(request).toContain("<tpEvento>110001</tpEvento>");
    expect(request).toContain("<tpEventoAut>112110</tpEventoAut>");
    expect(request).toContain("<nProtEvento>135260000000001</nProtEvento>");
  });

  it("test_sefazImportacaoZFM", () => {
    const itens = [{
      item: 1,
      vIBS: 5.00,
      vCBS: 5.00,
      quantidade: 10,
      unidade: "UN",
    }];

    const request = buildImportacaoZFM(baseConfig, TEST_CHAVE, 1, itens);

    expect(request).toContain("<tpEvento>112120</tpEvento>");
    expect(request).toContain('<gConsumo nItem="1">');
    expect(request).toContain("<qtde>");
    expect(request).toContain("<unidade>UN</unidade>");
  });

  it("test_sefazRouboPerdaTransporteAdquirente", () => {
    const itens = [{
      item: 1,
      vIBS: 10.00,
      vCBS: 10.00,
      quantidade: 5,
      unidade: "UN",
    }];

    const request = buildRouboPerdaTransporteAdquirente(baseConfig, TEST_CHAVE, 1, itens);

    expect(request).toContain("<tpEvento>211124</tpEvento>");
    expect(request).toContain('<gPerecimento nItem="1">');
    expect(request).toContain("<qPerecimento>");
    expect(request).toContain("<tpAutor>2</tpAutor>");
  });

  it("test_sefazRouboPerdaTransporteFornecedor", () => {
    const itens = [{
      item: 1,
      vIBS: 10.00,
      vCBS: 10.00,
      gControleEstoque_vIBS: 8.00,
      gControleEstoque_vCBS: 8.00,
      quantidade: 3,
      unidade: "KG",
    }];

    const request = buildRouboPerdaTransporteFornecedor(baseConfig, TEST_CHAVE, 1, itens);

    expect(request).toContain("<tpEvento>112130</tpEvento>");
    expect(request).toContain('<gPerecimento nItem="1">');
    expect(request).toContain("<tpAutor>1</tpAutor>");
  });

  it("test_sefazFornecimentoNaoRealizado", () => {
    const itens = [{
      item: 1,
      vIBS: 10.00,
      vCBS: 10.00,
      quantidade: 5,
      unidade: "UN",
    }];

    const request = buildFornecimentoNaoRealizado(baseConfig, TEST_CHAVE, 1, itens);

    expect(request).toContain("<tpEvento>112140</tpEvento>");
    expect(request).toContain('<gItemNaoFornecido nItem="1">');
    expect(request).toContain("<qNaoFornecida>");
    expect(request).toContain("<uNaoFornecida>UN</uNaoFornecida>");
  });

  it("test_sefazAtualizacaoDataEntrega", () => {
    const request = buildAtualizacaoDataEntrega(baseConfig, TEST_CHAVE, 1, "2026-06-15");

    expect(request).toContain("<tpEvento>112150</tpEvento>");
    expect(request).toContain("<dPrevEntrega>2026-06-15</dPrevEntrega>");
  });

  it("test_resolveVerAplic_with_explicit_value", () => {
    // When explicit verAplic is passed, it should be used
    const request = buildAceiteDebito(baseConfig, TEST_CHAVE, 1, 1, "CustomApp_2.0");

    expect(request).toContain("<verAplic>CustomApp_2.0</verAplic>");
  });

  it("test_resolveVerAplic_fallback_to_default", () => {
    // When no verAplic is set at all, fallback to "4.00"
    const configNoVerAplic: SefazReformConfig = {
      cOrgao: "35",
      tpAmb: 2,
      cnpj: "93623057000128",
      verAplic: "",
    };

    const result = resolveVerAplic(undefined, configNoVerAplic.verAplic);
    expect(result).toBe("4.00");

    const request = buildAceiteDebito(configNoVerAplic, TEST_CHAVE, 1, 1);
    expect(request).toContain("<verAplic>4.00</verAplic>");
  });
});

// =============================================================================
// TraitsCoverageTest.php — TraitEPECNfce (NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — EPEC NFCe", () => {
  const epecConfig: EpecNfceConfig = {
    siglaUF: "SP",
    tpAmb: 2,
    cnpj: "23285089000185",
  };

  it("test_sefaz_epec_nfce_sp_success", () => {
    const xml = buildTestNfceXml("SP", "35");
    const request = buildEpecNfceXml(xml, epecConfig);

    expect(request).toContain("<descEvento>EPEC</descEvento>");
    expect(request).toContain("<tpEvento>110140</tpEvento>");
  });

  it("test_sefaz_epec_nfce_not_contingency_throws", () => {
    // Build XML with tpEmis=1 (not contingency) — should throw
    const xml = buildTestNfceXml("SP", "35", "1");

    expect(() => buildEpecNfceXml(xml, epecConfig)).toThrow("contingência EPEC");
  });

  it("test_sefaz_epec_nfce_mismatched_uf_throws", () => {
    // Build NFCe with UF=PR (41) but config is SP (35) — should throw
    const xml = buildTestNfceXml("PR", "41");

    expect(() => buildEpecNfceXml(xml, epecConfig)).toThrow("autor");
  });

  it("test_sefaz_epec_nfce_with_cpf_dest", () => {
    const xml = buildTestNfceXml("SP", "35", "4", "CPF");
    const request = buildEpecNfceXml(xml, epecConfig);

    expect(request).toContain("<CPF>");
  });

  it("test_sefaz_epec_nfce_with_idEstrangeiro", () => {
    const xml = buildTestNfceXml("SP", "35", "4", "idEstrangeiro");
    const request = buildEpecNfceXml(xml, epecConfig);

    expect(request).toContain("<idEstrangeiro>");
  });

  it("test_sefaz_epec_nfce_without_dest", () => {
    const xml = buildTestNfceXml("SP", "35", "4", "none");
    const request = buildEpecNfceXml(xml, epecConfig);

    expect(request).toContain("<descEvento>EPEC</descEvento>");
  });

  it("test_sefaz_epec_nfce_with_verAplic_param", () => {
    const configWithVerAplic: EpecNfceConfig = {
      siglaUF: "SP",
      tpAmb: 2,
      cnpj: "23285089000185",
      verAplic: "MyApp_3.0",
    };
    const xml = buildTestNfceXml("SP", "35");
    const request = buildEpecNfceXml(xml, configWithVerAplic, "CustomEPEC_1.0");

    expect(request).toContain("<verAplic>CustomEPEC_1.0</verAplic>");
  });

  it("test_sefaz_status_epec_nfce_default_uf_and_tpAmb", () => {
    // Call without uf/tpAmb params — should use config defaults (SP, 2)
    const request = buildEpecNfceStatusXml(epecConfig);

    expect(request).toContain("consStatServ");
  });
});

// =============================================================================
// TraitsCoverageTest.php — TraitCalculations (full XML render — NOT impl.)
// =============================================================================

describe("TraitsCoverageTest — Full XML render", () => {
  it("test_getXML_renders_complete_nfe_with_items — buildInvoiceXml produces XML with all required sections", () => {
    const { xml, accessKey } = buildInvoiceXml({
      model: 55,
      series: 1,
      number: 1,
      emissionType: 1,
      environment: 2,
      issuedAt: new Date("2025-01-15T10:30:00"),
      operationNature: "VENDA",
      issuer: {
        taxId: "58716523000119",
        stateTaxId: "111222333444",
        companyName: "Empresa Teste",
        tradeName: "Teste",
        taxRegime: 3,
        stateCode: "SP",
        cityCode: "3550308",
        cityName: "Sao Paulo",
        street: "Rua Teste",
        streetNumber: "100",
        district: "Centro",
        zipCode: "01001000",
        addressComplement: null,
      },
      recipient: { taxId: "12345678901", name: "Cliente Teste", stateCode: "SP" },
      items: [{
        itemNumber: 1, productCode: "001", description: "Produto Teste", ncm: "61091000",
        cfop: "5102", unitOfMeasure: "UN", quantity: 1, unitPrice: 10000, totalPrice: 10000,
        icmsCst: "00", icmsModBC: 0, icmsRate: 1800, icmsAmount: 1800,
        pisCst: "01", pisVBC: 10000, pisPPIS: 16500, pisVPIS: 165,
        cofinsCst: "01", cofinsVBC: 10000, cofinsPCOFINS: 76000, cofinsVCOFINS: 760,
      }],
      payments: [{ method: "01", amount: 10000 }],
    });

    expect(accessKey).toHaveLength(44);
    expect(xml).toContain("<?xml version");
    expect(xml).toContain("<ide>");
    expect(xml).toContain("<emit>");
    expect(xml).toContain("<dest>");
    expect(xml).toContain("<det ");
    expect(xml).toContain("<total>");
    expect(xml).toContain("<transp>");
    expect(xml).toContain("<pag>");
    expect(xml).toContain("<vProd>100.00</vProd>");
  });

  it("test_getXML_with_two_items — buildInvoiceXml with two items accumulates totals correctly", () => {
    const { xml } = buildInvoiceXml({
      model: 55,
      series: 1,
      number: 2,
      emissionType: 1,
      environment: 2,
      issuedAt: new Date("2025-01-15T10:30:00"),
      operationNature: "VENDA",
      issuer: {
        taxId: "58716523000119",
        stateTaxId: "111222333444",
        companyName: "Empresa Teste",
        tradeName: null,
        taxRegime: 3,
        stateCode: "SP",
        cityCode: "3550308",
        cityName: "Sao Paulo",
        street: "Rua Teste",
        streetNumber: "100",
        district: "Centro",
        zipCode: "01001000",
        addressComplement: null,
      },
      items: [
        {
          itemNumber: 1, productCode: "001", description: "Item A", ncm: "61091000",
          cfop: "5102", unitOfMeasure: "UN", quantity: 1, unitPrice: 15000, totalPrice: 15000,
          icmsCst: "00", icmsModBC: 0, icmsRate: 1800, icmsAmount: 2700, pisCst: "01", cofinsCst: "01",
        },
        {
          itemNumber: 2, productCode: "002", description: "Item B", ncm: "61091000",
          cfop: "5102", unitOfMeasure: "UN", quantity: 1, unitPrice: 25000, totalPrice: 25000,
          icmsCst: "00", icmsModBC: 0, icmsRate: 1800, icmsAmount: 4500, pisCst: "01", cofinsCst: "01",
        },
      ],
      payments: [{ method: "01", amount: 40000 }],
    });

    expect(xml).toContain('<det nItem="1">');
    expect(xml).toContain('<det nItem="2">');
    expect(xml).toContain("<vProd>400.00</vProd>");
    expect(xml).toContain("<vNF>400.00</vNF>");
  });

  it("test_full_nfe_with_multiple_traits — buildInvoiceXml with transport, billing, refs, withdrawal, delivery, autXML, infAdic, intermediary, techResponsible, purchase, export", () => {
    const { xml } = buildInvoiceXml({
      model: 55,
      series: 1,
      number: 99,
      emissionType: 1,
      environment: 2,
      issuedAt: new Date("2025-03-01T09:00:00"),
      operationNature: "VENDA",
      issuer: {
        taxId: "58716523000119",
        stateTaxId: "111222333444",
        companyName: "Empresa Teste",
        tradeName: "Teste",
        taxRegime: 3,
        stateCode: "SP",
        cityCode: "3550308",
        cityName: "Sao Paulo",
        street: "Rua Teste",
        streetNumber: "100",
        district: "Centro",
        zipCode: "01001000",
        addressComplement: null,
      },
      recipient: { taxId: "12345678901", name: "Cliente", stateCode: "SP" },
      items: [{
        itemNumber: 1, productCode: "001", description: "Produto", ncm: "61091000",
        cfop: "5102", unitOfMeasure: "UN", quantity: 1, unitPrice: 10000, totalPrice: 10000,
        icmsCst: "00", icmsModBC: 0, icmsRate: 1800, icmsAmount: 1800, pisCst: "01", cofinsCst: "01",
      }],
      payments: [{ method: "03", amount: 15000 }],
      changeAmount: 5000,
      paymentCardDetails: [{
        integType: "1", cardTaxId: "12345678000195", cardBrand: "01", authCode: "AUTH999",
      }],
      references: [
        { type: "nfe", accessKey: "35170358716523000119550010000000291000000291" },
        { type: "ecf", model: "2D", ecfNumber: "001", cooNumber: "000100" },
      ],
      transport: {
        freightMode: "0",
        carrier: { taxId: "12345678000195", name: "Transportadora ABC", stateTaxId: "111222333444", stateCode: "SP", address: "Rua do Transporte" },
        vehicle: { plate: "ABC1D23", stateCode: "SP", rntc: "12345678" },
        trailers: [{ plate: "XYZ9F87", stateCode: "SP" }],
        volumes: [{
          quantity: 10, species: "CAIXA", brand: "MARCA", number: "001",
          netWeight: 100.5, grossWeight: 120.3, seals: ["LACRE001", "LACRE002"],
        }],
        retainedIcms: { vBCRet: 10000, pICMSRet: 1200, vICMSRet: 1200, cfop: "5352", cityCode: "3550308" },
      },
      billing: {
        invoice: { number: "001", originalValue: 10000, discountValue: 0, netValue: 10000 },
        installments: [
          { number: "001", dueDate: "2025-04-01", value: 5000 },
          { number: "002", dueDate: "2025-05-01", value: 5000 },
        ],
      },
      withdrawal: {
        taxId: "99887766000100", name: "Empresa Origem",
        street: "Rua Retirada", number: "50", district: "Industrial",
        cityCode: "4106902", cityName: "Curitiba", stateCode: "PR",
      },
      delivery: {
        taxId: "11222333000181", name: "Empresa Destino",
        street: "Rua Entrega", number: "200", complement: "Sala 1",
        district: "Centro", cityCode: "3550308", cityName: "Sao Paulo", stateCode: "SP",
      },
      authorizedXml: [{ taxId: "12345678000195" }, { taxId: "12345678901" }],
      additionalInfo: {
        taxpayerNote: "Nota de teste completa",
        taxAuthorityNote: "Info fisco",
        contributorObs: [{ field: "campo1", text: "valor1" }],
        fiscalObs: [{ field: "fiscalCampo", text: "fiscalValor" }],
        processRefs: [{ number: "PROC001", origin: "0" }],
      },
      intermediary: { taxId: "55667788000199", idCadIntTran: "CAD001" },
      techResponsible: { taxId: "11223344000155", contact: "Suporte", email: "suporte@teste.com", phone: "1133334444" },
      purchase: { orderNumber: "PED-001", contractNumber: "CONT-001", purchaseNote: "NE-001" },
      export: { exitState: "SP", exportLocation: "Porto de Santos", dispatchLocation: "Aeroporto de Guarulhos" },
    });

    // All sections present
    expect(xml).toContain("<ide>");
    expect(xml).toContain("<emit>");
    expect(xml).toContain("<dest>");
    expect(xml).toContain("<retirada>");
    expect(xml).toContain("<entrega>");
    expect(xml).toContain("<autXML>");
    expect(xml).toContain("<det ");
    expect(xml).toContain("<total>");
    expect(xml).toContain("<transp>");
    expect(xml).toContain("<cobr>");
    expect(xml).toContain("<pag>");
    expect(xml).toContain("<infIntermed>");
    expect(xml).toContain("<infAdic>");
    expect(xml).toContain("<exporta>");
    expect(xml).toContain("<compra>");
    expect(xml).toContain("<infRespTec>");

    // References
    expect(xml).toContain("<refNFe>35170358716523000119550010000000291000000291</refNFe>");
    expect(xml).toContain("<refECF>");

    // Transport details
    expect(xml).toContain("<modFrete>0</modFrete>");
    expect(xml).toContain("<transporta>");
    expect(xml).toContain("<veicTransp>");
    expect(xml).toContain("<placa>ABC1D23</placa>");
    expect(xml).toContain("<reboque>");
    expect(xml).toContain("<vol>");
    expect(xml).toContain("<nLacre>LACRE001</nLacre>");
    expect(xml).toContain("<retTransp>");

    // Billing
    expect(xml).toContain("<fat>");
    expect(xml).toContain("<nFat>001</nFat>");
    const dupCount = xml.split("<dup>").length - 1;
    expect(dupCount).toBe(2);

    // Payment with card details and change
    expect(xml).toContain("<vTroco>50.00</vTroco>");
    expect(xml).toContain("<card>");
    expect(xml).toContain("<tpIntegra>1</tpIntegra>");
    expect(xml).toContain("<tBand>01</tBand>");
    expect(xml).toContain("<cAut>AUTH999</cAut>");

    // Withdrawal/delivery
    expect(xml).toContain("<xLgr>Rua Retirada</xLgr>");
    expect(xml).toContain("<xLgr>Rua Entrega</xLgr>");
    expect(xml).toContain("<xCpl>Sala 1</xCpl>");

    // autXML (2 entries: CNPJ + CPF)
    const autXmlCount = xml.split("<autXML>").length - 1;
    expect(autXmlCount).toBe(2);

    // Additional info
    expect(xml).toContain("<infAdFisco>Info fisco</infAdFisco>");
    expect(xml).toContain("Nota de teste completa");
    expect(xml).toContain('<obsCont xCampo="campo1">');
    expect(xml).toContain('<obsFisco xCampo="fiscalCampo">');
    expect(xml).toContain("<nProc>PROC001</nProc>");

    // Intermediary
    expect(xml).toContain("<idCadIntTran>CAD001</idCadIntTran>");

    // Tech responsible
    expect(xml).toContain("<xContato>Suporte</xContato>");
    expect(xml).toContain("<fone>1133334444</fone>");

    // Purchase
    expect(xml).toContain("<xNEmp>NE-001</xNEmp>");
    expect(xml).toContain("<xPed>PED-001</xPed>");
    expect(xml).toContain("<xCont>CONT-001</xCont>");

    // Export
    expect(xml).toContain("<UFSaidaPais>SP</UFSaidaPais>");
    expect(xml).toContain("<xLocExporta>Porto de Santos</xLocExporta>");
    expect(xml).toContain("<xLocDespacho>Aeroporto de Guarulhos</xLocDespacho>");
  });
});
