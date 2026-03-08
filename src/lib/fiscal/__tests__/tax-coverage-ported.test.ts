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
  it.todo("test_tagISSQN_all_fields");
  it.todo("test_tagISSQN_zero_vBC_does_not_accumulate_totals");
  it.todo("test_tagISSQN_optional_fields_null");
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagDetIS (IBSCBS — NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — IS (IBSCBS)", () => {
  it.todo("test_tagIS_with_vBCIS");
  it.todo("test_tagIS_with_uTrib_and_qTrib");
  it.todo("test_tagIS_without_vBCIS_or_uTrib");
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagCana (NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — Cana", () => {
  it.todo("test_tagcana_and_tagforDia_and_tagdeduc");
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagCompra (NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — Compra", () => {
  it.todo("test_tagcompra_all_fields");
  it.todo("test_tagcompra_optional_fields_null");
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagExporta (NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — Exporta", () => {
  it.todo("test_tagexporta_all_fields");
  it.todo("test_tagexporta_without_xLocDespacho");
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagInfIntermed (NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — InfIntermed", () => {
  it.todo("test_tagIntermed");
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagAutXml (NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — AutXML", () => {
  it.todo("test_tagautXML_with_CNPJ");
  it.todo("test_tagautXML_with_CPF");
  it.todo("test_tagautXML_with_empty_values");
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagInfRespTec (NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — InfRespTec", () => {
  it.todo("test_taginfRespTec_without_CSRT");
  it.todo("test_taginfRespTec_with_CSRT");
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagAgropecuario (NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — Agropecuario", () => {
  it.todo("test_tagAgropecuarioGuia_all_fields");
  it.todo("test_tagAgropecuarioGuia_optional_fields");
  it.todo("test_tagAgropecuarioDefensivo");
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagDetImposto (impostoDevolucao — NOT impl.)
// =============================================================================

describe("TraitsCoverageTest — Imposto/ImpostoDevol", () => {
  it.todo("test_tagimposto");
  it.todo("test_tagimpostoDevol");
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagGCompraGov (NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — GCompraGov", () => {
  it.todo("test_taggCompraGov");
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagGPagAntecipado (NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — GPagAntecipado", () => {
  it.todo("test_taggPagAntecipado_single");
  it.todo("test_taggPagAntecipado_multiple");
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagInfAdic (NOT implemented as integrated feat)
// =============================================================================

describe("TraitsCoverageTest — InfAdic", () => {
  it.todo("test_taginfAdic");
  it.todo("test_tagobsCont");
  it.todo("test_tagobsFisco");
  it.todo("test_tagprocRef");
  it.todo("test_tagprocRef_without_tpAto");
  it.todo("test_buildInfoTags_obsCont_without_infAdic_creates_it");
  it.todo("test_buildInfoTags_obsCont_limit_11_truncates_to_10");
  it.todo("test_buildInfoTags_procRef_over_100");
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagInfNfe (infNFeSupl, etc. — NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — InfNFe supplementary", () => {
  it.todo("test_taginfNFeSupl_with_urlChave");
  it.todo("test_taginfNFeSupl_without_urlChave");
  it.todo("test_taginfNFe_with_NFe_prefix_in_Id");
});

// =============================================================================
// TraitsCoverageTest.php — TraitTagRefs (references — NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — References (NFref)", () => {
  it.todo("test_tagrefNFe");
  it.todo("test_tagrefNFeSig");
  it.todo("test_tagrefNF");
  it.todo("test_tagrefNFP_with_CNPJ");
  it.todo("test_tagrefNFP_with_CPF");
  it.todo("test_tagrefCTe");
  it.todo("test_tagrefECF");
});

// =============================================================================
// TraitsCoverageTest.php — TraitEventsRTC (sefaz events — NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — Sefaz Events RTC", () => {
  it.todo("test_sefazSolApropCredPresumido");
  it.todo("test_sefazSolApropCredPresumido_without_gIBS_gCBS");
  it.todo("test_sefazDestinoConsumoPessoal");
  it.todo("test_sefazAceiteDebito");
  it.todo("test_sefazImobilizacaoItem");
  it.todo("test_sefazApropriacaoCreditoComb");
  it.todo("test_sefazApropriacaoCreditoBens");
  it.todo("test_sefazManifestacaoTransfCredIBS");
  it.todo("test_sefazManifestacaoTransfCredCBS");
  it.todo("test_sefazCancelaEvento");
  it.todo("test_sefazImportacaoZFM");
  it.todo("test_sefazRouboPerdaTransporteAdquirente");
  it.todo("test_sefazRouboPerdaTransporteFornecedor");
  it.todo("test_sefazFornecimentoNaoRealizado");
  it.todo("test_sefazAtualizacaoDataEntrega");
  it.todo("test_resolveVerAplic_with_explicit_value");
  it.todo("test_resolveVerAplic_fallback_to_default");
});

// =============================================================================
// TraitsCoverageTest.php — TraitEPECNfce (NOT implemented)
// =============================================================================

describe("TraitsCoverageTest — EPEC NFCe", () => {
  it.todo("test_sefaz_epec_nfce_sp_success");
  it.todo("test_sefaz_epec_nfce_not_contingency_throws");
  it.todo("test_sefaz_epec_nfce_mismatched_uf_throws");
  it.todo("test_sefaz_epec_nfce_with_cpf_dest");
  it.todo("test_sefaz_epec_nfce_with_idEstrangeiro");
  it.todo("test_sefaz_epec_nfce_without_dest");
  it.todo("test_sefaz_epec_nfce_with_verAplic_param");
  it.todo("test_sefaz_status_epec_nfce_default_uf_and_tpAmb");
});

// =============================================================================
// TraitsCoverageTest.php — TraitCalculations (full XML render — NOT impl.)
// =============================================================================

describe("TraitsCoverageTest — Full XML render", () => {
  it.todo("test_getXML_renders_complete_nfe_with_items");
  it.todo("test_getXML_with_two_items");
  it.todo("test_full_nfe_with_multiple_traits");
});
