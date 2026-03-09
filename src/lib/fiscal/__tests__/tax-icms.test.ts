import { describe, it, expect } from "bun:test";
import { buildIcmsXml, buildIcmsUfDestXml, createIcmsTotals, mergeIcmsTotals } from "../tax-icms";

describe("buildIcmsXml — Regime Normal (CST)", () => {
  it("CST 00 — regular ICMS", () => {
    const { xml, totals } = buildIcmsXml({
      taxRegime: 3, orig: "0", CST: "00",
      modBC: "0", vBC: 10000, pICMS: 1800, vICMS: 1800,
    });
    expect(xml).toContain("<ICMS00>");
    expect(xml).toContain("<orig>0</orig>");
    expect(xml).toContain("<CST>00</CST>");
    expect(xml).toContain("<modBC>0</modBC>");
    expect(xml).toContain("<vBC>100.00</vBC>");
    expect(xml).toContain("<pICMS>18.0000</pICMS>");
    expect(xml).toContain("<vICMS>18.00</vICMS>");
    expect(totals.vBC).toBe(10000);
    expect(totals.vICMS).toBe(1800);
  });

  it("CST 00 — with FCP", () => {
    const { xml, totals } = buildIcmsXml({
      taxRegime: 3, orig: "0", CST: "00",
      modBC: "0", vBC: 10000, pICMS: 1800, vICMS: 1800,
      vBCFCP: 10000, pFCP: 200, vFCP: 200,
    });
    expect(xml).toContain("<pFCP>");
    expect(xml).toContain("<vFCP>2.00</vFCP>");
    expect(totals.vFCP).toBe(200);
  });

  it("CST 10 — ICMS with ST", () => {
    const { xml, totals } = buildIcmsXml({
      taxRegime: 3, orig: "0", CST: "10",
      modBC: "0", vBC: 10000, pICMS: 1800, vICMS: 1800,
      modBCST: "4", pMVAST: 4000, vBCST: 14000, pICMSST: 1800, vICMSST: 720,
    });
    expect(xml).toContain("<ICMS10>");
    expect(xml).toContain("<modBCST>4</modBCST>");
    expect(xml).toContain("<vBCST>140.00</vBCST>");
    expect(xml).toContain("<vICMSST>7.20</vICMSST>");
    expect(totals.vBCST).toBe(14000);
    expect(totals.vST).toBe(720);
  });

  it("CST 20 — ICMS with base reduction", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 3, orig: "0", CST: "20",
      modBC: "0", pRedBC: 5000, vBC: 5000, pICMS: 1800, vICMS: 900,
    });
    expect(xml).toContain("<ICMS20>");
    expect(xml).toContain("<pRedBC>50.0000</pRedBC>");
  });

  it("CST 30 — exempt with ST", () => {
    const { xml, totals } = buildIcmsXml({
      taxRegime: 3, orig: "0", CST: "30",
      modBCST: "4", vBCST: 10000, pICMSST: 1800, vICMSST: 1800,
    });
    expect(xml).toContain("<ICMS30>");
    expect(totals.vST).toBe(1800);
  });

  it("CST 40 — exempt (isento)", () => {
    const { xml, totals } = buildIcmsXml({
      taxRegime: 3, orig: "0", CST: "40",
    });
    expect(xml).toContain("<ICMS40>");
    expect(xml).toContain("<CST>40</CST>");
    expect(totals.vICMS).toBe(0);
  });

  it("CST 41 — not taxed", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 3, orig: "0", CST: "41",
    });
    expect(xml).toContain("<ICMS40>"); // 41 uses same tag as 40
    expect(xml).toContain("<CST>41</CST>");
  });

  it("CST 50 — suspended", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 3, orig: "0", CST: "50",
    });
    expect(xml).toContain("<CST>50</CST>");
  });

  it("CST 51 — deferred", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 3, orig: "0", CST: "51",
      modBC: "0", vBC: 10000, pICMS: 1800, vICMS: 1800,
    });
    expect(xml).toContain("<ICMS51>");
  });

  it("CST 60 — ICMS previously charged by ST", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 3, orig: "0", CST: "60",
    });
    expect(xml).toContain("<ICMS60>");
  });

  it("CST 70 — reduction with ST", () => {
    const { xml, totals } = buildIcmsXml({
      taxRegime: 3, orig: "0", CST: "70",
      modBC: "0", pRedBC: 3000, vBC: 7000, pICMS: 1800, vICMS: 1260,
      modBCST: "4", vBCST: 10000, pICMSST: 1800, vICMSST: 540,
    });
    expect(xml).toContain("<ICMS70>");
    expect(totals.vBC).toBe(7000);
    expect(totals.vST).toBe(540);
  });

  it("CST 90 — other", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 3, orig: "0", CST: "90",
      modBC: "0", vBC: 10000, pICMS: 1200, vICMS: 1200,
    });
    expect(xml).toContain("<ICMS90>");
  });

  it("throws on unknown CST", () => {
    expect(() => buildIcmsXml({
      taxRegime: 3, orig: "0", CST: "99",
    })).toThrow();
  });
});

describe("buildIcmsXml — Simples Nacional (CSOSN)", () => {
  it("CSOSN 101 — with SN credit", () => {
    const { xml, totals } = buildIcmsXml({
      taxRegime: 1, orig: "0", CSOSN: "101",
      pCredSN: 350, vCredICMSSN: 350,
    });
    expect(xml).toContain("<CSOSN>101</CSOSN>");
    expect(xml).toContain("<pCredSN>");
    expect(xml).toContain("<vCredICMSSN>");
  });

  it("CSOSN 102 — without credit", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 1, orig: "0", CSOSN: "102",
    });
    expect(xml).toContain("<CSOSN>102</CSOSN>");
    expect(xml).not.toContain("<pCredSN>");
  });

  it("CSOSN 103 — exempt", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 1, orig: "0", CSOSN: "103",
    });
    expect(xml).toContain("<CSOSN>103</CSOSN>");
  });

  it("CSOSN 201 — SN with ST and credit", () => {
    const { xml, totals } = buildIcmsXml({
      taxRegime: 1, orig: "0", CSOSN: "201",
      modBCST: "4", vBCST: 10000, pICMSST: 1800, vICMSST: 1800,
      pCredSN: 350, vCredICMSSN: 350,
    });
    expect(xml).toContain("<CSOSN>201</CSOSN>");
    expect(xml).toContain("<vICMSST>");
    expect(xml).toContain("<pCredSN>");
    expect(totals.vST).toBe(1800);
  });

  it("CSOSN 202 — SN with ST, no credit", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 1, orig: "0", CSOSN: "202",
      modBCST: "4", vBCST: 10000, pICMSST: 1800, vICMSST: 1800,
    });
    expect(xml).toContain("<CSOSN>202</CSOSN>");
  });

  it("CSOSN 500 — previously charged by ST", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 1, orig: "0", CSOSN: "500",
    });
    expect(xml).toContain("<CSOSN>500</CSOSN>");
  });

  it("CSOSN 900 — other SN", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 1, orig: "0", CSOSN: "900",
      modBC: "0", vBC: 10000, pICMS: 1800, vICMS: 1800,
    });
    expect(xml).toContain("<CSOSN>900</CSOSN>");
  });

  it("throws on unknown CSOSN", () => {
    expect(() => buildIcmsXml({
      taxRegime: 1, orig: "0", CSOSN: "999",
    })).toThrow();
  });
});

describe("buildIcmsUfDestXml", () => {
  it("builds interstate destination ICMS", () => {
    const { xml } = buildIcmsUfDestXml({
      taxRegime: 3, orig: "0",
      vBCUFDest: 10000, pFCPUFDest: 200, vFCPUFDest: 200,
      pICMSUFDest: 1800, vICMSUFDest: 600,
      pICMSInter: 1200, pICMSInterPart: 10000,
      vICMSUFRemet: 1200,
    });
    expect(xml).toContain("<ICMSUFDest>");
    expect(xml).toContain("<vBCUFDest>100.00</vBCUFDest>");
  });
});

describe("totals accumulation", () => {
  it("createIcmsTotals returns zeroed object", () => {
    const t = createIcmsTotals();
    expect(t.vBC).toBe(0);
    expect(t.vICMS).toBe(0);
    expect(t.vST).toBe(0);
    expect(t.vFCP).toBe(0);
  });

  it("mergeIcmsTotals accumulates correctly", () => {
    const target = createIcmsTotals();
    const source1 = { ...createIcmsTotals(), vBC: 5000, vICMS: 900 };
    const source2 = { ...createIcmsTotals(), vBC: 3000, vICMS: 540, vST: 200 };
    mergeIcmsTotals(target, source1);
    mergeIcmsTotals(target, source2);
    expect(target.vBC).toBe(8000);
    expect(target.vICMS).toBe(1440);
    expect(target.vST).toBe(200);
  });
});
