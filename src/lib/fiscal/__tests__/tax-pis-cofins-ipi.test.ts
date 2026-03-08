import { describe, it, expect } from "bun:test";
import { buildPisXml, buildPisStXml, buildCofinsXml, buildCofinsStXml, buildIpiXml, buildIiXml } from "../tax-pis-cofins-ipi";

describe("buildPisXml", () => {
  it("CST 01 — PISAliq (percentage based)", () => {
    // pPIS=16500 means 1.6500%, vBC=10000 cents = R$100, vPIS=165 cents = R$1.65
    const xml = buildPisXml({ CST: "01", vBC: 10000, pPIS: 16500, vPIS: 165 });
    expect(xml).toContain("<PISAliq>");
    expect(xml).toContain("<CST>01</CST>");
    expect(xml).toContain("<vBC>100.00</vBC>");
    expect(xml).toContain("<pPIS>1.6500</pPIS>");
    expect(xml).toContain("<vPIS>1.65</vPIS>");
  });

  it("CST 02 — PISAliq", () => {
    const xml = buildPisXml({ CST: "02", vBC: 5000, pPIS: 16500, vPIS: 83 });
    expect(xml).toContain("<PISAliq>");
    expect(xml).toContain("<CST>02</CST>");
  });

  it("CST 03 — PISQtde (quantity based)", () => {
    const xml = buildPisXml({ CST: "03", qBCProd: 10000, vAliqProd: 500000, vPIS: 500 });
    expect(xml).toContain("<PISQtde>");
    expect(xml).toContain("<qBCProd>");
    expect(xml).toContain("<vAliqProd>");
  });

  it("CST 04 — PISNT (not taxed)", () => {
    const xml = buildPisXml({ CST: "04" });
    expect(xml).toContain("<PISNT>");
    expect(xml).toContain("<CST>04</CST>");
    expect(xml).not.toContain("<vBC>");
  });

  it("CST 05-09 — PISNT variants", () => {
    for (const cst of ["05", "06", "07", "08", "09"]) {
      const xml = buildPisXml({ CST: cst });
      expect(xml).toContain("<PISNT>");
      expect(xml).toContain(`<CST>${cst}</CST>`);
    }
  });

  it("CST 49 — PISOutr (percentage)", () => {
    const xml = buildPisXml({ CST: "49", vBC: 10000, pPIS: 16500, vPIS: 165 });
    expect(xml).toContain("<PISOutr>");
    expect(xml).toContain("<vBC>");
    expect(xml).toContain("<pPIS>");
  });

  it("CST 99 — PISOutr (percentage)", () => {
    const xml = buildPisXml({ CST: "99", vBC: 0, pPIS: 0, vPIS: 0 });
    expect(xml).toContain("<PISOutr>");
  });

  it("CST 99 — PISOutr (quantity based)", () => {
    const xml = buildPisXml({ CST: "99", qBCProd: 5000, vAliqProd: 100, vPIS: 500 });
    expect(xml).toContain("<PISOutr>");
    expect(xml).toContain("<qBCProd>");
  });
});

describe("buildPisStXml", () => {
  it("builds PISST with percentage", () => {
    const xml = buildPisStXml({ vBC: 10000, pPIS: 16500, vPIS: 165 });
    expect(xml).toContain("<PISST>");
    expect(xml).toContain("<vBC>");
  });
});

describe("buildCofinsXml", () => {
  it("CST 01 — COFINSAliq", () => {
    // pCOFINS=76000 means 7.6000%
    const xml = buildCofinsXml({ CST: "01", vBC: 10000, pCOFINS: 76000, vCOFINS: 760 });
    expect(xml).toContain("<COFINSAliq>");
    expect(xml).toContain("<CST>01</CST>");
    expect(xml).toContain("<pCOFINS>7.6000</pCOFINS>");
  });

  it("CST 03 — COFINSQtde", () => {
    const xml = buildCofinsXml({ CST: "03", qBCProd: 10000, vAliqProd: 500000, vCOFINS: 500 });
    expect(xml).toContain("<COFINSQtde>");
  });

  it("CST 04 — COFINSNT", () => {
    const xml = buildCofinsXml({ CST: "04" });
    expect(xml).toContain("<COFINSNT>");
  });

  it("CST 99 — COFINSOutr", () => {
    const xml = buildCofinsXml({ CST: "99", vBC: 0, pCOFINS: 0, vCOFINS: 0 });
    expect(xml).toContain("<COFINSOutr>");
  });
});

describe("buildCofinsStXml", () => {
  it("builds COFINSST", () => {
    const xml = buildCofinsStXml({ vBC: 10000, pCOFINS: 76000, vCOFINS: 760 });
    expect(xml).toContain("<COFINSST>");
  });
});

describe("buildIpiXml", () => {
  it("CST 50 — IPITrib percentage based", () => {
    // pIPI=50000 means 5.0000%
    const xml = buildIpiXml({ CST: "50", cEnq: "999", vBC: 10000, pIPI: 50000, vIPI: 500 });
    expect(xml).toContain("<IPI>");
    expect(xml).toContain("<IPITrib>");
    expect(xml).toContain("<CST>50</CST>");
    expect(xml).toContain("<cEnq>999</cEnq>");
    expect(xml).toContain("<vBC>100.00</vBC>");
    expect(xml).toContain("<pIPI>5.0000</pIPI>");
    expect(xml).toContain("<vIPI>5.00</vIPI>");
  });

  it("CST 00 — IPITrib", () => {
    const xml = buildIpiXml({ CST: "00", cEnq: "999", vBC: 5000, pIPI: 100000, vIPI: 500 });
    expect(xml).toContain("<IPITrib>");
  });

  it("CST 99 — IPITrib quantity based", () => {
    const xml = buildIpiXml({ CST: "99", cEnq: "999", qUnid: 10000, vUnid: 500000, vIPI: 500 });
    expect(xml).toContain("<IPITrib>");
    expect(xml).toContain("<qUnid>");
    expect(xml).toContain("<vUnid>");
  });

  it("CST 01 — IPINT (exempt)", () => {
    const xml = buildIpiXml({ CST: "01", cEnq: "999" });
    expect(xml).toContain("<IPINT>");
    expect(xml).toContain("<CST>01</CST>");
    expect(xml).not.toContain("<IPITrib>");
  });

  it("CST 02-04 — IPINT variants", () => {
    for (const cst of ["02", "03", "04", "05", "51", "52", "53", "54", "55"]) {
      const xml = buildIpiXml({ CST: cst, cEnq: "999" });
      expect(xml).toContain("<IPINT>");
    }
  });

  it("includes optional fields", () => {
    const xml = buildIpiXml({ CST: "50", cEnq: "999", CNPJProd: "12345678000199", cSelo: "ABC", qSelo: 10, vBC: 10000, pIPI: 50000, vIPI: 500 });
    expect(xml).toContain("<CNPJProd>12345678000199</CNPJProd>");
    expect(xml).toContain("<cSelo>ABC</cSelo>");
    expect(xml).toContain("<qSelo>10</qSelo>");
  });
});

describe("buildIiXml", () => {
  it("builds import tax", () => {
    const xml = buildIiXml({ vBC: 50000, vDespAdu: 5000, vII: 7500, vIOF: 0 });
    expect(xml).toContain("<II>");
    expect(xml).toContain("<vBC>500.00</vBC>");
    expect(xml).toContain("<vDespAdu>50.00</vDespAdu>");
    expect(xml).toContain("<vII>75.00</vII>");
    expect(xml).toContain("<vIOF>0.00</vIOF>");
  });
});
