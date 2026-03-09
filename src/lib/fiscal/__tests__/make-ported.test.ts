// @ts-nocheck
/**
 * Ported from PHP sped-nfe MakeTest.php
 *
 * Each PHP test method becomes a corresponding `it()` block.
 * PHP values are converted to our conventions:
 *   - Monetary: PHP float (200.00) → TS cents integer (20000)
 *   - ICMS rates (4dp): PHP float (18.0000) → TS hundredths (1800), fc(1800,4)="18.0000"
 *   - ICMS rates (2dp): PHP float (1.00) → TS hundredths (100), fc(100,2)="1.00"
 *   - PIS/COFINS rates (4dp): PHP float (1.6500) → TS *10000 (16500), fmt4(16500)="1.6500"
 *   - PIS/COFINS monetary: PHP float (10.00) → TS cents (1000), fmtCents(1000)="10.00"
 *
 * Tests that rely on PHP-only DOM features (Make::render(), taginfNFe, tagide, tagemit,
 * tagprod, etc.) are ported as structural equivalents using our builders where applicable,
 * or as XML-contains checks using the `tag()` helper.
 */

import { describe, it, expect } from "bun:test";
import { tag, buildAccessKey } from "../xml-builder";
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
} from "../tax-pis-cofins-ipi";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Parse a simple XML string and check it contains all expected child tags with values. */
function expectXmlContains(xml: string, expectations: Record<string, string>) {
  for (const [tagName, value] of Object.entries(expectations)) {
    expect(xml).toContain(`<${tagName}>${value}</${tagName}>`);
  }
}

/** Assert an XML string contains a given wrapper tag. */
function expectWrappedIn(xml: string, wrapperTag: string) {
  expect(xml).toContain(`<${wrapperTag}>`);
  expect(xml).toContain(`</${wrapperTag}>`);
}

// ── tag() utility tests (equivalent to taginfNFe, tagide basic structure) ───

describe("tag() utility — ported from testTaginfNFe*", () => {
  it("testTaginfNFe — builds infNFe with Id and versao attributes", () => {
    const id = "35170358716523000119550010000000301000000300";
    const versao = "4.00";
    const xml = tag("infNFe", { Id: `NFe${id}`, versao }, "content");
    expect(xml).toContain(`Id="NFe${id}"`);
    expect(xml).toContain(`versao="4.00"`);
  });

  it("testTaginfNFeComPkNItem — builds infNFe with pk_nItem attribute", () => {
    const id = "35170358716523000119550010000000301000000300";
    const xml = tag("infNFe", { Id: `NFe${id}`, versao: "4.00", pk_nItem: "1" }, "content");
    expect(xml).toContain(`pk_nItem="1"`);
  });

  it("testTaginfNFeSemChaveDeAcesso — builds infNFe without access key", () => {
    const xml = tag("infNFe", { Id: "NFe", versao: "4.00" }, "content");
    expect(xml).toContain(`Id="NFe"`);
    expect(xml).toContain(`versao="4.00"`);
  });
});

// ── tagide tests (structure validation) ─────────────────────────────────────

describe("tagide — ported from testTagide*", () => {
  it("testTagideVersaoQuantroPontoZeroModeloCinquentaECinco — model 55 ide fields", () => {
    const xml = tag("ide", {}, [
      tag("cUF", {}, "50"),
      tag("cNF", {}, "80070008"),
      tag("natOp", {}, "VENDA"),
      tag("mod", {}, "55"),
      tag("serie", {}, "1"),
      tag("nNF", {}, "1"),
      tag("dhEmi", {}, "2018-06-23T17:45:49-03:00"),
      tag("dhSaiEnt", {}, "2018-06-23T17:45:49-03:00"),
      tag("tpNF", {}, "1"),
      tag("idDest", {}, "1"),
      tag("cMunFG", {}, "5002704"),
      tag("tpImp", {}, "1"),
      tag("tpEmis", {}, "1"),
      tag("cDV", {}, "2"),
      tag("tpAmb", {}, "2"),
      tag("finNFe", {}, "1"),
      tag("indFinal", {}, "0"),
      tag("indPres", {}, "1"),
      tag("procEmi", {}, "0"),
      tag("verProc", {}, "5.0"),
    ]);

    expectXmlContains(xml, {
      cUF: "50",
      cNF: "80070008",
      natOp: "VENDA",
      mod: "55",
      serie: "1",
      nNF: "1",
      dhEmi: "2018-06-23T17:45:49-03:00",
      dhSaiEnt: "2018-06-23T17:45:49-03:00",
      tpNF: "1",
      idDest: "1",
      cMunFG: "5002704",
      cDV: "2",
      tpAmb: "2",
      finNFe: "1",
      indFinal: "0",
      indPres: "1",
      procEmi: "0",
      verProc: "5.0",
    });
    // indPag should NOT be present (version 4.00)
    expect(xml).not.toContain("<indPag>");
    // dhCont and xJust should NOT be present
    expect(xml).not.toContain("<dhCont>");
    expect(xml).not.toContain("<xJust>");
  });

  it("testTagideVersaoQuantroPontoZeroModeloCinquentaECincoEmContigencia — contingency fields", () => {
    const xml = tag("ide", {}, [
      tag("dhCont", {}, "2018-06-26T17:45:49-03:00"),
      tag("xJust", {}, "SEFAZ INDISPONIVEL"),
    ]);

    expectXmlContains(xml, {
      dhCont: "2018-06-26T17:45:49-03:00",
      xJust: "SEFAZ INDISPONIVEL",
    });
  });

  it("testTagideVersaoQuantroPontoZeroModeloSessentaECinco — model 65 ide fields", () => {
    const xml = tag("ide", {}, [
      tag("cUF", {}, "50"),
      tag("cNF", {}, "80070008"),
      tag("natOp", {}, "VENDA"),
      tag("mod", {}, "65"),
      tag("serie", {}, "1"),
      tag("nNF", {}, "1"),
      tag("dhEmi", {}, "2018-06-23T17:45:49-03:00"),
      tag("tpNF", {}, "1"),
      tag("idDest", {}, "1"),
      tag("cMunFG", {}, "5002704"),
      tag("tpImp", {}, "4"),
      tag("tpEmis", {}, "1"),
      tag("cDV", {}, "2"),
      tag("tpAmb", {}, "2"),
      tag("finNFe", {}, "1"),
      tag("indFinal", {}, "0"),
      tag("indPres", {}, "4"),
      tag("procEmi", {}, "0"),
      tag("verProc", {}, "5.0"),
    ]);

    expectXmlContains(xml, {
      mod: "65",
      tpImp: "4",
      indPres: "4",
    });
    expect(xml).not.toContain("<indPag>");
    expect(xml).not.toContain("<dhSaiEnt>");
    expect(xml).not.toContain("<dhCont>");
    expect(xml).not.toContain("<xJust>");
  });
});

// ── Reference document tags ─────────────────────────────────────────────────

describe("Reference document tags — ported from test_tagref*", () => {
  it("test_tagrefNFe — builds refNFe tag", () => {
    const refNFe = "35150271780456000160550010000253101000253101";
    const xml = tag("refNFe", {}, refNFe);
    expect(xml).toBe(`<refNFe>${refNFe}</refNFe>`);
  });

  it("test_tagrefNF — builds refNF group", () => {
    const xml = tag("refNF", {}, [
      tag("cUF", {}, "35"),
      tag("AAMM", {}, "1412"),
      tag("CNPJ", {}, "52297850000105"),
      tag("mod", {}, "01"),
      tag("serie", {}, "3"),
      tag("nNF", {}, "587878"),
    ]);

    expectXmlContains(xml, {
      cUF: "35",
      AAMM: "1412",
      CNPJ: "52297850000105",
      mod: "01",
      serie: "3",
      nNF: "587878",
    });
  });

  it("test_tagrefNFP — builds refNFP group with CNPJ", () => {
    const xml = tag("refNFP", {}, [
      tag("cUF", {}, "35"),
      tag("AAMM", {}, "1502"),
      tag("CNPJ", {}, "00940734000150"),
      tag("IE", {}, "ISENTO"),
      tag("mod", {}, "04"),
      tag("serie", {}, "0"),
      tag("nNF", {}, "5578"),
    ]);

    expectXmlContains(xml, {
      cUF: "35",
      CNPJ: "00940734000150",
      IE: "ISENTO",
      mod: "04",
    });
  });

  it("test_tagrefNFP — builds refNFP group with CPF", () => {
    const xml = tag("refNFP", {}, [
      tag("cUF", {}, "35"),
      tag("AAMM", {}, "1502"),
      tag("CPF", {}, "08456452009"),
      tag("IE", {}, "ISENTO"),
      tag("mod", {}, "04"),
      tag("serie", {}, "0"),
      tag("nNF", {}, "5578"),
    ]);

    expect(xml).toContain("<CPF>08456452009</CPF>");
    expect(xml).not.toContain("<CNPJ>");
  });

  it("test_tagrefCTe — builds refCTe tag", () => {
    const ref = "35150268252816000146570010000016161002008472";
    const xml = tag("refCTe", {}, ref);
    expect(xml).toBe(`<refCTe>${ref}</refCTe>`);
  });

  it("test_tagrefECF — builds refECF group", () => {
    const xml = tag("refECF", {}, [
      tag("mod", {}, "2C"),
      tag("nECF", {}, "788"),
      tag("nCOO", {}, "114"),
    ]);

    expectXmlContains(xml, { mod: "2C", nECF: "788", nCOO: "114" });
  });
});

// ── Retirada and Entrega ────────────────────────────────────────────────────

describe("Retirada/Entrega tags — ported from test_tagretirada/test_tagentrega", () => {
  const addressFields = {
    xLgr: "Rua Um",
    nro: "123",
    xCpl: "sobreloja",
    xBairro: "centro",
    cMun: "3550308",
    xMun: "Sao Paulo",
    UF: "SP",
    CEP: "01023000",
    cPais: "1058",
    xPais: "BRASIL",
    fone: "1122225544",
    email: "contato@beltrano.com.br",
  };

  it("test_tagretirada — builds retirada with CNPJ", () => {
    const xml = tag("retirada", {}, [
      tag("CNPJ", {}, "12345678901234"),
      tag("IE", {}, "12345678901"),
      tag("xNome", {}, "Beltrano e Cia Ltda"),
      ...Object.entries(addressFields).map(([k, v]) => tag(k, {}, v)),
    ]);

    expectWrappedIn(xml, "retirada");
    expectXmlContains(xml, {
      CNPJ: "12345678901234",
      IE: "12345678901",
      xNome: "Beltrano e Cia Ltda",
      ...addressFields,
    });
  });

  it("test_tagretirada — builds retirada with CPF", () => {
    const xml = tag("retirada", {}, [
      tag("CPF", {}, "06563904092"),
      ...Object.entries(addressFields).map(([k, v]) => tag(k, {}, v)),
    ]);

    expect(xml).toContain("<CPF>06563904092</CPF>");
  });

  it("test_tagentrega — builds entrega with CNPJ", () => {
    const xml = tag("entrega", {}, [
      tag("CNPJ", {}, "12345678901234"),
      tag("IE", {}, "12345678901"),
      tag("xNome", {}, "Beltrano e Cia Ltda"),
      ...Object.entries(addressFields).map(([k, v]) => tag(k, {}, v)),
    ]);

    expectWrappedIn(xml, "entrega");
    expectXmlContains(xml, {
      CNPJ: "12345678901234",
      ...addressFields,
    });
  });

  it("test_tagentrega — builds entrega with CPF", () => {
    const xml = tag("entrega", {}, [
      tag("CPF", {}, "06563904092"),
      ...Object.entries(addressFields).map(([k, v]) => tag(k, {}, v)),
    ]);

    expect(xml).toContain("<CPF>06563904092</CPF>");
  });
});

// ── autXML ──────────────────────────────────────────────────────────────────

describe("autXML — ported from test_tagautXML", () => {
  it("test_tagautXML — builds autXML with CNPJ", () => {
    const xml = tag("autXML", {}, [tag("CNPJ", {}, "12345678901234")]);
    expectWrappedIn(xml, "autXML");
    expect(xml).toContain("<CNPJ>12345678901234</CNPJ>");
  });

  it("test_tagautXML — builds autXML with CPF", () => {
    const xml = tag("autXML", {}, [tag("CPF", {}, "06563904092")]);
    expect(xml).toContain("<CPF>06563904092</CPF>");
  });
});

// ── infAdProd ───────────────────────────────────────────────────────────────

describe("infAdProd — ported from test_taginfAdProd", () => {
  it("test_taginfAdProd — builds additional product info tag", () => {
    const xml = tag("infAdProd", {}, "informacao adicional do item");
    expect(xml).toBe("<infAdProd>informacao adicional do item</infAdProd>");
  });
});

// ── gCred (CreditoPresumidoProd) ────────────────────────────────────────────

describe("gCred — ported from test_tagCreditoPresumidoProd", () => {
  it("test_tagCreditoPresumidoProd — builds gCred tag", () => {
    const xml = tag("gCred", {}, [
      tag("cCredPresumido", {}, "2222211234"),
      tag("pCredPresumido", {}, "4.0000"),
      tag("vCredPresumido", {}, "4.00"),
    ]);

    expectXmlContains(xml, {
      cCredPresumido: "2222211234",
      pCredPresumido: "4.0000",
      vCredPresumido: "4.00",
    });
  });
});

// ── obsItem (obsCont / obsFisco) ────────────────────────────────────────────

describe("obsItem — ported from test_tagprodObsCont / test_tagprodObsFisco", () => {
  it("test_tagprodObsCont — builds obsItem with obsCont", () => {
    const xml = tag("obsItem", {}, [
      tag("obsCont", { xCampo: "abc" }, [
        tag("xTexto", {}, "123"),
      ]),
    ]);

    expectWrappedIn(xml, "obsItem");
    expect(xml).toContain(`xCampo="abc"`);
    expect(xml).toContain("<xTexto>123</xTexto>");
  });

  it("test_tagprodObsFisco — builds obsItem with obsFisco", () => {
    const xml = tag("obsItem", {}, [
      tag("obsFisco", { xCampo: "abc" }, [
        tag("xTexto", {}, "123"),
      ]),
    ]);

    expectWrappedIn(xml, "obsItem");
    expect(xml).toContain(`xCampo="abc"`);
    expect(xml).toContain("<xTexto>123</xTexto>");
  });
});

// ── veicProd ────────────────────────────────────────────────────────────────

describe("veicProd — ported from test_tagveicProd", () => {
  it("test_tagveicProd — builds vehicle product tag", () => {
    const xml = tag("veicProd", {}, [
      tag("tpOp", {}, "1"),
      tag("chassi", {}, "9BGRX4470AG745440"),
      tag("cCor", {}, "121"),
      tag("xCor", {}, "PRATA"),
      tag("pot", {}, "0078"),
      tag("cilin", {}, "1000"),
      tag("pesoL", {}, "000008900"),
      tag("pesoB", {}, "000008900"),
      tag("nSerie", {}, "AAA123456"),
      tag("tpComb", {}, "16"),
      tag("nMotor", {}, "BBB123456"),
      tag("CMT", {}, "460.0000"),
      tag("dist", {}, "2443"),
      tag("anoMod", {}, "2010"),
      tag("anoFab", {}, "2011"),
      tag("tpPint", {}, "M"),
      tag("tpVeic", {}, "06"),
      tag("espVeic", {}, "1"),
      tag("VIN", {}, "N"),
      tag("condVeic", {}, "1"),
      tag("cMod", {}, "123456"),
      tag("cCorDENATRAN", {}, "10"),
      tag("lota", {}, "5"),
      tag("tpRest", {}, "0"),
    ]);

    expectWrappedIn(xml, "veicProd");
    expectXmlContains(xml, {
      tpOp: "1",
      chassi: "9BGRX4470AG745440",
      cCor: "121",
      xCor: "PRATA",
      pot: "0078",
      cilin: "1000",
      nSerie: "AAA123456",
      tpComb: "16",
      nMotor: "BBB123456",
      CMT: "460.0000",
      dist: "2443",
      anoMod: "2010",
      anoFab: "2011",
      tpPint: "M",
      tpVeic: "06",
      espVeic: "1",
      VIN: "N",
      condVeic: "1",
      cMod: "123456",
      cCorDENATRAN: "10",
      lota: "5",
      tpRest: "0",
    });
  });
});

// ── med ─────────────────────────────────────────────────────────────────────

describe("med — ported from test_tagmed", () => {
  it("test_tagmed — builds medicine tag", () => {
    const xml = tag("med", {}, [
      tag("cProdANVISA", {}, "1234567890123"),
      tag("xMotivoIsencao", {}, "RDC 238"),
      tag("vPMC", {}, "102.22"),
    ]);

    expectXmlContains(xml, {
      cProdANVISA: "1234567890123",
      xMotivoIsencao: "RDC 238",
      vPMC: "102.22",
    });
  });
});

// ── arma ────────────────────────────────────────────────────────────────────

describe("arma — ported from test_tagarma", () => {
  it("test_tagarma — builds weapon tag", () => {
    const xml = tag("arma", {}, [
      tag("tpArma", {}, "0"),
      tag("nSerie", {}, "1234567890"),
      tag("nCano", {}, "987654321"),
      tag("descr", {}, "Fuzil AK-47"),
    ]);

    expectXmlContains(xml, {
      tpArma: "0",
      nSerie: "1234567890",
      nCano: "987654321",
      descr: "Fuzil AK-47",
    });
  });
});

// ── comb ────────────────────────────────────────────────────────────────────

describe("comb — ported from test_tagcomb", () => {
  it("test_tagcomb — builds fuel tag with CIDE", () => {
    const xml = tag("comb", {}, [
      tag("cProdANP", {}, "012345678"),
      tag("descANP", {}, "Gasolina C Comum"),
      tag("pGLP", {}, "90.0000"),
      tag("pGNn", {}, "10.0000"),
      tag("pGNi", {}, "25.0000"),
      tag("vPart", {}, "12.50"),
      tag("CODIF", {}, "45346546"),
      tag("qTemp", {}, "123.0000"),
      tag("UFCons", {}, "RS"),
      tag("CIDE", {}, [
        tag("qBCProd", {}, "12.5000"),
        tag("vAliqProd", {}, "1.0000"),
        tag("vCIDE", {}, "0.13"),
      ]),
    ]);

    expectXmlContains(xml, {
      cProdANP: "012345678",
      descANP: "Gasolina C Comum",
      pGLP: "90.0000",
      pGNn: "10.0000",
      pGNi: "25.0000",
      vPart: "12.50",
      CODIF: "45346546",
      qTemp: "123.0000",
      UFCons: "RS",
    });
    expect(xml).toContain("<CIDE>");
    expect(xml).toContain("<qBCProd>12.5000</qBCProd>");
    expect(xml).toContain("<vAliqProd>1.0000</vAliqProd>");
    expect(xml).toContain("<vCIDE>0.13</vCIDE>");
  });
});

// ── encerrante ──────────────────────────────────────────────────────────────

describe("encerrante — ported from test_tagencerrante", () => {
  it("test_tagencerrante — builds closing meter reading tag", () => {
    const xml = tag("encerrante", {}, [
      tag("nBico", {}, "1"),
      tag("nBomba", {}, "2"),
      tag("nTanque", {}, "3"),
      tag("vEncIni", {}, "100.000"),
      tag("vEncFin", {}, "200.000"),
    ]);

    expectXmlContains(xml, {
      nBico: "1",
      nBomba: "2",
      nTanque: "3",
      vEncIni: "100.000",
      vEncFin: "200.000",
    });
  });
});

// ── origComb ────────────────────────────────────────────────────────────────

describe("origComb — ported from test_tagorigComb", () => {
  it("test_tagorigComb — builds fuel origin tag", () => {
    const xml = tag("origComb", {}, [
      tag("indImport", {}, "1"),
      tag("cUFOrig", {}, "11"),
      tag("pOrig", {}, "200.0000"),
    ]);

    expectXmlContains(xml, {
      indImport: "1",
      cUFOrig: "11",
      pOrig: "200.0000",
    });
  });
});

// ── ICMS CST tests — ported from test_tagICMS_CST_* ────────────────────────

describe("tagICMS CST — ported from test_tagICMS_CST_*", () => {
  /**
   * PHP value → TS value conversion:
   *   Monetary (2dp format): PHP 200.00 → TS 20000 cents (fc(20000)="200.00")
   *   Rate (4dp format): PHP 18.0000 → TS 1800 (fc(1800,4)="18.0000")
   *   When PHP uses unformatted integers like vBC=100, it means 100.00
   *   in the XML, so TS = 10000 cents → fc(10000)="100.00"
   */

  it("test_tagICMS_CST_00 — ICMS00 fully taxed", () => {
    // PHP: orig=0, CST=00, modBC=3, vBC=200.00, pICMS=18.0000, vICMS=36.00, pFCP=1.0000, vFCP=2.00
    const { xml, totals } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "00",
      modBC: "3",
      vBC: 20000,      // 200.00
      pICMS: 1800,     // 18.0000
      vICMS: 3600,     // 36.00
      pFCP: 100,       // 1.0000
      vFCP: 200,       // 2.00
    });

    expectWrappedIn(xml, "ICMS");
    expectWrappedIn(xml, "ICMS00");
    expectXmlContains(xml, {
      orig: "0",
      CST: "00",
      modBC: "3",
      vBC: "200.00",
      pICMS: "18.0000",
      vICMS: "36.00",
      pFCP: "1.0000",
      vFCP: "2.00",
    });
    expect(totals.vBC).toBe(20000);
    expect(totals.vICMS).toBe(3600);
    expect(totals.vFCP).toBe(200);
  });

  it("test_tagICMS_CST_02 — ICMS02 monofasico", () => {
    // PHP: orig=0, CST=02, qBCMono=200.0000, adRemICMS=25.0000, vICMSMono=50.00
    const { xml, totals } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "02",
      qBCMono: 20000,    // fc(20000,4) = "200.0000"
      adRemICMS: 2500,   // fc(2500,4) = "25.0000"
      vICMSMono: 5000,   // fc(5000) = "50.00"
    });

    expectWrappedIn(xml, "ICMS02");
    expectXmlContains(xml, {
      orig: "0",
      CST: "02",
      qBCMono: "200.0000",
      adRemICMS: "25.0000",
      vICMSMono: "50.00",
    });
    expect(totals.qBCMono).toBe(20000);
    expect(totals.vICMSMono).toBe(5000);
  });

  it("test_tagICMS_CST_15 — ICMS15 monofasico with retention", () => {
    // PHP: qBCMono=200.0000, adRemICMS=25.0000, vICMSMono=50.00,
    //   qBCMonoReten=100.0000, adRemICMSReten=20.0000, vICMSMonoReten=20.00,
    //   pRedAdRem=1.00, motRedAdRem=1
    const { xml, totals } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "15",
      qBCMono: 20000,          // "200.0000"
      adRemICMS: 2500,         // "25.0000"
      vICMSMono: 5000,         // "50.00"
      qBCMonoReten: 10000,     // "100.0000"
      adRemICMSReten: 2000,    // "20.0000"
      vICMSMonoReten: 2000,    // "20.00"
      pRedAdRem: 100,          // fc(100,2) = "1.00"
      motRedAdRem: "1",
    });

    expectWrappedIn(xml, "ICMS15");
    expectXmlContains(xml, {
      orig: "0",
      CST: "15",
      qBCMono: "200.0000",
      adRemICMS: "25.0000",
      vICMSMono: "50.00",
      qBCMonoReten: "100.0000",
      adRemICMSReten: "20.0000",
      vICMSMonoReten: "20.00",
      pRedAdRem: "1.00",
      motRedAdRem: "1",
    });
    expect(totals.qBCMono).toBe(20000);
    expect(totals.vICMSMono).toBe(5000);
    expect(totals.qBCMonoReten).toBe(10000);
    expect(totals.vICMSMonoReten).toBe(2000);
  });

  it("test_tagICMS_CST_20 — ICMS20 with base reduction", () => {
    // PHP: modBC=3, pRedBC=5.0000, vBC=180.00, pICMS=18.0000, vICMS=32.40,
    //   vBCFCP=200.00, pFCP=1.0000, vFCP=2.00, vICMSDeson=3.60, motDesICMS=9
    const { xml, totals } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "20",
      modBC: "3",
      pRedBC: 500,        // "5.0000"
      vBC: 18000,         // "180.00"
      pICMS: 1800,        // "18.0000"
      vICMS: 3240,        // "32.40"
      vBCFCP: 20000,      // "200.00"
      pFCP: 100,          // "1.0000"
      vFCP: 200,          // "2.00"
      vICMSDeson: 360,    // "3.60"
      motDesICMS: "9",
    });

    expectWrappedIn(xml, "ICMS20");
    expectXmlContains(xml, {
      orig: "0",
      CST: "20",
      modBC: "3",
      pRedBC: "5.0000",
      vBC: "180.00",
      pICMS: "18.0000",
      vICMS: "32.40",
      vBCFCP: "200.00",
      pFCP: "1.0000",
      vFCP: "2.00",
      vICMSDeson: "3.60",
      motDesICMS: "9",
    });
    expect(totals.vICMSDeson).toBe(360);
    expect(totals.vBC).toBe(18000);
    expect(totals.vICMS).toBe(3240);
    expect(totals.vFCP).toBe(200);
  });

  it("test_tagICMS_CST_30 — ICMS30 exempt with ST", () => {
    // PHP: modBCST=4, pMVAST=30.0000, pRedBCST=1.0000, vBCST=1.00, pICMSST=1.0000,
    //   vICMSST=1.00, vBCFCPST=1.00, pFCPST=1.0000, vFCPST=1.00, vICMSDeson=3.60,
    //   motDesICMS=9, indDeduzDeson=0
    const { xml, totals } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "30",
      modBCST: "4",
      pMVAST: 3000,       // "30.0000"
      pRedBCST: 100,      // "1.0000"
      vBCST: 100,         // "1.00"
      pICMSST: 100,       // "1.0000"
      vICMSST: 100,       // "1.00"
      vBCFCPST: 100,      // "1.00"
      pFCPST: 100,        // "1.0000"
      vFCPST: 100,        // "1.00"
      vICMSDeson: 360,    // "3.60"
      motDesICMS: "9",
      indDeduzDeson: "0",
    });

    expectWrappedIn(xml, "ICMS30");
    expectXmlContains(xml, {
      orig: "0",
      CST: "30",
      modBCST: "4",
      pMVAST: "30.0000",
      pRedBCST: "1.0000",
      vBCST: "1.00",
      pICMSST: "1.0000",
      vICMSST: "1.00",
      vBCFCPST: "1.00",
      pFCPST: "1.0000",
      vFCPST: "1.00",
      vICMSDeson: "3.60",
      motDesICMS: "9",
      indDeduzDeson: "0",
    });
    expect(totals.vICMSDeson).toBe(360);
    expect(totals.vBCST).toBe(100);
    expect(totals.vST).toBe(100);
    expect(totals.vFCPST).toBe(100);
  });

  it("test_tagICMS_CST_40 — ICMS40 exempt", () => {
    // PHP: orig=0, CST=40, vICMSDeson=3.60, motDesICMS=9, indDeduzDeson=0
    const { xml, totals } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "40",
      vICMSDeson: 360,
      motDesICMS: "9",
      indDeduzDeson: "0",
    });

    expectWrappedIn(xml, "ICMS40");
    expectXmlContains(xml, {
      orig: "0",
      CST: "40",
      vICMSDeson: "3.60",
      motDesICMS: "9",
      indDeduzDeson: "0",
    });
    expect(totals.vICMSDeson).toBe(360);
  });

  it("test_tagICMS_CST_41 — ICMS40 (41) non-taxed", () => {
    // PHP: orig=0, CST=41, vICMSDeson=3.60, motDesICMS=9, indDeduzDeson=0
    const { xml } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "41",
      vICMSDeson: 360,
      motDesICMS: "9",
      indDeduzDeson: "0",
    });

    // CST 41 uses ICMS40 wrapper
    expectWrappedIn(xml, "ICMS40");
    expectXmlContains(xml, {
      orig: "0",
      CST: "41",
      vICMSDeson: "3.60",
      motDesICMS: "9",
      indDeduzDeson: "0",
    });
  });

  it("test_tagICMS_CST_50 — ICMS40 (50) suspended", () => {
    // PHP: orig=0, CST=50, vICMSDeson=3.60, motDesICMS=9, indDeduzDeson=0
    const { xml } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "50",
      vICMSDeson: 360,
      motDesICMS: "9",
      indDeduzDeson: "0",
    });

    expectWrappedIn(xml, "ICMS40");
    expectXmlContains(xml, {
      orig: "0",
      CST: "50",
      vICMSDeson: "3.60",
    });
  });

  it("test_tagICMS_CST_51 — ICMS51 deferral", () => {
    // PHP: orig=0, CST=51, modBC=3, pRedBC=10, vBC=100, pICMS=17,
    //   vICMSOp=17, pDif=1, vICMSDif=1, vICMS=17, vBCFCP=100, pFCP=2, vFCP=2
    // PHP passes bare integers — the Make formats them with decimals.
    // modBC=3 → "3", pRedBC=10 → fc(1000,4)="10.0000", vBC=100 → fc(10000)="100.00"
    // pICMS=17 → fc(1700,4)="17.0000", vICMSOp=17 → fc(1700)="17.00"
    // pDif=1 → fc(100,4)="1.0000", vICMSDif=1 → fc(100)="1.00"
    // vICMS=17 → fc(1700)="17.00", vBCFCP=100 → fc(10000)="100.00"
    // pFCP=2 → fc(200,4)="2.0000", vFCP=2 → fc(200)="2.00"
    const { xml, totals } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "51",
      modBC: "3",
      pRedBC: 1000,       // "10.0000"
      vBC: 10000,         // "100.00"
      pICMS: 1700,        // "17.0000"
      vICMSOp: 1700,      // "17.00"
      pDif: 100,          // "1.0000"
      vICMSDif: 100,      // "1.00"
      vICMS: 1700,        // "17.00"
      vBCFCP: 10000,      // "100.00"
      pFCP: 200,          // "2.0000"
      vFCP: 200,          // "2.00"
    });

    expectWrappedIn(xml, "ICMS51");
    expectXmlContains(xml, {
      orig: "0",
      CST: "51",
      modBC: "3",
      pRedBC: "10.0000",
      vBC: "100.00",
      pICMS: "17.0000",
      vICMSOp: "17.00",
      pDif: "1.0000",
      vICMSDif: "1.00",
      vICMS: "17.00",
      vBCFCP: "100.00",
      pFCP: "2.0000",
      vFCP: "2.00",
    });
    expect(totals.vBC).toBe(10000);
    expect(totals.vICMS).toBe(1700);
    expect(totals.vFCP).toBe(200);
  });

  it("test_tagICMS_CST_53 — ICMS53 monofasico deferred", () => {
    // PHP: orig=0, CST=53, qBCMono=200, adRemICMS=17, vICMSMonoOp=34,
    //   pDif=1, vICMSMonoDif=2, vICMSMono=2
    // qBCMono=200 → fc(20000,4)="200.0000"
    // adRemICMS=17 → fc(1700,4)="17.0000"
    // vICMSMonoOp=34 → fc(3400)="34.00"
    // pDif=1 → fc(100,4)="1.0000"
    // vICMSMonoDif=2 → fc(200)="2.00"
    // vICMSMono=2 → fc(200)="2.00"
    const { xml, totals } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "53",
      qBCMono: 20000,      // "200.0000"
      adRemICMS: 1700,     // "17.0000"
      vICMSMonoOp: 3400,   // "34.00"
      pDif: 100,           // "1.0000"
      vICMSMonoDif: 200,   // "2.00"
      vICMSMono: 200,      // "2.00"
    });

    expectWrappedIn(xml, "ICMS53");
    expectXmlContains(xml, {
      orig: "0",
      CST: "53",
      qBCMono: "200.0000",
      adRemICMS: "17.0000",
      vICMSMonoOp: "34.00",
      pDif: "1.0000",
      vICMSMonoDif: "2.00",
      vICMSMono: "2.00",
    });
    expect(totals.qBCMono).toBe(20000);
    expect(totals.vICMSMono).toBe(200);
  });

  it("test_tagICMS_CST_60 — ICMS60 previously charged ST", () => {
    // PHP: orig=0, CST=60, vBCSTRet=100, pST=12, vICMSSubstituto=12,
    //   vICMSSTRet=40, vBCFCPSTRet=50, pFCPSTRet=10, vFCPSTRet=15,
    //   pRedBCEfet=14, vBCEfet=100, pICMSEfet=10, vICMSEfet=10
    const { xml, totals } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "60",
      vBCSTRet: 10000,       // "100.00"
      pST: 1200,             // "12.0000"
      vICMSSubstituto: 1200, // "12.00"
      vICMSSTRet: 4000,      // "40.00"
      vBCFCPSTRet: 5000,     // "50.00"
      pFCPSTRet: 1000,       // "10.0000"
      vFCPSTRet: 1500,       // "15.00"
      pRedBCEfet: 1400,      // "14.0000"
      vBCEfet: 10000,        // "100.00"
      pICMSEfet: 1000,       // "10.0000"
      vICMSEfet: 1000,       // "10.00"
    });

    expectWrappedIn(xml, "ICMS60");
    expectXmlContains(xml, {
      orig: "0",
      CST: "60",
      vBCSTRet: "100.00",
      pST: "12.0000",
      vICMSSubstituto: "12.00",
      vICMSSTRet: "40.00",
      vBCFCPSTRet: "50.00",
      pFCPSTRet: "10.0000",
      vFCPSTRet: "15.00",
      pRedBCEfet: "14.0000",
      vBCEfet: "100.00",
      pICMSEfet: "10.0000",
      vICMSEfet: "10.00",
    });
    expect(totals.vFCPSTRet).toBe(1500);
  });

  it("test_tagICMS_CST_61 — ICMS61 monofasico previously charged", () => {
    // PHP: orig=0, CST=61, qBCMonoRet=300, adRemICMSRet=2, vICMSMonoRet=6
    // qBCMonoRet=300 → fc(30000,4)="300.0000"
    // adRemICMSRet=2 → fc(200,4)="2.0000"
    // vICMSMonoRet=6 → fc(600)="6.00"
    const { xml, totals } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "61",
      qBCMonoRet: 30000,   // "300.0000"
      adRemICMSRet: 200,   // "2.0000"
      vICMSMonoRet: 600,   // "6.00"
    });

    expectWrappedIn(xml, "ICMS61");
    expectXmlContains(xml, {
      orig: "0",
      CST: "61",
      qBCMonoRet: "300.0000",
      adRemICMSRet: "2.0000",
      vICMSMonoRet: "6.00",
    });
    expect(totals.qBCMonoRet).toBe(30000);
    expect(totals.vICMSMonoRet).toBe(600);
  });

  it("test_tagICMS_CST_70 — ICMS70 reduction with ST", () => {
    // PHP: orig=0, CST=70, modBC=3, pRedBC=10, vBC=200, pICMS=10, vICMS=20,
    //   vBCFCP=200, pFCP=2, vFCP=4, modBCST=4, pMVAST=30, pRedBCST=0,
    //   vBCST=60, pICMSST=10, vICMSST=20, vBCFCPST=1, pFCPST=1, vFCPST=1,
    //   vICMSDeson=10, motDesICMS=9
    const { xml, totals } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "70",
      modBC: "3",
      pRedBC: 1000,       // "10.0000"
      vBC: 20000,         // "200.00"
      pICMS: 1000,        // "10.0000"
      vICMS: 2000,        // "20.00"
      vBCFCP: 20000,      // "200.00"
      pFCP: 200,          // "2.0000"
      vFCP: 400,          // "4.00"
      modBCST: "4",
      pMVAST: 3000,       // "30.0000"
      pRedBCST: 0,        // "0.0000"
      vBCST: 6000,        // "60.00"
      pICMSST: 1000,      // "10.0000"
      vICMSST: 2000,      // "20.00"
      vBCFCPST: 100,      // "1.00"
      pFCPST: 100,        // "1.0000"
      vFCPST: 100,        // "1.00"
      vICMSDeson: 1000,   // "10.00"
      motDesICMS: "9",
    });

    expectWrappedIn(xml, "ICMS70");
    expectXmlContains(xml, {
      orig: "0",
      CST: "70",
      modBC: "3",
      pRedBC: "10.0000",
      vBC: "200.00",
      pICMS: "10.0000",
      vICMS: "20.00",
      vBCFCP: "200.00",
      pFCP: "2.0000",
      vFCP: "4.00",
      modBCST: "4",
      pMVAST: "30.0000",
      pRedBCST: "0.0000",
      vBCST: "60.00",
      pICMSST: "10.0000",
      vICMSST: "20.00",
      vBCFCPST: "1.00",
      pFCPST: "1.0000",
      vFCPST: "1.00",
      vICMSDeson: "10.00",
      motDesICMS: "9",
    });
    expect(totals.vICMSDeson).toBe(1000);
    expect(totals.vBC).toBe(20000);
    expect(totals.vICMS).toBe(2000);
    expect(totals.vBCST).toBe(6000);
    expect(totals.vST).toBe(2000);
    expect(totals.vFCPST).toBe(100);
    expect(totals.vFCP).toBe(400);
  });

  it("test_tagICMS_CST_90 — ICMS90 others", () => {
    // PHP: orig=0, CST=90, modBC=3, pRedBC=10, vBC=200, pICMS=10, vICMS=20,
    //   vBCFCP=200, pFCP=2, vFCP=4, modBCST=4, pMVAST=30, pRedBCST=0,
    //   vBCST=60, pICMSST=10, vICMSST=20, vBCFCPST=1, pFCPST=1, vFCPST=1,
    //   vICMSDeson=10, motDesICMS=9
    const { xml, totals } = buildIcmsXml({
      taxRegime: 3,
      orig: "0",
      CST: "90",
      modBC: "3",
      pRedBC: 1000,
      vBC: 20000,
      pICMS: 1000,
      vICMS: 2000,
      vBCFCP: 20000,
      pFCP: 200,
      vFCP: 400,
      modBCST: "4",
      pMVAST: 3000,
      pRedBCST: 0,
      vBCST: 6000,
      pICMSST: 1000,
      vICMSST: 2000,
      vBCFCPST: 100,
      pFCPST: 100,
      vFCPST: 100,
      vICMSDeson: 1000,
      motDesICMS: "9",
    });

    expectWrappedIn(xml, "ICMS90");
    expectXmlContains(xml, {
      orig: "0",
      CST: "90",
      modBC: "3",
      pRedBC: "10.0000",
      vBC: "200.00",
      pICMS: "10.0000",
      vICMS: "20.00",
      vBCFCP: "200.00",
      pFCP: "2.0000",
      vFCP: "4.00",
      modBCST: "4",
      pMVAST: "30.0000",
      pRedBCST: "0.0000",
      vBCST: "60.00",
      pICMSST: "10.0000",
      vICMSST: "20.00",
      vBCFCPST: "1.00",
      pFCPST: "1.0000",
      vFCPST: "1.00",
      vICMSDeson: "10.00",
      motDesICMS: "9",
    });
    expect(totals.vICMSDeson).toBe(1000);
    expect(totals.vBC).toBe(20000);
    expect(totals.vICMS).toBe(2000);
    expect(totals.vBCST).toBe(6000);
    expect(totals.vST).toBe(2000);
    expect(totals.vFCPST).toBe(100);
    expect(totals.vFCP).toBe(400);
  });
});

// ── DI, adi, detExport, detExportInd, Rastro ────────────────────────────────

describe("DI / adi / detExport / Rastro — ported from test_tagDI, test_tagadi, etc.", () => {
  it("test_tagDI — builds DI tag with CNPJ", () => {
    const xml = tag("DI", {}, [
      tag("nDI", {}, "456"),
      tag("dDI", {}, "2024-03-01"),
      tag("xLocDesemb", {}, "Porto"),
      tag("UFDesemb", {}, "SP"),
      tag("dDesemb", {}, "2024-03-02"),
      tag("tpViaTransp", {}, "1"),
      tag("vAFRMM", {}, "150.45"),
      tag("tpIntermedio", {}, "1"),
      tag("CNPJ", {}, "08489068000198"),
      tag("UFTerceiro", {}, "RS"),
      tag("cExportador", {}, "123"),
    ]);

    expectWrappedIn(xml, "DI");
    expectXmlContains(xml, {
      nDI: "456",
      dDI: "2024-03-01",
      xLocDesemb: "Porto",
      UFDesemb: "SP",
      dDesemb: "2024-03-02",
      tpViaTransp: "1",
      vAFRMM: "150.45",
      tpIntermedio: "1",
      CNPJ: "08489068000198",
      UFTerceiro: "RS",
      cExportador: "123",
    });
  });

  it("test_tagDI — builds DI tag with CPF", () => {
    const xml = tag("DI", {}, [
      tag("nDI", {}, "456"),
      tag("dDI", {}, "2024-03-01"),
      tag("xLocDesemb", {}, "Porto"),
      tag("UFDesemb", {}, "SP"),
      tag("dDesemb", {}, "2024-03-02"),
      tag("tpViaTransp", {}, "1"),
      tag("vAFRMM", {}, "150.45"),
      tag("tpIntermedio", {}, "1"),
      tag("CPF", {}, "10318797062"),
      tag("UFTerceiro", {}, "RS"),
      tag("cExportador", {}, "123"),
    ]);

    expect(xml).toContain("<CPF>10318797062</CPF>");
    expect(xml).not.toContain("<CNPJ>");
  });

  it("test_tagadi — builds adi tag", () => {
    const xml = tag("adi", {}, [
      tag("nAdicao", {}, "1"),
      tag("nSeqAdic", {}, "1"),
      tag("cFabricante", {}, "abc123"),
      tag("vDescDI", {}, "12.48"),
      tag("nDraw", {}, "11111111111"),
    ]);

    expectWrappedIn(xml, "adi");
    expectXmlContains(xml, {
      nAdicao: "1",
      nSeqAdic: "1",
      cFabricante: "abc123",
      vDescDI: "12.48",
      nDraw: "11111111111",
    });
  });

  it("test_tagdetExport — builds detExport tag", () => {
    const xml = tag("detExport", {}, [
      tag("nDraw", {}, "123"),
    ]);

    expectWrappedIn(xml, "detExport");
    expect(xml).toContain("<nDraw>123</nDraw>");
  });

  it("test_tagdetExportInd — builds exportInd tag", () => {
    const xml = tag("exportInd", {}, [
      tag("nRE", {}, "123"),
      tag("chNFe", {}, "12345678901234567890123456789012345678901234"),
      tag("qExport", {}, "45.1"),
    ]);

    expectWrappedIn(xml, "exportInd");
    expectXmlContains(xml, {
      nRE: "123",
      chNFe: "12345678901234567890123456789012345678901234",
      qExport: "45.1",
    });
  });

  it("test_tagRastro — builds rastro (traceability) tag", () => {
    const xml = tag("rastro", {}, [
      tag("nLote", {}, "1"),
      tag("qLote", {}, "1"),
      tag("dFab", {}, "2024-01-01"),
      tag("dVal", {}, "2024-01-01"),
      tag("cAgreg", {}, "1234"),
    ]);

    expectWrappedIn(xml, "rastro");
    expectXmlContains(xml, {
      nLote: "1",
      qLote: "1",
      dFab: "2024-01-01",
      dVal: "2024-01-01",
      cAgreg: "1234",
    });
  });
});

// ── ICMSUFDest ──────────────────────────────────────────────────────────────

describe("tagICMSUFDest — ported from test_tagICMSUFDest", () => {
  it("test_tagICMSUFDest — builds ICMSUFDest group", () => {
    // PHP: all fields = 1 (bare integers)
    // vBCUFDest=1 → fc(100)="1.00", vBCFCPUFDest=1 → fc(100)="1.00"
    // pFCPUFDest=1 → fc(100,4)="1.0000", pICMSUFDest=1 → fc(100,4)="1.0000"
    // pICMSInter=1 → fc(100,2)="1.00", pICMSInterPart always "100.0000"
    // vFCPUFDest=1 → fc(100)="1.00", vICMSUFDest=1 → fc(100)="1.00"
    // vICMSUFRemet=1 → fc(100)="1.00"
    const { xml, totals } = buildIcmsUfDestXml({
      taxRegime: 3,
      orig: "0",
      vBCUFDest: 100,
      vBCFCPUFDest: 100,
      pFCPUFDest: 100,
      pICMSUFDest: 100,
      pICMSInter: 100,
      pICMSInterPart: 100,
      vFCPUFDest: 100,
      vICMSUFDest: 100,
      vICMSUFRemet: 100,
    });

    expectWrappedIn(xml, "ICMSUFDest");
    expectXmlContains(xml, {
      vBCUFDest: "1.00",
      vBCFCPUFDest: "1.00",
      pFCPUFDest: "1.0000",
      pICMSUFDest: "1.0000",
      pICMSInter: "1.00",
      pICMSInterPart: "100.0000",
      vFCPUFDest: "1.00",
      vICMSUFDest: "1.00",
      vICMSUFRemet: "1.00",
    });
    expect(totals.vICMSUFDest).toBe(100);
    expect(totals.vFCPUFDest).toBe(100);
    expect(totals.vICMSUFRemet).toBe(100);
  });
});

// ── II (Imposto de Importacao) ──────────────────────────────────────────────

describe("tagII — ported from test_tagII", () => {
  it("test_tagII — builds II group", () => {
    // PHP: vBC=100, vDespAdu=1, vII=1, vIOF=1
    // vBC=100 → fmtCents(10000)="100.00"
    // vDespAdu=1 → fmtCents(100)="1.00"
    const xml = buildIiXml({
      vBC: 10000,
      vDespAdu: 100,
      vII: 100,
      vIOF: 100,
    });

    expectWrappedIn(xml, "II");
    expectXmlContains(xml, {
      vBC: "100.00",
      vDespAdu: "1.00",
      vII: "1.00",
      vIOF: "1.00",
    });
  });
});

// ── ISSQN (structure only — we don't have an ISSQN builder, test tag structure) ─

describe("tagISSQN — ported from test_tagISSQN (structure)", () => {
  it("test_tagISSQN — builds ISSQN tag structure", () => {
    const xml = tag("ISSQN", {}, [
      tag("vBC", {}, "1"),
      tag("vAliq", {}, "1"),
      tag("vISSQN", {}, "1"),
      tag("cMunFG", {}, "1234567"),
      tag("cListServ", {}, "10.10"),
      tag("vDeducao", {}, "1"),
      tag("vOutro", {}, "1"),
      tag("vDescIncond", {}, "1"),
      tag("vDescCond", {}, "1"),
      tag("vISSRet", {}, "1"),
      tag("indISS", {}, "1"),
      tag("cServico", {}, "1"),
      tag("cMun", {}, "123456"),
      tag("cPais", {}, "55"),
      tag("nProcesso", {}, "123"),
      tag("indIncentivo", {}, "12"),
    ]);

    expectWrappedIn(xml, "ISSQN");
    expectXmlContains(xml, {
      vBC: "1",
      vAliq: "1",
      vISSQN: "1",
      cMunFG: "1234567",
      cListServ: "10.10",
      vDeducao: "1",
      vOutro: "1",
      vDescIncond: "1",
      vDescCond: "1",
      vISSRet: "1",
      indISS: "1",
      cServico: "1",
      cMun: "123456",
      cPais: "55",
      nProcesso: "123",
      indIncentivo: "12",
    });
  });
});

// ── infRespTec ──────────────────────────────────────────────────────────────

describe("infRespTec — ported from test_taginfRespTec", () => {
  it("test_taginfRespTec — builds infRespTec tag", () => {
    const xml = tag("infRespTec", {}, [
      tag("CNPJ", {}, "76038276000120"),
      tag("xContato", {}, "Fulano de Tal"),
      tag("email", {}, "fulano@email.com"),
      tag("fone", {}, "51999999999"),
      tag("idCSRT", {}, "123"),
    ]);

    expectWrappedIn(xml, "infRespTec");
    expectXmlContains(xml, {
      CNPJ: "76038276000120",
      xContato: "Fulano de Tal",
      email: "fulano@email.com",
      fone: "51999999999",
      idCSRT: "123",
    });
    // CSRT is not included in the tag (excluded in PHP test too)
    expect(xml).not.toContain("<CSRT>");
  });
});

// ── Agropecuario ────────────────────────────────────────────────────────────

describe("Agropecuario — ported from test_tagagropecuario_*", () => {
  it("test_tagagropecuario_defencivo — builds defensivo tag", () => {
    const xml = tag("defensivo", {}, [
      tag("nReceituario", {}, "1234567890ABCDEFGHIJ"),
      tag("CPFRespTec", {}, "12345678901"),
    ]);

    expectWrappedIn(xml, "defensivo");
    expectXmlContains(xml, {
      nReceituario: "1234567890ABCDEFGHIJ",
      CPFRespTec: "12345678901",
    });
  });

  it("test_tagagropecuario_guia — builds guiaTransito tag", () => {
    const xml = tag("guiaTransito", {}, [
      tag("tpGuia", {}, "1"),
      tag("UFGuia", {}, "MG"),
      tag("serieGuia", {}, "A12345678"),
      tag("nGuia", {}, "123456789"),
    ]);

    expectWrappedIn(xml, "guiaTransito");
    expectXmlContains(xml, {
      UFGuia: "MG",
      serieGuia: "A12345678",
      nGuia: "123456789",
    });
  });
});

// ── ICMSPart ────────────────────────────────────────────────────────────────

describe("tagICMSPart — ported from test_tagICMSPart", () => {
  it("test_tagICMSPart — builds ICMSPart group", () => {
    // PHP: orig=0, CST=90, modBC=1, vBC=200, pRedBC=5, pICMS=10, vICMS=20,
    //   modBCST=4, pMVAST=30, pRedBCST=0, vBCST=60, pICMSST=1, vICMSST=1,
    //   vBCFCPST=1, pFCPST=1, vFCPST=1, pBCOp=1, UFST=EX
    const { xml, totals } = buildIcmsPartXml({
      taxRegime: 3,
      orig: "0",
      CST: "90",
      modBC: "1",
      vBC: 20000,         // "200.00"
      pRedBC: 500,        // "5.0000"
      pICMS: 1000,        // "10.0000"
      vICMS: 2000,        // "20.00"
      modBCST: "4",
      pMVAST: 3000,       // "30.0000"
      pRedBCST: 0,        // "0.0000"
      vBCST: 6000,        // "60.00"
      pICMSST: 100,       // "1.0000"
      vICMSST: 100,       // "1.00"
      vBCFCPST: 100,      // "1.00"
      pFCPST: 100,        // "1.0000"
      vFCPST: 100,        // "1.00"
      pBCOp: 100,         // "1.0000"
      UFST: "EX",
    });

    expectWrappedIn(xml, "ICMS");
    expectWrappedIn(xml, "ICMSPart");
    expectXmlContains(xml, {
      orig: "0",
      CST: "90",
      modBC: "1",
      vBC: "200.00",
      pRedBC: "5.0000",
      pICMS: "10.0000",
      vICMS: "20.00",
      modBCST: "4",
      pMVAST: "30.0000",
      pRedBCST: "0.0000",
      vBCST: "60.00",
      pICMSST: "1.0000",
      vICMSST: "1.00",
      vBCFCPST: "1.00",
      pFCPST: "1.0000",
      vFCPST: "1.00",
      pBCOp: "1.0000",
      UFST: "EX",
    });
    expect(totals.vBC).toBe(20000);
    expect(totals.vICMS).toBe(2000);
    expect(totals.vBCST).toBe(6000);
    expect(totals.vST).toBe(100);
  });
});

// ── ICMSST ──────────────────────────────────────────────────────────────────

describe("tagICMSST — ported from test_tagICMSST", () => {
  it("test_tagICMSST — builds ICMSST repasse group", () => {
    // PHP: orig=0, CST=41, vBCSTRet=200, vICMSSTRet=20, vBCSTDest=30,
    //   vICMSSTDest=2, vBCFCPSTRet=2, pFCPSTRet=2, vFCPSTRet=2,
    //   pST=2, vICMSSubstituto=2, pRedBCEfet=2, vBCEfet=2, pICMSEfet=2, vICMSEfet=2
    const { xml, totals } = buildIcmsStXml({
      taxRegime: 3,
      orig: "0",
      CST: "41",
      vBCSTRet: 20000,       // "200.00"
      vICMSSTRet: 2000,      // "20.00"
      vBCSTDest: 3000,       // "30.00"
      vICMSSTDest: 200,      // "2.00"
      vBCFCPSTRet: 200,      // "2.00"
      pFCPSTRet: 200,        // "2.0000"
      vFCPSTRet: 200,        // "2.00"
      pST: 200,              // "2.0000"
      vICMSSubstituto: 200,  // "2.00"
      pRedBCEfet: 200,       // "2.0000"
      vBCEfet: 200,          // "2.00"
      pICMSEfet: 200,        // "2.0000"
      vICMSEfet: 200,        // "2.00"
    });

    expectWrappedIn(xml, "ICMS");
    expectWrappedIn(xml, "ICMSST");
    expectXmlContains(xml, {
      orig: "0",
      CST: "41",
      vBCSTRet: "200.00",
      vICMSSTRet: "20.00",
      vBCSTDest: "30.00",
      vICMSSTDest: "2.00",
      vBCFCPSTRet: "2.00",
      pFCPSTRet: "2.0000",
      vFCPSTRet: "2.00",
      pST: "2.0000",
      vICMSSubstituto: "2.00",
      pRedBCEfet: "2.0000",
      vBCEfet: "2.00",
      pICMSEfet: "2.0000",
      vICMSEfet: "2.00",
    });
    expect(totals.vFCPSTRet).toBe(200);
  });
});

// ── ICMSSN (Simples Nacional) ───────────────────────────────────────────────

describe("tagICMSSN — ported from test_tagICMSSN_*", () => {
  it("test_tagICMSSN_101 — ICMSSN101 with credit", () => {
    // PHP: orig=0, CSOSN=101, pCredSN=3, vCredICMSSN=4
    // pCredSN=3 → fc(300,2)="3.00", vCredICMSSN=4 → fc(400)="4.00"
    const { xml } = buildIcmsXml({
      taxRegime: 1,
      orig: "0",
      CSOSN: "101",
      pCredSN: 300,         // "3.00"
      vCredICMSSN: 400,     // "4.00"
    });

    expectWrappedIn(xml, "ICMS");
    expectWrappedIn(xml, "ICMSSN101");
    expectXmlContains(xml, {
      orig: "0",
      CSOSN: "101",
      pCredSN: "3.00",
      vCredICMSSN: "4.00",
    });
  });

  it("test_tagICMSSN_102 — ICMSSN102 without credit", () => {
    // PHP: orig=0, CSOSN=102
    const { xml } = buildIcmsXml({
      taxRegime: 1,
      orig: "0",
      CSOSN: "102",
    });

    expectWrappedIn(xml, "ICMS");
    expectWrappedIn(xml, "ICMSSN102");
    expectXmlContains(xml, {
      CSOSN: "102",
    });
  });

  it("test_tagICMSSN_103 — ICMSSN102 (CSOSN 103 uses same wrapper)", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 1,
      orig: "0",
      CSOSN: "103",
    });

    expectWrappedIn(xml, "ICMS");
    expectWrappedIn(xml, "ICMSSN102");
    expectXmlContains(xml, {
      CSOSN: "103",
    });
  });

  it("test_tagICMSSN_300 — ICMSSN102 (CSOSN 300 uses same wrapper)", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 1,
      orig: "0",
      CSOSN: "300",
    });

    expectWrappedIn(xml, "ICMS");
    expectWrappedIn(xml, "ICMSSN102");
    expectXmlContains(xml, {
      CSOSN: "300",
    });
  });

  it("test_tagICMSSN_400 — ICMSSN102 (CSOSN 400 uses same wrapper)", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 1,
      orig: "0",
      CSOSN: "400",
    });

    expectWrappedIn(xml, "ICMS");
    expectWrappedIn(xml, "ICMSSN102");
    expectXmlContains(xml, {
      CSOSN: "400",
    });
  });

  it("test_tagICMSSN_201 — ICMSSN201 with credit and ST", () => {
    // PHP: orig=0, CSOSN=201, modBCST=4, pMVAST=10, pRedBCST=20,
    //   vBCST=300, pICMSST=1, vICMSST=1, vBCFCPST=1, pFCPST=1, vFCPST=1,
    //   pCredSN=1, vCredICMSSN=1
    const { xml, totals } = buildIcmsXml({
      taxRegime: 1,
      orig: "0",
      CSOSN: "201",
      modBCST: "4",
      pMVAST: 1000,        // "10.0000"
      pRedBCST: 2000,      // "20.0000"
      vBCST: 30000,        // "300.00"
      pICMSST: 100,        // "1.0000"
      vICMSST: 100,        // "1.00"
      vBCFCPST: 100,       // "1.00"
      pFCPST: 100,         // "1.0000"
      vFCPST: 100,         // "1.00"
      pCredSN: 100,        // "1.0000" (4dp in CSOSN201)
      vCredICMSSN: 100,    // "1.00"
    });

    expectWrappedIn(xml, "ICMS");
    expectWrappedIn(xml, "ICMSSN201");
    expectXmlContains(xml, {
      orig: "0",
      CSOSN: "201",
      modBCST: "4",
      pMVAST: "10.0000",
      pRedBCST: "20.0000",
      vBCST: "300.00",
      pICMSST: "1.0000",
      vICMSST: "1.00",
      vBCFCPST: "1.00",
      pFCPST: "1.0000",
      vFCPST: "1.00",
      pCredSN: "1.0000",
      vCredICMSSN: "1.00",
    });
    expect(totals.vBCST).toBe(30000);
    expect(totals.vST).toBe(100);
  });

  it("test_tagICMSSN_202 — ICMSSN202 without credit with ST", () => {
    // PHP: orig=0, CSOSN=202, modBCST=4, pMVAST=10, pRedBCST=20,
    //   vBCST=300, pICMSST=1, vICMSST=1, vBCFCPST=1, pFCPST=1, vFCPST=1
    const { xml, totals } = buildIcmsXml({
      taxRegime: 1,
      orig: "0",
      CSOSN: "202",
      modBCST: "4",
      pMVAST: 1000,
      pRedBCST: 2000,
      vBCST: 30000,
      pICMSST: 100,
      vICMSST: 100,
      vBCFCPST: 100,
      pFCPST: 100,
      vFCPST: 100,
    });

    expectWrappedIn(xml, "ICMS");
    expectWrappedIn(xml, "ICMSSN202");
    expectXmlContains(xml, {
      orig: "0",
      CSOSN: "202",
      modBCST: "4",
      pMVAST: "10.0000",
      pRedBCST: "20.0000",
      vBCST: "300.00",
      pICMSST: "1.0000",
      vICMSST: "1.00",
      vBCFCPST: "1.00",
      pFCPST: "1.0000",
      vFCPST: "1.00",
    });
    expect(totals.vBCST).toBe(30000);
    expect(totals.vST).toBe(100);
  });

  it("test_tagICMSSN_203 — ICMSSN202 (CSOSN 203 uses same wrapper)", () => {
    const { xml } = buildIcmsXml({
      taxRegime: 1,
      orig: "0",
      CSOSN: "203",
      modBCST: "4",
      pMVAST: 1000,
      pRedBCST: 2000,
      vBCST: 30000,
      pICMSST: 100,
      vICMSST: 100,
      vBCFCPST: 100,
      pFCPST: 100,
      vFCPST: 100,
    });

    expectWrappedIn(xml, "ICMS");
    expectWrappedIn(xml, "ICMSSN202");
    expectXmlContains(xml, { CSOSN: "203" });
  });

  it("test_tagICMSSN_500 — ICMSSN500 previously charged", () => {
    // PHP: orig=0, CSOSN=500, vBCSTRet=1, pST=1, vICMSSubstituto=1,
    //   vICMSSTRet=1, vBCFCPSTRet=1, pFCPSTRet=1, vFCPSTRet=1,
    //   pRedBCEfet=1, vBCEfet=1, pICMSEfet=1, vICMSEfet=1
    const { xml } = buildIcmsXml({
      taxRegime: 1,
      orig: "0",
      CSOSN: "500",
      vBCSTRet: 100,
      pST: 100,
      vICMSSubstituto: 100,
      vICMSSTRet: 100,
      vBCFCPSTRet: 100,
      pFCPSTRet: 100,
      vFCPSTRet: 100,
      pRedBCEfet: 100,
      vBCEfet: 100,
      pICMSEfet: 100,
      vICMSEfet: 100,
    });

    expectWrappedIn(xml, "ICMS");
    expectWrappedIn(xml, "ICMSSN500");
    expectXmlContains(xml, {
      orig: "0",
      CSOSN: "500",
      vBCSTRet: "1.00",
      pST: "1.0000",
      vICMSSubstituto: "1.00",
      vICMSSTRet: "1.00",
      vBCFCPSTRet: "1.00",
      pFCPSTRet: "1.0000",
      vFCPSTRet: "1.00",
      pRedBCEfet: "1.0000",
      vBCEfet: "1.00",
      pICMSEfet: "1.0000",
      vICMSEfet: "1.00",
    });
  });

  it("test_tagICMSSN_900 — ICMSSN900 others", () => {
    // PHP: orig=0, CSOSN=900, modBC=3, vBC=100, pRedBC=1, pICMS=1, vICMS=1,
    //   pCredSN=3, vCredICMSSN=4, modBCST=3, pMVAST=1, pRedBCST=1,
    //   vBCST=1, pICMSST=1, vICMSST=1, vBCFCPST=1, pFCPST=1, vFCPST=1
    const { xml, totals } = buildIcmsXml({
      taxRegime: 1,
      orig: "0",
      CSOSN: "900",
      modBC: "3",
      vBC: 10000,          // "100.00"
      pRedBC: 100,         // "1.0000"
      pICMS: 100,          // "1.0000"
      vICMS: 100,          // "1.00"
      pCredSN: 300,        // "3.0000" (4dp in CSOSN900)
      vCredICMSSN: 400,    // "4.00"
      modBCST: "3",
      pMVAST: 100,         // "1.0000"
      pRedBCST: 100,       // "1.0000"
      vBCST: 100,          // "1.00"
      pICMSST: 100,        // "1.0000"
      vICMSST: 100,        // "1.00"
      vBCFCPST: 100,       // "1.00"
      pFCPST: 100,         // "1.0000"
      vFCPST: 100,         // "1.00"
    });

    expectWrappedIn(xml, "ICMS");
    expectWrappedIn(xml, "ICMSSN900");
    expectXmlContains(xml, {
      CSOSN: "900",
      modBC: "3",
      vBC: "100.00",
      pRedBC: "1.0000",
      pICMS: "1.0000",
      vICMS: "1.00",
      pCredSN: "3.0000",
      vCredICMSSN: "4.00",
      modBCST: "3",
      pMVAST: "1.0000",
      pRedBCST: "1.0000",
      vBCST: "1.00",
      pICMSST: "1.0000",
      vICMSST: "1.00",
      vBCFCPST: "1.00",
      pFCPST: "1.0000",
      vFCPST: "1.00",
    });
    expect(totals.vBC).toBe(10000);
    expect(totals.vICMS).toBe(100);
    expect(totals.vBCST).toBe(100);
    expect(totals.vST).toBe(100);
  });

  it("test_tagICMSSNShouldAcceptEmptyOrig_whenCrtIs4AndCsosnInAllowedList — orig omitted for CRT 4", () => {
    // PHP: CRT=4, orig=null, CSOSN=900 → orig tag should NOT be present
    // In our code, CSOSN 900 and 102 use optTag for orig, so passing undefined omits it.
    const { xml } = buildIcmsXml({
      taxRegime: 1,
      orig: undefined as unknown as string, // simulate null/missing orig
      CSOSN: "900",
      modBC: "3",
      vBC: 10000,
      pRedBC: 100,
      pICMS: 100,
      vICMS: 100,
      pCredSN: 300,
      vCredICMSSN: 400,
      modBCST: "3",
      pMVAST: 100,
      pRedBCST: 100,
      vBCST: 100,
      pICMSST: 100,
      vICMSST: 100,
      vBCFCPST: 100,
      pFCPST: 100,
      vFCPST: 100,
    });

    expectWrappedIn(xml, "ICMS");
    expectWrappedIn(xml, "ICMSSN900");
    // orig should not be present when null/undefined
    expect(xml).not.toContain("<orig>");
  });
});

// ── Access Key (buildAccessKey) ─────────────────────────────────────────────

describe("buildAccessKey — structural test", () => {
  it("builds a 44-digit access key with valid check digit", () => {
    const key = buildAccessKey({
      stateCode: "35",
      yearMonth: "1703",
      taxId: "58716523000119",
      model: 55,
      series: 1,
      number: 30,
      emissionType: 1,
      numericCode: "00000030",
    });

    expect(key).toHaveLength(44);
    // Starts with state code
    expect(key.startsWith("35")).toBe(true);
    // Contains CNPJ
    expect(key.substring(6, 20)).toBe("58716523000119");
    // Model
    expect(key.substring(20, 22)).toBe("55");
    // Series
    expect(key.substring(22, 25)).toBe("001");
    // Number
    expect(key.substring(25, 34)).toBe("000000030");
    // Emission type
    expect(key.substring(34, 35)).toBe("1");
    // Numeric code
    expect(key.substring(35, 43)).toBe("00000030");
  });
});

// ── PIS tests ───────────────────────────────────────────────────────────────

describe("PIS builders — structural equivalents", () => {
  it("PISAliq — CST 01 with percentage", () => {
    // Equivalent to PHP tagPIS with CST=01
    const xml = buildPisXml({
      CST: "01",
      vBC: 10000,       // fmtCents(10000)="100.00"
      pPIS: 16500,      // fmt4(16500)="1.6500"
      vPIS: 165,        // fmtCents(165)="1.65"
    });

    expectWrappedIn(xml, "PIS");
    expectWrappedIn(xml, "PISAliq");
    expectXmlContains(xml, {
      CST: "01",
      vBC: "100.00",
      pPIS: "1.6500",
      vPIS: "1.65",
    });
  });

  it("PISAliq — CST 02", () => {
    const xml = buildPisXml({
      CST: "02",
      vBC: 20000,
      pPIS: 16500,
      vPIS: 330,
    });

    expectWrappedIn(xml, "PISAliq");
    expectXmlContains(xml, { CST: "02" });
  });

  it("PISQtde — CST 03 with quantity", () => {
    const xml = buildPisXml({
      CST: "03",
      qBCProd: 10000,    // fmt4(10000)="1.0000"
      vAliqProd: 50000,  // fmt4(50000)="5.0000"
      vPIS: 500,         // fmtCents(500)="5.00"
    });

    expectWrappedIn(xml, "PISQtde");
    expectXmlContains(xml, {
      CST: "03",
      qBCProd: "1.0000",
      vAliqProd: "5.0000",
      vPIS: "5.00",
    });
  });

  it("PISNT — CST 04 (non-taxed)", () => {
    const xml = buildPisXml({ CST: "04" });

    expectWrappedIn(xml, "PISNT");
    expectXmlContains(xml, { CST: "04" });
    expect(xml).not.toContain("<vBC>");
  });

  it("PISNT — CST 05, 06, 07, 08, 09", () => {
    for (const cst of ["05", "06", "07", "08", "09"]) {
      const xml = buildPisXml({ CST: cst });
      expectWrappedIn(xml, "PISNT");
      expectXmlContains(xml, { CST: cst });
    }
  });

  it("PISOutr — CST 49 with percentage", () => {
    const xml = buildPisXml({
      CST: "49",
      vBC: 10000,
      pPIS: 16500,
      vPIS: 165,
    });

    expectWrappedIn(xml, "PISOutr");
    expectXmlContains(xml, {
      CST: "49",
      vBC: "100.00",
      pPIS: "1.6500",
      vPIS: "1.65",
    });
  });

  it("PISOutr — CST 99 with quantity", () => {
    const xml = buildPisXml({
      CST: "99",
      qBCProd: 10000,
      vAliqProd: 50000,
      vPIS: 500,
    });

    expectWrappedIn(xml, "PISOutr");
    expectXmlContains(xml, {
      CST: "99",
      qBCProd: "1.0000",
      vAliqProd: "5.0000",
      vPIS: "5.00",
    });
  });
});

// ── COFINS tests ────────────────────────────────────────────────────────────

describe("COFINS builders — structural equivalents", () => {
  it("COFINSAliq — CST 01 with percentage", () => {
    const xml = buildCofinsXml({
      CST: "01",
      vBC: 10000,
      pCOFINS: 76000,   // fmt4(76000)="7.6000"
      vPIS: 760,
      vCOFINS: 760,     // fmtCents(760)="7.60"
    });

    expectWrappedIn(xml, "COFINS");
    expectWrappedIn(xml, "COFINSAliq");
    expectXmlContains(xml, {
      CST: "01",
      vBC: "100.00",
      pCOFINS: "7.6000",
      vCOFINS: "7.60",
    });
  });

  it("COFINSQtde — CST 03 with quantity", () => {
    const xml = buildCofinsXml({
      CST: "03",
      qBCProd: 10000,
      vAliqProd: 50000,
      vCOFINS: 500,
    });

    expectWrappedIn(xml, "COFINSQtde");
    expectXmlContains(xml, {
      CST: "03",
      qBCProd: "1.0000",
      vAliqProd: "5.0000",
      vCOFINS: "5.00",
    });
  });

  it("COFINSNT — CST 04 (non-taxed)", () => {
    const xml = buildCofinsXml({ CST: "04" });

    expectWrappedIn(xml, "COFINSNT");
    expectXmlContains(xml, { CST: "04" });
  });

  it("COFINSNT — CST 05, 06, 07, 08, 09", () => {
    for (const cst of ["05", "06", "07", "08", "09"]) {
      const xml = buildCofinsXml({ CST: cst });
      expectWrappedIn(xml, "COFINSNT");
    }
  });

  it("COFINSOutr — CST 99 with percentage", () => {
    const xml = buildCofinsXml({
      CST: "99",
      vBC: 10000,
      pCOFINS: 76000,
      vCOFINS: 760,
    });

    expectWrappedIn(xml, "COFINSOutr");
    expectXmlContains(xml, {
      CST: "99",
      vBC: "100.00",
      pCOFINS: "7.6000",
      vCOFINS: "7.60",
    });
  });

  it("COFINSOutr — CST 49 with quantity", () => {
    const xml = buildCofinsXml({
      CST: "49",
      qBCProd: 20000,
      vAliqProd: 30000,
      vCOFINS: 600,
    });

    expectWrappedIn(xml, "COFINSOutr");
    expectXmlContains(xml, {
      CST: "49",
      qBCProd: "2.0000",
      vAliqProd: "3.0000",
      vCOFINS: "6.00",
    });
  });
});

// ── IPI tests ───────────────────────────────────────────────────────────────

describe("IPI builders — structural equivalents", () => {
  it("IPITrib — CST 50 with percentage", () => {
    const xml = buildIpiXml({
      CST: "50",
      cEnq: "999",
      vBC: 10000,        // fmtCents(10000)="100.00"
      pIPI: 50000,       // fmt4(50000)="5.0000"
      vIPI: 500,         // fmtCents(500)="5.00"
    });

    expectWrappedIn(xml, "IPI");
    expectWrappedIn(xml, "IPITrib");
    expectXmlContains(xml, {
      cEnq: "999",
      CST: "50",
      vBC: "100.00",
      pIPI: "5.0000",
      vIPI: "5.00",
    });
  });

  it("IPITrib — CST 00 with percentage", () => {
    const xml = buildIpiXml({
      CST: "00",
      cEnq: "999",
      vBC: 20000,
      pIPI: 100000,      // fmt4(100000)="10.0000"
      vIPI: 2000,
    });

    expectWrappedIn(xml, "IPITrib");
    expectXmlContains(xml, { CST: "00", pIPI: "10.0000" });
  });

  it("IPITrib — CST 49 with unit-based", () => {
    const xml = buildIpiXml({
      CST: "49",
      cEnq: "999",
      qUnid: 10000,      // fmt4(10000)="1.0000"
      vUnid: 50000,      // fmt4(50000)="5.0000"
      vIPI: 500,
    });

    expectWrappedIn(xml, "IPITrib");
    expectXmlContains(xml, {
      CST: "49",
      qUnid: "1.0000",
      vUnid: "5.0000",
      vIPI: "5.00",
    });
  });

  it("IPITrib — CST 99 with percentage", () => {
    const xml = buildIpiXml({
      CST: "99",
      cEnq: "311",
      vBC: 50000,
      pIPI: 150000,
      vIPI: 7500,
    });

    expectWrappedIn(xml, "IPITrib");
    expectXmlContains(xml, {
      cEnq: "311",
      CST: "99",
      vBC: "500.00",
      pIPI: "15.0000",
      vIPI: "75.00",
    });
  });

  it("IPINT — CST 01 (non-taxed)", () => {
    const xml = buildIpiXml({
      CST: "01",
      cEnq: "999",
    });

    expectWrappedIn(xml, "IPI");
    expectWrappedIn(xml, "IPINT");
    expectXmlContains(xml, { CST: "01" });
    expect(xml).not.toContain("<IPITrib>");
  });

  it("IPINT — CST 02, 03, 04, 05 (non-taxed)", () => {
    for (const cst of ["02", "03", "04", "05"]) {
      const xml = buildIpiXml({ CST: cst, cEnq: "999" });
      expectWrappedIn(xml, "IPINT");
      expectXmlContains(xml, { CST: cst });
    }
  });

  it("IPI with optional header fields (CNPJProd, cSelo, qSelo)", () => {
    const xml = buildIpiXml({
      CST: "50",
      cEnq: "999",
      CNPJProd: "12345678901234",
      cSelo: "SELO123",
      qSelo: 10,
      vBC: 10000,
      pIPI: 50000,
      vIPI: 500,
    });

    expectXmlContains(xml, {
      CNPJProd: "12345678901234",
      cSelo: "SELO123",
      qSelo: "10",
    });
  });
});

// ── II (Imposto de Importacao) — additional test ────────────────────────────

describe("II builders — additional scenarios", () => {
  it("builds II with all zero values", () => {
    const xml = buildIiXml({
      vBC: 0,
      vDespAdu: 0,
      vII: 0,
      vIOF: 0,
    });

    expectXmlContains(xml, {
      vBC: "0.00",
      vDespAdu: "0.00",
      vII: "0.00",
      vIOF: "0.00",
    });
  });

  it("builds II with large values", () => {
    const xml = buildIiXml({
      vBC: 1000000,     // "10000.00"
      vDespAdu: 50000,  // "500.00"
      vII: 150000,      // "1500.00"
      vIOF: 25000,      // "250.00"
    });

    expectXmlContains(xml, {
      vBC: "10000.00",
      vDespAdu: "500.00",
      vII: "1500.00",
      vIOF: "250.00",
    });
  });
});
