import { describe, it, expect } from "bun:test";
import { buildAccessKey, buildInvoiceXml, tag } from "../xml-builder";
import type { InvoiceBuildData } from "../types";

describe("tag()", () => {
  it("builds self-closing tag with no children", () => {
    expect(tag("xNome", {}, "Test")).toBe("<xNome>Test</xNome>");
  });

  it("builds tag with attributes and child array", () => {
    expect(tag("det", { nItem: "1" }, [tag("prod")])).toBe(
      '<det nItem="1"><prod></prod></det>'
    );
  });

  it("builds empty tag (no children)", () => {
    expect(tag("empty")).toBe("<empty></empty>");
  });

  it("escapes special XML characters in text", () => {
    expect(tag("name", {}, "A & B")).toBe("<name>A &amp; B</name>");
    expect(tag("name", {}, '<"test">')).toBe("<name>&lt;&quot;test&quot;&gt;</name>");
  });

  it("does not escape children array (raw XML)", () => {
    const result = tag("parent", {}, [tag("child", {}, "value")]);
    expect(result).toBe("<parent><child>value</child></parent>");
  });
});

describe("buildAccessKey()", () => {
  it("generates a 44-digit access key", () => {
    const key = buildAccessKey({
      stateCode: "35",
      yearMonth: "2601",
      taxId: "12345678000199",
      model: 65,
      series: 1,
      number: 1,
      emissionType: 1,
      numericCode: "12345678",
    });

    expect(key).toHaveLength(44);
    expect(/^\d{44}$/.test(key)).toBe(true);
  });

  it("pads fields correctly", () => {
    const key = buildAccessKey({
      stateCode: "35",
      yearMonth: "2601",
      taxId: "12345678000199",
      model: 65,
      series: 1,
      number: 42,
      emissionType: 1,
      numericCode: "00000001",
    });

    // cUF=35, AAMM=2601, CNPJ=12345678000199, mod=65, serie=001, nNF=000000042, tpEmis=1, cNF=00000001
    expect(key.substring(0, 2)).toBe("35");
    expect(key.substring(2, 6)).toBe("2601");
    expect(key.substring(6, 20)).toBe("12345678000199");
    expect(key.substring(20, 22)).toBe("65");
    expect(key.substring(22, 25)).toBe("001");
    expect(key.substring(25, 34)).toBe("000000042");
    expect(key.substring(34, 35)).toBe("1");
    expect(key.substring(35, 43)).toBe("00000001");
    // Last digit is check digit (mod 11)
    expect(key.substring(43, 44)).toMatch(/\d/);
  });

  it("produces deterministic check digit", () => {
    const params = {
      stateCode: "35",
      yearMonth: "2601",
      taxId: "12345678000199",
      model: 65 as const,
      series: 1,
      number: 1,
      emissionType: 1 as const,
      numericCode: "12345678",
    };

    const key1 = buildAccessKey(params);
    const key2 = buildAccessKey(params);
    expect(key1).toBe(key2);
  });

  it("different inputs produce different keys", () => {
    const base = {
      stateCode: "35",
      yearMonth: "2601",
      taxId: "12345678000199",
      model: 65 as const,
      series: 1,
      emissionType: 1 as const,
      numericCode: "12345678",
    };

    const key1 = buildAccessKey({ ...base, number: 1 });
    const key2 = buildAccessKey({ ...base, number: 2 });
    expect(key1).not.toBe(key2);
  });
});

describe("buildInvoiceXml()", () => {
  const sampleData: InvoiceBuildData = {
    model: 65,
    series: 1,
    number: 1,
    emissionType: 1,
    environment: 2,
    issuedAt: new Date("2026-01-15T10:30:00"),
    operationNature: "VENDA",
    issuer: {
      taxId: "12345678000199",
      stateTaxId: "123456789",
      companyName: "Test Company",
      tradeName: "Test",
      taxRegime: 1,
      stateCode: "SP",
      cityCode: "3550308",
      cityName: "Sao Paulo",
      street: "Av Paulista",
      streetNumber: "1000",
      district: "Bela Vista",
      zipCode: "01310100",
      addressComplement: null,
    },
    items: [
      {
        itemNumber: 1,
        productCode: "1",
        description: "Product A",
        ncm: "84715010",
        cfop: "5102",
        unitOfMeasure: "UN",
        quantity: 2,
        unitPrice: 1000,
        totalPrice: 2000,
        icmsCst: "00",
        icmsRate: 0,
        icmsAmount: 0,
        pisCst: "99",
        cofinsCst: "99",
      },
    ],
    payments: [{ method: "01", amount: 2000 }],
  };

  it("generates valid XML with correct structure", () => {
    const { xml, accessKey } = buildInvoiceXml(sampleData);

    expect(xml).toContain("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
    expect(xml).toContain("<NFe");
    expect(xml).toContain("<infNFe");
    expect(xml).toContain("</NFe>");
    expect(accessKey).toHaveLength(44);
  });

  it("contains required groups (ide, emit, det, total, transp, pag)", () => {
    const { xml } = buildInvoiceXml(sampleData);

    expect(xml).toContain("<ide>");
    expect(xml).toContain("<emit>");
    expect(xml).toContain("<det ");
    expect(xml).toContain("<total>");
    expect(xml).toContain("<transp>");
    expect(xml).toContain("<pag>");
  });

  it("sets model 65 for NFC-e", () => {
    const { xml } = buildInvoiceXml(sampleData);
    expect(xml).toContain("<mod>65</mod>");
  });

  it("sets model 55 for NF-e", () => {
    const nfeData = { ...sampleData, model: 55 as const };
    const { xml } = buildInvoiceXml(nfeData);
    expect(xml).toContain("<mod>55</mod>");
  });

  it("includes issuer data", () => {
    const { xml } = buildInvoiceXml(sampleData);
    expect(xml).toContain("<CNPJ>12345678000199</CNPJ>");
    expect(xml).toContain("<xNome>Test Company</xNome>");
    expect(xml).toContain("<IE>123456789</IE>");
    expect(xml).toContain("<CRT>1</CRT>");
  });

  it("includes item data", () => {
    const { xml } = buildInvoiceXml(sampleData);
    expect(xml).toContain('<det nItem="1">');
    expect(xml).toContain("<xProd>Product A</xProd>");
    expect(xml).toContain("<NCM>84715010</NCM>");
    expect(xml).toContain("<CFOP>5102</CFOP>");
  });

  it("formats amounts correctly", () => {
    const { xml } = buildInvoiceXml(sampleData);
    expect(xml).toContain("<vProd>20.00</vProd>"); // 2000 cents = 20.00
    expect(xml).toContain("<vNF>20.00</vNF>");
  });

  it("includes payment data", () => {
    const { xml } = buildInvoiceXml(sampleData);
    expect(xml).toContain("<tPag>01</tPag>"); // cash
    expect(xml).toContain("<vPag>20.00</vPag>");
  });

  it("includes homologation note in infAdic when environment=2", () => {
    const { xml } = buildInvoiceXml(sampleData);
    expect(xml).toContain("HOMOLOGACAO");
  });

  it("includes recipient when provided", () => {
    const dataWithRecipient = {
      ...sampleData,
      recipient: { taxId: "12345678901", name: "John Doe" },
    };
    const { xml } = buildInvoiceXml(dataWithRecipient);
    expect(xml).toContain("<dest>");
    expect(xml).toContain("<CPF>12345678901</CPF>");
    expect(xml).toContain("<xNome>John Doe</xNome>");
  });

  it("omits recipient for NFC-e without recipient", () => {
    const { xml } = buildInvoiceXml(sampleData);
    expect(xml).not.toContain("<dest>");
  });

  it("includes contingency info when provided", () => {
    const dataWithContingency = {
      ...sampleData,
      contingency: {
        type: "offline" as const,
        reason: "SEFAZ unavailable",
        at: new Date(),
      },
    };
    const { xml } = buildInvoiceXml(dataWithContingency);
    expect(xml).toContain("contingencia");
    expect(xml).toContain("SEFAZ unavailable");
  });
});
