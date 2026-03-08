/**
 * Ported from PHP sped-nfe tests/RenderCoverageTest.php
 *
 * Tests complete XML render() output, totals calculation, transport tags,
 * payment details, billing (cobr), reference tags, and optional sections.
 *
 * Convention: tests that need full render() (PHP Make + DOM) use it.todo()
 * since we don't have a PHP-style Make class. Tests that verify tag()
 * composition or buildInvoiceXml use real assertions.
 *
 * Value conventions:
 *   PHP float → TS cents: 1000.00 → 100000
 *   ICMS rates: PHP 18.0000 → TS 1800 (hundredths)
 *   PIS/COFINS rates: PHP 1.6500 → TS 16500 (value*10000)
 */

import { describe, it, expect } from "bun:test";
import { tag } from "../xml-builder";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Assert an XML string contains all expected tag/value pairs. */
function expectXmlContains(xml: string, expectations: Record<string, string>) {
  for (const [tagName, value] of Object.entries(expectations)) {
    expect(xml).toContain(`<${tagName}>${value}</${tagName}>`);
  }
}

// =============================================================================
// RenderCoverageTest
// =============================================================================

describe("RenderCoverageTest", () => {
  // ──────────────────────────────────────────────────────────────────
  //  1. buildMinimalNFe55 / buildMinimalNFCe65 helpers
  //     These are PHP helper methods — not tests themselves, but they
  //     underpin all test methods below.
  // ──────────────────────────────────────────────────────────────────

  // ──────────────────────────────────────────────────────────────────
  //  2. render() with complete NF-e (model 55)
  // ──────────────────────────────────────────────────────────────────

  describe("render() with complete NF-e model 55", () => {
    it.todo(
      "testRenderCompleteNFe55HasAllSections — render produces XML with all required sections in correct order"
    );
  });

  // ──────────────────────────────────────────────────────────────────
  //  3. render() with NFC-e (model 65)
  // ──────────────────────────────────────────────────────────────────

  describe("render() with NFC-e model 65", () => {
    it.todo(
      "testRenderNFCeModel65 — render produces XML with mod=65, homologacao product name override, indFinal=1, tpImp=4"
    );
  });

  // ──────────────────────────────────────────────────────────────────
  //  4. TraitTagTotal: tagICMSTot, tagISSQNTot, tagretTrib
  // ──────────────────────────────────────────────────────────────────

  describe("TraitTagTotal — tagICMSTot", () => {
    it("testTagICMSTotWithAccumulatedValues — builds ICMSTot with all monetary fields", () => {
      const xml = tag("ICMSTot", {}, [
        tag("vBC", {}, "1000.00"),
        tag("vICMS", {}, "180.00"),
        tag("vICMSDeson", {}, "10.00"),
        tag("vBCST", {}, "200.00"),
        tag("vST", {}, "36.00"),
        tag("vProd", {}, "1000.00"),
        tag("vFrete", {}, "50.00"),
        tag("vSeg", {}, "25.00"),
        tag("vDesc", {}, "15.00"),
        tag("vII", {}, "30.00"),
        tag("vIPI", {}, "45.00"),
        tag("vPIS", {}, "16.50"),
        tag("vCOFINS", {}, "76.00"),
        tag("vOutro", {}, "5.00"),
        tag("vNF", {}, "1196.50"),
        tag("vTotTrib", {}, "383.50"),
        tag("vFCP", {}, "20.00"),
        tag("vFCPST", {}, "4.00"),
        tag("vFCPSTRet", {}, "2.00"),
      ]);

      expectXmlContains(xml, {
        vBC: "1000.00",
        vICMS: "180.00",
        vICMSDeson: "10.00",
        vBCST: "200.00",
        vST: "36.00",
        vFrete: "50.00",
        vSeg: "25.00",
        vDesc: "15.00",
        vII: "30.00",
        vIPI: "45.00",
        vPIS: "16.50",
        vCOFINS: "76.00",
        vOutro: "5.00",
        vTotTrib: "383.50",
        vFCP: "20.00",
        vFCPST: "4.00",
        vFCPSTRet: "2.00",
      });
    });
  });

  describe("TraitTagTotal — tagISSQNTot", () => {
    it("testTagISSQNTotInRenderOutput — builds ISSQNtot with all fields", () => {
      const xml = tag("ISSQNtot", {}, [
        tag("vServ", {}, "500.00"),
        tag("vBC", {}, "500.00"),
        tag("vISS", {}, "25.00"),
        tag("vPIS", {}, "8.25"),
        tag("vCOFINS", {}, "38.00"),
        tag("dCompet", {}, "2017-03-03"),
        tag("vDeducao", {}, "10.00"),
        tag("vOutro", {}, "5.00"),
        tag("vDescIncond", {}, "3.00"),
        tag("vDescCond", {}, "2.00"),
        tag("vISSRet", {}, "12.50"),
        tag("cRegTrib", {}, "5"),
      ]);

      expectXmlContains(xml, {
        vServ: "500.00",
        vISS: "25.00",
        dCompet: "2017-03-03",
        vDeducao: "10.00",
        vISSRet: "12.50",
        cRegTrib: "5",
      });
    });
  });

  describe("TraitTagTotal — tagretTrib", () => {
    it("testTagRetTribInRenderOutput — builds retTrib with all retention fields", () => {
      const xml = tag("retTrib", {}, [
        tag("vRetPIS", {}, "10.00"),
        tag("vRetCOFINS", {}, "46.00"),
        tag("vRetCSLL", {}, "5.00"),
        tag("vBCIRRF", {}, "100.00"),
        tag("vIRRF", {}, "15.00"),
        tag("vBCRetPrev", {}, "200.00"),
        tag("vRetPrev", {}, "22.00"),
      ]);

      expectXmlContains(xml, {
        vRetPIS: "10.00",
        vRetCOFINS: "46.00",
        vRetCSLL: "5.00",
        vBCIRRF: "100.00",
        vIRRF: "15.00",
        vBCRetPrev: "200.00",
        vRetPrev: "22.00",
      });
    });

    it.todo(
      "testTagRetTribInRenderOutput — retTrib should be inside <total> section in rendered XML"
    );
  });

  // ──────────────────────────────────────────────────────────────────
  //  5. TraitTagTransp: full transport group
  // ──────────────────────────────────────────────────────────────────

  describe("TraitTagTransp — full transport group", () => {
    it("testTagTranspFullInRenderOutput — builds full transport section with all child tags", () => {
      const xml = tag("transp", {}, [
        tag("modFrete", {}, "0"),
        tag("transporta", {}, [
          tag("CNPJ", {}, "12345678000195"),
          tag("xNome", {}, "Transportadora ABC"),
          tag("IE", {}, "111222333444"),
          tag("xEnder", {}, "Rua do Transporte, 500"),
          tag("xMun", {}, "Campinas"),
          tag("UF", {}, "SP"),
        ]),
        tag("veicTransp", {}, [
          tag("placa", {}, "ABC1D23"),
          tag("UF", {}, "SP"),
          tag("RNTC", {}, "12345678"),
        ]),
        tag("reboque", {}, [
          tag("placa", {}, "XYZ9F87"),
          tag("UF", {}, "SP"),
          tag("RNTC", {}, "87654321"),
        ]),
        tag("vol", {}, [
          tag("qVol", {}, "10"),
          tag("esp", {}, "CAIXA"),
          tag("marca", {}, "MARCA X"),
          tag("nVol", {}, "001"),
          tag("pesoL", {}, "100.500"),
          tag("pesoB", {}, "120.300"),
          tag("lacres", {}, [
            tag("nLacre", {}, "LACRE001"),
          ]),
          tag("lacres", {}, [
            tag("nLacre", {}, "LACRE002"),
          ]),
        ]),
      ]);

      expectXmlContains(xml, {
        modFrete: "0",
        placa: "ABC1D23", // veicTransp placa checked first
        RNTC: "12345678",
        qVol: "10",
        esp: "CAIXA",
        marca: "MARCA X",
        nVol: "001",
        pesoL: "100.500",
        pesoB: "120.300",
      });
      expect(xml).toContain("<transporta>");
      expect(xml).toContain("<veicTransp>");
      expect(xml).toContain("<reboque>");
      expect(xml).toContain("<vol>");
      expect(xml).toContain("<lacres>");
      expect(xml).toContain("<nLacre>LACRE001</nLacre>");
      expect(xml).toContain("<nLacre>LACRE002</nLacre>");
    });
  });

  // ──────────────────────────────────────────────────────────────────
  //  6. TraitTagDet: tagprod with optional fields, taginfAdProd, tagObsItem
  // ──────────────────────────────────────────────────────────────────

  describe("TraitTagDet — prod with optional fields", () => {
    it("testTagProdWithAllOptionalFields — builds prod with CEST, vFrete, vSeg, vDesc, vOutro, xPed, nItemPed", () => {
      const xml = tag("prod", {}, [
        tag("cProd", {}, "001"),
        tag("cEAN", {}, "7891234567890"),
        tag("xProd", {}, "Produto Completo"),
        tag("NCM", {}, "61091000"),
        tag("CEST", {}, "2806300"),
        tag("indEscala", {}, "S"),
        tag("CNPJFab", {}, "12345678000195"),
        tag("CFOP", {}, "5102"),
        tag("uCom", {}, "UN"),
        tag("qCom", {}, "5.0000"),
        tag("vUnCom", {}, "20.0000000000"),
        tag("vProd", {}, "100.00"),
        tag("cEANTrib", {}, "7891234567890"),
        tag("uTrib", {}, "UN"),
        tag("qTrib", {}, "5.0000"),
        tag("vUnTrib", {}, "20.0000000000"),
        tag("vFrete", {}, "10.00"),
        tag("vSeg", {}, "5.00"),
        tag("vDesc", {}, "3.00"),
        tag("vOutro", {}, "2.00"),
        tag("indTot", {}, "1"),
        tag("xPed", {}, "PED-12345"),
        tag("nItemPed", {}, "001"),
      ]);

      expectXmlContains(xml, {
        cEAN: "7891234567890",
        CEST: "2806300",
        indEscala: "S",
        CNPJFab: "12345678000195",
        vFrete: "10.00",
        vSeg: "5.00",
        vDesc: "3.00",
        vOutro: "2.00",
        xPed: "PED-12345",
        nItemPed: "001",
      });
    });

    it.todo(
      "testTagProdWithAllOptionalFields — full render with infAdProd and obsItem in rendered XML"
    );
  });

  // ──────────────────────────────────────────────────────────────────
  //  7. TraitTagDetOptions: tagRastro, tagveicProd, tagmed,
  //     tagarma, tagRECOPI, tagDFeReferenciado
  // ──────────────────────────────────────────────────────────────────

  describe("TraitTagDetOptions — batch tracking, vehicles, medicine, weapons", () => {
    it.todo(
      "testTagRastroBatchTracking — render includes rastro with nLote, qLote, dFab, dVal, cAgreg"
    );

    it.todo(
      "testTagVeicProdVehicle — render includes veicProd with chassi, xCor, pot, nMotor, anoMod, anoFab, tpRest"
    );

    it.todo(
      "testTagMedMedicine — render includes med with cProdANVISA and vPMC"
    );

    it.todo(
      "testTagArmaWeapon — render includes arma with tpArma, nSerie, nCano, descr"
    );

    it.todo(
      "testTagRECOPI — render includes nRECOPI"
    );

    it.todo(
      "testTagRECOPIWithInvalidDataReturnsNull — empty nRECOPI should produce error"
    );

    it.todo(
      "testTagDFeReferenciado — render includes DFeReferenciado with chaveAcesso and nItem (PL_010 schema)"
    );
  });

  // ──────────────────────────────────────────────────────────────────
  //  8. TraitTagRefs: tagrefNFe, tagrefNF, tagrefNFP, tagrefCTe, tagrefECF
  // ──────────────────────────────────────────────────────────────────

  describe("TraitTagRefs — NF-e reference tags in ide", () => {
    it("testTagRefNFeInIde — builds NFref with refNFe inside ide", () => {
      const xml = tag("ide", {}, [
        tag("cUF", {}, "35"),
        tag("NFref", {}, [
          tag("refNFe", {}, "35170358716523000119550010000000291000000291"),
        ]),
      ]);

      expect(xml).toContain("<NFref>");
      expect(xml).toContain("<refNFe>35170358716523000119550010000000291000000291</refNFe>");
      // NFref should be inside ide
      const idePos = xml.indexOf("<ide>");
      const nfrefPos = xml.indexOf("<NFref>");
      const ideEndPos = xml.indexOf("</ide>");
      expect(nfrefPos).toBeGreaterThan(idePos);
      expect(nfrefPos).toBeLessThan(ideEndPos);
    });

    it("testTagRefNFInIde — builds NFref with refNF containing AAMM and mod", () => {
      const xml = tag("NFref", {}, [
        tag("refNF", {}, [
          tag("cUF", {}, "35"),
          tag("AAMM", {}, "1703"),
          tag("CNPJ", {}, "58716523000119"),
          tag("mod", {}, "01"),
          tag("serie", {}, "1"),
          tag("nNF", {}, "100"),
        ]),
      ]);

      expect(xml).toContain("<NFref>");
      expect(xml).toContain("<refNF>");
      expectXmlContains(xml, {
        AAMM: "1703",
        mod: "01",
      });
    });

    it("testTagRefNFPWithCNPJInIde — builds refNFP with CNPJ and IE", () => {
      const xml = tag("NFref", {}, [
        tag("refNFP", {}, [
          tag("cUF", {}, "35"),
          tag("AAMM", {}, "1703"),
          tag("CNPJ", {}, "58716523000119"),
          tag("IE", {}, "123456789012"),
          tag("mod", {}, "04"),
          tag("serie", {}, "1"),
          tag("nNF", {}, "50"),
        ]),
      ]);

      expect(xml).toContain("<refNFP>");
      expectXmlContains(xml, {
        CNPJ: "58716523000119",
        IE: "123456789012",
        mod: "04",
      });
    });

    it("testTagRefNFPWithCPFInIde — builds refNFP with CPF instead of CNPJ", () => {
      const xml = tag("NFref", {}, [
        tag("refNFP", {}, [
          tag("cUF", {}, "35"),
          tag("AAMM", {}, "1703"),
          tag("CPF", {}, "12345678901"),
          tag("IE", {}, "ISENTO"),
          tag("mod", {}, "04"),
          tag("serie", {}, "0"),
          tag("nNF", {}, "10"),
        ]),
      ]);

      expect(xml).toContain("<refNFP>");
      expectXmlContains(xml, {
        CPF: "12345678901",
        IE: "ISENTO",
      });
    });

    it("testTagRefCTeInIde — builds NFref with refCTe", () => {
      const xml = tag("NFref", {}, [
        tag("refCTe", {}, "35170358716523000119570010000000011000000014"),
      ]);

      expect(xml).toContain("<NFref>");
      expect(xml).toContain("<refCTe>35170358716523000119570010000000011000000014</refCTe>");
    });

    it("testTagRefECFInIde — builds NFref with refECF containing mod, nECF, nCOO", () => {
      const xml = tag("NFref", {}, [
        tag("refECF", {}, [
          tag("mod", {}, "2D"),
          tag("nECF", {}, "123"),
          tag("nCOO", {}, "456789"),
        ]),
      ]);

      expect(xml).toContain("<refECF>");
      expectXmlContains(xml, {
        mod: "2D",
        nECF: "123",
        nCOO: "456789",
      });
    });

    it("testMultipleRefsInIde — builds ide with multiple NFref blocks", () => {
      const xml = tag("ide", {}, [
        tag("NFref", {}, [
          tag("refNFe", {}, "35170358716523000119550010000000291000000291"),
        ]),
        tag("NFref", {}, [
          tag("refCTe", {}, "35170358716523000119570010000000011000000014"),
        ]),
      ]);

      expect(xml).toContain("<refNFe>");
      expect(xml).toContain("<refCTe>");
      // Count NFref occurrences - should be 2
      const count = xml.split("<NFref>").length - 1;
      expect(count).toBe(2);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  //  9. TraitTagPag: tagpag with vTroco, tagdetPag with card details
  // ──────────────────────────────────────────────────────────────────

  describe("TraitTagPag — payment with change and card details", () => {
    it("testTagPagWithVTrocoAndCardDetails — builds pag with vTroco and card sub-element", () => {
      const xml = tag("pag", {}, [
        tag("detPag", {}, [
          tag("tPag", {}, "03"),
          tag("vPag", {}, "150.00"),
          tag("card", {}, [
            tag("tpIntegra", {}, "1"),
            tag("CNPJ", {}, "12345678000195"),
            tag("tBand", {}, "01"),
            tag("cAut", {}, "AUTH123456"),
          ]),
        ]),
        tag("vTroco", {}, "50.00"),
      ]);

      expect(xml).toContain("<pag>");
      expect(xml).toContain("<vTroco>50.00</vTroco>");
      expect(xml).toContain("<detPag>");
      expectXmlContains(xml, {
        tPag: "03",
        vPag: "150.00",
        tpIntegra: "1",
        tBand: "01",
        cAut: "AUTH123456",
      });
      expect(xml).toContain("<card>");

      // vTroco must come AFTER detPag
      const detPagPos = xml.indexOf("<detPag>");
      const vTrocoPos = xml.indexOf("<vTroco>");
      expect(vTrocoPos).toBeGreaterThan(detPagPos);
    });

    it("testTagPagMultiplePayments — builds pag with multiple detPag entries", () => {
      const xml = tag("pag", {}, [
        tag("detPag", {}, [
          tag("tPag", {}, "01"),
          tag("vPag", {}, "100.00"),
        ]),
        tag("detPag", {}, [
          tag("tPag", {}, "03"),
          tag("vPag", {}, "50.00"),
        ]),
      ]);

      const count = xml.split("<detPag>").length - 1;
      expect(count).toBe(2);
      expect(xml).toContain("<tPag>01</tPag>");
      expect(xml).toContain("<tPag>03</tPag>");
    });
  });

  // ──────────────────────────────────────────────────────────────────
  //  10. TraitCalculations: totals correctly calculated
  // ──────────────────────────────────────────────────────────────────

  describe("TraitCalculations — totals from multiple items", () => {
    it.todo(
      "testCalculationsTotalsFromMultipleItems — auto-calculated totals match vProd=500, vFrete=10, vDesc=5, vSeg=8, vOutro=3, vNF=516"
    );

    it.todo(
      "testCalculationsWithDifferentTaxValues — explicit ICMSTot with vNF=264.00 and vTotTrib=45.00"
    );
  });

  // ──────────────────────────────────────────────────────────────────
  //  11. TraitTagCobr: cobr/fat/dup
  // ──────────────────────────────────────────────────────────────────

  describe("TraitTagCobr — billing section", () => {
    it("testTagCobrInRenderOutput — builds cobr with fat and dup", () => {
      const xml = tag("cobr", {}, [
        tag("fat", {}, [
          tag("nFat", {}, "001"),
          tag("vOrig", {}, "100.00"),
          tag("vDesc", {}, "0.00"),
          tag("vLiq", {}, "100.00"),
        ]),
        tag("dup", {}, [
          tag("nDup", {}, "001"),
          tag("dVenc", {}, "2017-04-03"),
          tag("vDup", {}, "100.00"),
        ]),
      ]);

      expect(xml).toContain("<cobr>");
      expect(xml).toContain("<fat>");
      expectXmlContains(xml, {
        nFat: "001",
        nDup: "001",
        dVenc: "2017-04-03",
        vDup: "100.00",
      });
    });
  });
});
