// @ts-nocheck
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
import { tag, buildInvoiceXml } from "../xml-builder";

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
    it("testRenderCompleteNFe55HasAllSections — render produces XML with all required sections in correct order", () => {
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
        recipient: {
          taxId: "12345678901",
          name: "Cliente Teste",
          stateCode: "SP",
        },
        items: [
          {
            itemNumber: 1,
            productCode: "001",
            description: "Produto Teste",
            ncm: "61091000",
            cfop: "5102",
            unitOfMeasure: "UN",
            quantity: 1,
            unitPrice: 10000,
            totalPrice: 10000,
            icmsCst: "00",
            icmsModBC: 0,
            icmsRate: 1800,
            icmsAmount: 1800,
            pisCst: "01",
            pisVBC: 10000,
            pisPPIS: 16500,
            pisVPIS: 165,
            cofinsCst: "01",
            cofinsVBC: 10000,
            cofinsPCOFINS: 76000,
            cofinsVCOFINS: 760,
          },
        ],
        payments: [{ method: "01", amount: 10000 }],
        withdrawal: {
          taxId: "99887766000100",
          name: "Empresa Origem",
          street: "Rua Retirada",
          number: "50",
          district: "Industrial",
          cityCode: "4106902",
          cityName: "Curitiba",
          stateCode: "PR",
        },
        delivery: {
          taxId: "11222333000181",
          name: "Empresa Destino",
          street: "Rua Entrega",
          number: "200",
          district: "Centro",
          cityCode: "3550308",
          cityName: "Sao Paulo",
          stateCode: "SP",
        },
        authorizedXml: [{ taxId: "12345678000195" }],
        billing: {
          invoice: { number: "001", originalValue: 10000, netValue: 10000 },
          installments: [{ number: "001", dueDate: "2025-02-15", value: 10000 }],
        },
        transport: {
          freightMode: "0",
          carrier: { taxId: "12345678000195", name: "Transportadora" },
        },
        intermediary: { taxId: "55667788000199" },
        additionalInfo: { taxpayerNote: "Nota teste" },
        export: { exitState: "SP", exportLocation: "Porto de Santos" },
        purchase: { orderNumber: "PED-001" },
        techResponsible: { taxId: "11223344000155", contact: "Suporte", email: "suporte@teste.com" },
        references: [{ type: "nfe", accessKey: "35170358716523000119550010000000291000000291" }],
      });

      // Check all sections present in correct order
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

      // Verify order: retirada before entrega before autXML before det
      const retiradaPos = xml.indexOf("<retirada>");
      const entregaPos = xml.indexOf("<entrega>");
      const autXmlPos = xml.indexOf("<autXML>");
      const detPos = xml.indexOf("<det ");
      const totalPos = xml.indexOf("<total>");
      const transpPos = xml.indexOf("<transp>");
      const cobrPos = xml.indexOf("<cobr>");
      const pagPos = xml.indexOf("<pag>");
      expect(retiradaPos).toBeLessThan(entregaPos);
      expect(entregaPos).toBeLessThan(autXmlPos);
      expect(autXmlPos).toBeLessThan(detPos);
      expect(detPos).toBeLessThan(totalPos);
      expect(totalPos).toBeLessThan(transpPos);
      expect(transpPos).toBeLessThan(cobrPos);
      expect(cobrPos).toBeLessThan(pagPos);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  //  3. render() with NFC-e (model 65)
  // ──────────────────────────────────────────────────────────────────

  describe("render() with NFC-e model 65", () => {
    it("testRenderNFCeModel65 — render produces XML with mod=65, indFinal=1, tpImp=4", () => {
      const { xml } = buildInvoiceXml({
        model: 65,
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
          taxRegime: 1,
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
            itemNumber: 1,
            productCode: "001",
            description: "Produto NFC-e",
            ncm: "61091000",
            cfop: "5102",
            unitOfMeasure: "UN",
            quantity: 1,
            unitPrice: 5000,
            totalPrice: 5000,
            icmsCst: "102",
            icmsRate: 0,
            icmsAmount: 0,
            pisCst: "07",
            cofinsCst: "07",
          },
        ],
        payments: [{ method: "01", amount: 5000 }],
      });

      expect(xml).toContain("<mod>65</mod>");
      expect(xml).toContain("<indFinal>1</indFinal>");
      expect(xml).toContain("<tpImp>4</tpImp>");
    });
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

    it("testTagRetTribInRenderOutput — retTrib should be inside <total> section in rendered XML", () => {
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
        items: [
          {
            itemNumber: 1,
            productCode: "001",
            description: "Produto Teste",
            ncm: "61091000",
            cfop: "5102",
            unitOfMeasure: "UN",
            quantity: 1,
            unitPrice: 10000,
            totalPrice: 10000,
            icmsCst: "00",
            icmsModBC: 0,
            icmsRate: 1800,
            icmsAmount: 1800,
            pisCst: "01",
            cofinsCst: "01",
          },
        ],
        payments: [{ method: "01", amount: 10000 }],
        retTrib: {
          vRetPIS: 1000,
          vRetCOFINS: 4600,
          vRetCSLL: 500,
          vBCIRRF: 10000,
          vIRRF: 1500,
          vBCRetPrev: 20000,
          vRetPrev: 2200,
        },
      });

      // retTrib must be inside <total>
      expect(xml).toContain("<retTrib>");
      const totalPos = xml.indexOf("<total>");
      const retTribPos = xml.indexOf("<retTrib>");
      const totalEndPos = xml.indexOf("</total>");
      expect(retTribPos).toBeGreaterThan(totalPos);
      expect(retTribPos).toBeLessThan(totalEndPos);

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

    it("testTagProdWithAllOptionalFields — full render with infAdProd and obsItem in rendered XML", () => {
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
        items: [
          {
            itemNumber: 1,
            productCode: "001",
            description: "Produto Completo",
            ncm: "61091000",
            cfop: "5102",
            unitOfMeasure: "UN",
            quantity: 1,
            unitPrice: 10000,
            totalPrice: 10000,
            icmsCst: "00",
            icmsModBC: 0,
            icmsRate: 1800,
            icmsAmount: 1800,
            pisCst: "01",
            cofinsCst: "01",
            infAdProd: "Informacao adicional do produto item 1",
            obsItem: {
              obsCont: { xCampo: "CampoTeste", xTexto: "ValorTeste" },
            },
          },
        ],
        payments: [{ method: "01", amount: 10000 }],
      });

      // infAdProd should be inside det, after imposto
      expect(xml).toContain("<infAdProd>Informacao adicional do produto item 1</infAdProd>");
      const impostoEndPos = xml.indexOf("</imposto>");
      const infAdProdPos = xml.indexOf("<infAdProd>");
      const detEndPos = xml.indexOf("</det>");
      expect(infAdProdPos).toBeGreaterThan(impostoEndPos);
      expect(infAdProdPos).toBeLessThan(detEndPos);

      // obsItem should be inside det
      expect(xml).toContain("<obsItem>");
      expect(xml).toContain('xCampo="CampoTeste"');
      expect(xml).toContain("<xTexto>ValorTeste</xTexto>");
    });
  });

  // ──────────────────────────────────────────────────────────────────
  //  7. TraitTagDetOptions: tagRastro, tagveicProd, tagmed,
  //     tagarma, tagRECOPI, tagDFeReferenciado
  // ──────────────────────────────────────────────────────────────────

  describe("TraitTagDetOptions — batch tracking, vehicles, medicine, weapons", () => {
    // Shared base invoice data for product option tests
    const baseInvoice = {
      model: 55 as const,
      series: 1,
      number: 1,
      emissionType: 1 as const,
      environment: 2 as const,
      issuedAt: new Date("2025-01-15T10:30:00"),
      operationNature: "VENDA",
      issuer: {
        taxId: "58716523000119",
        stateTaxId: "111222333444",
        companyName: "Empresa Teste",
        tradeName: null,
        taxRegime: 3 as const,
        stateCode: "SP",
        cityCode: "3550308",
        cityName: "Sao Paulo",
        street: "Rua Teste",
        streetNumber: "100",
        district: "Centro",
        zipCode: "01001000",
        addressComplement: null,
      },
      payments: [{ method: "01", amount: 10000 }],
    };

    const baseItem = {
      itemNumber: 1,
      productCode: "001",
      description: "Produto Teste",
      ncm: "61091000",
      cfop: "5102",
      unitOfMeasure: "UN",
      quantity: 1,
      unitPrice: 10000,
      totalPrice: 10000,
      icmsCst: "00",
      icmsModBC: 0,
      icmsRate: 1800,
      icmsAmount: 1800,
      pisCst: "01",
      cofinsCst: "01",
    };

    it("testTagRastroBatchTracking — render includes rastro with nLote, qLote, dFab, dVal, cAgreg", () => {
      const { xml } = buildInvoiceXml({
        ...baseInvoice,
        items: [{
          ...baseItem,
          rastro: [
            { nLote: "LOTE2025A", qLote: 100.0, dFab: "2025-01-15", dVal: "2026-01-15", cAgreg: "AGR001" },
            { nLote: "LOTE2025B", qLote: 50.0, dFab: "2025-02-10", dVal: "2026-02-10" },
          ],
        }],
      });

      // rastro should be inside <prod>
      expect(xml).toContain("<rastro>");
      const prodPos = xml.indexOf("<prod>");
      const rastroPos = xml.indexOf("<rastro>");
      const prodEndPos = xml.indexOf("</prod>");
      expect(rastroPos).toBeGreaterThan(prodPos);
      expect(rastroPos).toBeLessThan(prodEndPos);

      expectXmlContains(xml, {
        nLote: "LOTE2025A",
        qLote: "100.000",
        dFab: "2025-01-15",
        dVal: "2026-01-15",
        cAgreg: "AGR001",
      });
      // Second rastro
      expect(xml).toContain("<nLote>LOTE2025B</nLote>");
      // Count rastro occurrences
      const count = xml.split("<rastro>").length - 1;
      expect(count).toBe(2);
    });

    it("testTagVeicProdVehicle — render includes veicProd with chassi, xCor, pot, nMotor, anoMod, anoFab, tpRest", () => {
      const { xml } = buildInvoiceXml({
        ...baseInvoice,
        items: [{
          ...baseItem,
          veicProd: {
            tpOp: "1",
            chassi: "9BWSU19F08B302158",
            cCor: "1",
            xCor: "BRANCA",
            pot: "150",
            cilin: "1600",
            pesoL: "1200",
            pesoB: "1350",
            nSerie: "AAA111222",
            tpComb: "16",
            nMotor: "MOT12345",
            CMT: "1800.0000",
            dist: "2600",
            anoMod: "2025",
            anoFab: "2024",
            tpPint: "M",
            tpVeic: "06",
            espVeic: "1",
            VIN: "R",
            condVeic: "1",
            cMod: "123456",
            cCorDENATRAN: "01",
            lota: "5",
            tpRest: "0",
          },
        }],
      });

      // veicProd should be inside <prod>
      expect(xml).toContain("<veicProd>");
      const prodPos = xml.indexOf("<prod>");
      const veicPos = xml.indexOf("<veicProd>");
      const prodEndPos = xml.indexOf("</prod>");
      expect(veicPos).toBeGreaterThan(prodPos);
      expect(veicPos).toBeLessThan(prodEndPos);

      expectXmlContains(xml, {
        chassi: "9BWSU19F08B302158",
        xCor: "BRANCA",
        pot: "150",
        nMotor: "MOT12345",
        anoMod: "2025",
        anoFab: "2024",
        tpRest: "0",
      });
    });

    it("testTagMedMedicine — render includes med with cProdANVISA and vPMC", () => {
      const { xml } = buildInvoiceXml({
        ...baseInvoice,
        items: [{
          ...baseItem,
          med: {
            cProdANVISA: "1234567890123",
            vPMC: 4990, // R$49.90
          },
        }],
      });

      // med should be inside <prod>
      expect(xml).toContain("<med>");
      const prodPos = xml.indexOf("<prod>");
      const medPos = xml.indexOf("<med>");
      const prodEndPos = xml.indexOf("</prod>");
      expect(medPos).toBeGreaterThan(prodPos);
      expect(medPos).toBeLessThan(prodEndPos);

      expectXmlContains(xml, {
        cProdANVISA: "1234567890123",
        vPMC: "49.90",
      });
    });

    it("testTagArmaWeapon — render includes arma with tpArma, nSerie, nCano, descr", () => {
      const { xml } = buildInvoiceXml({
        ...baseInvoice,
        items: [{
          ...baseItem,
          arma: [{
            tpArma: "0",
            nSerie: "SR12345",
            nCano: "CN67890",
            descr: "REVOLVER CALIBRE 38",
          }],
        }],
      });

      // arma should be inside <prod>
      expect(xml).toContain("<arma>");
      const prodPos = xml.indexOf("<prod>");
      const armaPos = xml.indexOf("<arma>");
      const prodEndPos = xml.indexOf("</prod>");
      expect(armaPos).toBeGreaterThan(prodPos);
      expect(armaPos).toBeLessThan(prodEndPos);

      expectXmlContains(xml, {
        tpArma: "0",
        nSerie: "SR12345",
        nCano: "CN67890",
        descr: "REVOLVER CALIBRE 38",
      });
    });

    it("testTagRECOPI — render includes nRECOPI", () => {
      const { xml } = buildInvoiceXml({
        ...baseInvoice,
        items: [{
          ...baseItem,
          nRECOPI: "20250101120000123456",
        }],
      });

      // nRECOPI should be inside <prod>
      expect(xml).toContain("<nRECOPI>20250101120000123456</nRECOPI>");
      const prodPos = xml.indexOf("<prod>");
      const recopiPos = xml.indexOf("<nRECOPI>");
      const prodEndPos = xml.indexOf("</prod>");
      expect(recopiPos).toBeGreaterThan(prodPos);
      expect(recopiPos).toBeLessThan(prodEndPos);
    });

    it("testTagRECOPIWithInvalidDataReturnsNull — empty nRECOPI should not render tag", () => {
      const { xml } = buildInvoiceXml({
        ...baseInvoice,
        items: [{
          ...baseItem,
          nRECOPI: "",
        }],
      });

      // Empty nRECOPI should not produce the tag (falsy check)
      expect(xml).not.toContain("<nRECOPI>");
    });

    it("testTagDFeReferenciado — render includes DFeReferenciado with chaveAcesso and nItem (PL_010 schema)", () => {
      const { xml } = buildInvoiceXml({
        ...baseInvoice,
        items: [{
          ...baseItem,
          dfeReferenciado: {
            chaveAcesso: "35170358716523000119550010000000291000000291",
            nItem: "1",
          },
        }],
      });

      // DFeReferenciado should be inside <det>, after imposto
      expect(xml).toContain("<DFeReferenciado>");
      const impostoEndPos = xml.indexOf("</imposto>");
      const dfeRefPos = xml.indexOf("<DFeReferenciado>");
      const detEndPos = xml.indexOf("</det>");
      expect(dfeRefPos).toBeGreaterThan(impostoEndPos);
      expect(dfeRefPos).toBeLessThan(detEndPos);

      expectXmlContains(xml, {
        chaveAcesso: "35170358716523000119550010000000291000000291",
        nItem: "1",
      });
    });
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
    it("testCalculationsTotalsFromMultipleItems — auto-calculated totals match vProd sum from multiple items", () => {
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
        items: [
          {
            itemNumber: 1,
            productCode: "001",
            description: "Produto A",
            ncm: "61091000",
            cfop: "5102",
            unitOfMeasure: "UN",
            quantity: 2,
            unitPrice: 10000,
            totalPrice: 20000,
            icmsCst: "00",
            icmsModBC: 0,
            icmsRate: 1800,
            icmsAmount: 3600,
            pisCst: "01",
            pisVBC: 20000,
            pisPPIS: 16500,
            pisVPIS: 330,
            cofinsCst: "01",
            cofinsVBC: 20000,
            cofinsPCOFINS: 76000,
            cofinsVCOFINS: 1520,
          },
          {
            itemNumber: 2,
            productCode: "002",
            description: "Produto B",
            ncm: "61091000",
            cfop: "5102",
            unitOfMeasure: "UN",
            quantity: 3,
            unitPrice: 10000,
            totalPrice: 30000,
            icmsCst: "00",
            icmsModBC: 0,
            icmsRate: 1800,
            icmsAmount: 5400,
            pisCst: "01",
            pisVBC: 30000,
            pisPPIS: 16500,
            pisVPIS: 495,
            cofinsCst: "01",
            cofinsVBC: 30000,
            cofinsPCOFINS: 76000,
            cofinsVCOFINS: 2280,
          },
        ],
        payments: [{ method: "01", amount: 50000 }],
      });

      // vProd should be sum of item totals: 20000 + 30000 = 50000 cents = 500.00
      expect(xml).toContain("<vProd>500.00</vProd>");
      // vNF should equal vProd for simple case
      expect(xml).toContain("<vNF>500.00</vNF>");
      // ICMS totals: 3600 + 5400 = 9000 cents = 90.00
      expect(xml).toContain("<vICMS>90.00</vICMS>");
    });

    it("testCalculationsWithDifferentTaxValues — ICMSTot with accumulated PIS and COFINS", () => {
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
            itemNumber: 1,
            productCode: "001",
            description: "Produto Unico",
            ncm: "61091000",
            cfop: "5102",
            unitOfMeasure: "UN",
            quantity: 1,
            unitPrice: 26400,
            totalPrice: 26400,
            icmsCst: "00",
            icmsModBC: 0,
            icmsRate: 1800,
            icmsAmount: 4752,
            pisCst: "01",
            pisVBC: 26400,
            pisPPIS: 16500,
            pisVPIS: 436,
            cofinsCst: "01",
            cofinsVBC: 26400,
            cofinsPCOFINS: 76000,
            cofinsVCOFINS: 2006,
          },
        ],
        payments: [{ method: "01", amount: 26400 }],
      });

      // vNF = vProd = 26400 cents = 264.00
      expect(xml).toContain("<vNF>264.00</vNF>");
      expect(xml).toContain("<vProd>264.00</vProd>");
      // PIS = 4.36, COFINS = 20.06
      expect(xml).toContain("<vPIS>4.36</vPIS>");
      expect(xml).toContain("<vCOFINS>20.06</vCOFINS>");
    });
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
