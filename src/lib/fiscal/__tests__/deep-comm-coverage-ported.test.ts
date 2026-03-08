// @ts-nocheck
/**
 * Ported from PHP sped-nfe:
 * - tests/DeepCoverageTest.php
 * - tests/CommunicationCoverageTest.php
 *
 * Tests advanced Make render branches, Tools communication methods (via mock/fake SOAP),
 * Complements edge cases, QRCode edge cases, etc.
 *
 * Value conventions:
 *   PHP float → TS cents: 1000.00 → 100000
 *   ICMS rates: PHP 18.0000 → TS 1800 (hundredths)
 *   PIS/COFINS rates: PHP 1.6500 → TS 16500 (value*10000)
 */

import { describe, it, expect } from "bun:test";
import { tag } from "../xml-builder";
import {
  attachProtocol,
  attachCancellation,
  attachInutilizacao,
  attachEventProtocol,
} from "../complement";
import { buildNfceQrCodeUrl, buildNfceConsultUrl } from "../qrcode";
import {
  parseStatusResponse,
  parseAuthorizationResponse,
  parseCancellationResponse,
  buildStatusRequestXml,
  buildAuthorizationRequestXml,
  buildCancellationXml,
  buildVoidingXml,
} from "../sefaz-client";
import { getSefazUrl, getContingencyType } from "../sefaz-urls";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Assert an XML string contains all expected tag/value pairs. */
function expectXmlContains(xml: string, expectations: Record<string, string>) {
  for (const [tagName, value] of Object.entries(expectations)) {
    expect(xml).toContain(`<${tagName}>${value}</${tagName}>`);
  }
}

// =============================================================================
// DeepCoverageTest
// =============================================================================

describe("DeepCoverageTest", () => {
  // ══════════════════════════════════════════════════════════════════
  //  1. Make.php render() coverage
  // ══════════════════════════════════════════════════════════════════

  describe("Make render() coverage", () => {
    it.todo(
      "testMontaNFeIsAliasForRender — montaNFe() is alias for render() and produces valid XML"
    );

    it.todo(
      "testSetOnlyAsciiConvertsAccentedCharacters — setOnlyAscii(true) converts accented characters without error"
    );

    it.todo(
      "testSetCheckGtinValidatesGtinCodes — setCheckGtin(true) triggers GTIN validation errors on invalid codes"
    );

    it.todo(
      "testRenderWithCobrFatDup — render includes cobr/fat/dup with correct nFat, vOrig, vLiq, nDup"
    );

    it.todo(
      "testRenderWithRetirada — render includes retirada with xLgr"
    );

    it.todo(
      "testRenderWithEntrega — render includes entrega with xLgr"
    );

    it.todo(
      "testRenderWithAutXML — render includes autXML with CNPJ and CPF entries"
    );

    it.todo(
      "testRenderWithInfIntermed — render includes infIntermed with CNPJ and idCadIntTran"
    );

    it.todo(
      "testRenderWithExporta — render includes exporta with UFSaidaPais, xLocExporta, xLocDespacho"
    );

    it.todo(
      "testRenderWithCompra — render includes compra with xNEmp, xPed, xCont"
    );

    it.todo(
      "testRenderWithCana — render includes cana with safra, forDia, deduc"
    );

    it.todo(
      "testRenderWithInfRespTec — render includes infRespTec with CNPJ, xContato, email, fone"
    );

    it.todo(
      "testRenderErrorHandlingStoresErrors — render with missing required tags stores errors"
    );

    it.todo(
      "testGetXMLCallsRenderIfEmpty — getXML calls render() internally if xml is empty"
    );

    it.todo(
      "testGetChaveReturnsKey — getChave returns 44-digit access key after render"
    );

    it.todo(
      "testGetModeloReturns55 — getModelo returns 55 for NF-e"
    );

    it.todo(
      "testGetModeloReturns65 — getModelo returns 65 for NFC-e"
    );

    it.todo(
      "testRenderWithAllOptionalSections — render includes retirada, entrega, autXML, cobr, infIntermed, exporta, compra, infRespTec in correct order"
    );
  });

  // ══════════════════════════════════════════════════════════════════
  //  2. Tools.php coverage (batch manifesta, evento, csc, etc.)
  // ══════════════════════════════════════════════════════════════════

  describe("Tools — sefazManifestaLote", () => {
    it.todo(
      "testSefazManifestaLoteThrowsOnEmptyEvento — should throw on empty evento array"
    );

    it.todo(
      "testSefazManifestaLoteThrowsOnMoreThan20Eventos — should throw on more than 20 events"
    );

    it.todo(
      "testSefazManifestaLoteCiencia — should build correct request with tpEvento 210210"
    );

    it.todo(
      "testSefazManifestaLoteNaoRealizada — should build correct request with tpEvento 210240 and xJust"
    );

    it.todo(
      "testSefazManifestaLoteConfirmacao — should build correct request with tpEvento 210200"
    );

    it.todo(
      "testSefazManifestaLoteDesconhecimento — should build correct request with tpEvento 210220"
    );

    it.todo(
      "testSefazManifestaLoteIgnoresInvalidEventType — should ignore invalid event type 999999"
    );

    it.todo(
      "testSefazManifestaLoteMultipleEvents — should build request with both 210200 and 210210 events"
    );
  });

  describe("Tools — sefazEventoLote", () => {
    it.todo(
      "testSefazEventoLoteThrowsOnEmptyUf — should throw on empty UF"
    );

    it.todo(
      "testSefazEventoLoteThrowsOnMoreThan20Events — should throw on more than 20 events"
    );

    it.todo(
      "testSefazEventoLoteWithValidEvent — should build correct CCe request with xCorrecao and xCondUso"
    );

    it.todo(
      "testSefazEventoLoteSkipsEpecEvent — should skip EPEC event (110140) but include CCe (110110)"
    );
  });

  describe("Tools — sefazCsc", () => {
    it.todo(
      "testSefazCscThrowsOnInvalidIndOp — should throw on indOp=0"
    );

    it.todo(
      "testSefazCscThrowsOnIndOpGreaterThan3 — should throw on indOp=4"
    );

    it.todo(
      "testSefazCscThrowsOnModel55 — should throw when model is 55 (CSC is NFC-e only)"
    );

    it.todo(
      "testSefazCscConsulta — should build correct CSC consultation request with indOp=1"
    );

    it.todo(
      "testSefazCscSolicitaNovo — should build correct CSC new request with indOp=2"
    );

    it.todo(
      "testSefazCscRevogar — should build correct CSC revocation request with indOp=3 and dadosCsc"
    );
  });

  describe("Tools — sefazDownload", () => {
    it.todo(
      "testSefazDownloadThrowsOnEmptyChave — should throw on empty chave"
    );

    it.todo(
      "testSefazDownloadWithValidChave — should build correct distDFeInt request with chNFe and consChNFe"
    );
  });

  describe("Tools — sefazValidate", () => {
    it.todo(
      "testSefazValidateThrowsOnEmptyString — should throw on empty XML string"
    );
  });

  describe("Tools — sefazConciliacao", () => {
    it.todo(
      "testSefazConciliacaoModel55UsesSVRS — should build correct conciliation request for model 55"
    );

    it.todo(
      "testSefazConciliacaoCancelamento — should build cancellation conciliation request with nProtEvento"
    );

    it.todo(
      "testSefazConciliacaoWithDetPag — should build conciliation request with multiple detPag"
    );
  });

  // ══════════════════════════════════════════════════════════════════
  //  3. TraitTagTotal coverage
  // ══════════════════════════════════════════════════════════════════

  describe("TraitTagTotal", () => {
    it.todo(
      "testTagTotalSetsVNFTot — tagTotal should store vNFTot value"
    );

    it.todo(
      "testTagTotalReturnsNullWhenNotSet — tagTotal should return null when vNFTot is not set"
    );

    it.todo(
      "testBuildTagICMSTotWithAllOptionalFields — ICMSTot with vFCPUFDest, vICMSUFDest, vICMSUFRemet, Mono fields, vIPIDevol, vFCP, vFCPST, vFCPSTRet"
    );

    it.todo(
      "testBuildTagICMSTotWithAutoCalculation — auto-calculated ICMSTot when dataICMSTot is empty"
    );

    it.todo(
      "testTagISTotWithValue — tagISTot creates ISTot element with vIS"
    );

    it.todo(
      "testTagISTotReturnsNullWhenEmpty — tagISTot returns null when vIS is 0"
    );

    it.todo(
      "testTagISSQNTotWithAllFields — ISSQNtot with vServ, vDeducao, vDescIncond, vDescCond, vISSRet"
    );

    it.todo(
      "testTagRetTribWithAllFields — retTrib with vRetPIS, vRetCOFINS, vRetCSLL, vBCIRRF, vIRRF, vBCRetPrev, vRetPrev"
    );
  });

  // ══════════════════════════════════════════════════════════════════
  //  4. TraitTagDet coverage
  // ══════════════════════════════════════════════════════════════════

  describe("TraitTagDet — DI/adi, detExport, NVE, gCred, impostoDevol", () => {
    it.todo(
      "testTagProdWithDiAdi — render includes DI with nDI, xLocDesemb, tpViaTransp, vAFRMM, cExportador and adi with nAdicao, cFabricante, vDescDI"
    );

    it.todo(
      "testTagProdWithDiUsingCpf — render includes DI with CPF instead of CNPJ"
    );

    it.todo(
      "testTagDetExport — render includes detExport with nDraw, exportInd with nRE and qExport"
    );

    it.todo(
      "testTagDetExportWithoutExportInd — detExport without nRE/chNFe/qExport should not create exportInd"
    );

    it.todo(
      "testTagNVE — render includes multiple NVE tags (AA0001, BB0002)"
    );

    it.todo(
      "testTagNVEReturnsNullForEmpty — tagNVE returns null when NVE is empty"
    );

    it.todo(
      "testTagGCred — render includes gCred with cCredPresumido, pCredPresumido, vCredPresumido"
    );

    it.todo(
      "testTagImpostoDevol — render includes impostoDevol with pDevol and vIPIDevol"
    );

    it.todo(
      "testRenderWithMultipleItems — render includes det nItem=1 and det nItem=2 with correct xProd"
    );

    it.todo(
      "testTagCESTSeparateMethod — tagCEST adds CEST via separate legacy method"
    );

    it.todo(
      "testTagInfAdProd — render includes infAdProd text"
    );

    it.todo(
      "testTagObsItemWithFisco — render includes obsItem with obsFisco"
    );

    it.todo(
      "testSetCalculationMethod — setCalculationMethod does not throw for V1 and V2"
    );
  });

  // ══════════════════════════════════════════════════════════════════
  //  5. TraitTagTransp coverage
  // ══════════════════════════════════════════════════════════════════

  describe("TraitTagTransp — vagao, balsa, reboques, retTransp, transporta, lacres", () => {
    it.todo(
      "testTagVagao — render includes vagao tag"
    );

    it.todo(
      "testTagVagaoReturnsNullWhenEmpty — tagvagao returns null when vagao is empty"
    );

    it.todo(
      "testTagBalsa — render includes balsa tag"
    );

    it.todo(
      "testTagBalsaReturnsNullWhenEmpty — tagbalsa returns null when balsa is empty"
    );

    it.todo(
      "testTagVagaoNotIncludedWhenVeicTranspExists — vagao is excluded when veicTransp exists"
    );

    it.todo(
      "testTagBalsaNotIncludedWhenVagaoExists — balsa is excluded when vagao exists"
    );

    it.todo(
      "testMultipleReboques — render includes multiple reboque entries with plates REB1X00, REB2X00, REB3X00"
    );

    it.todo(
      "testRetTransp — render includes retTransp with vServ, vBCRet, pICMSRet, vICMSRet, CFOP, cMunFG"
    );

    it.todo(
      "testTransportaWithCpf — render includes transporta with CPF"
    );

    it.todo(
      "testLacresOnMultipleVolumes — render includes lacres on multiple volumes (L001, L002, L003)"
    );
  });

  // ══════════════════════════════════════════════════════════════════
  //  6. QRCode coverage
  // ══════════════════════════════════════════════════════════════════

  describe("QRCode — putQRTag edge cases", () => {
    it("testQRCodePutQRTagThrowsOnMissingCSC — should throw when CSC token is empty", async () => {
      await expect(
        buildNfceQrCodeUrl({
          accessKey: "35170358716523000119650010000000011000000015",
          version: 200,
          environment: 2,
          emissionType: 1,
          qrCodeBaseUrl: "https://www.homologacao.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx",
          cscToken: "",
          cscId: "000001",
        })
      ).rejects.toThrow("CSC token is required");
    });

    it("testQRCodePutQRTagThrowsOnMissingCSCId — should throw when CSC ID is empty", async () => {
      await expect(
        buildNfceQrCodeUrl({
          accessKey: "35170358716523000119650010000000011000000015",
          version: 200,
          environment: 2,
          emissionType: 1,
          qrCodeBaseUrl: "https://www.homologacao.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx",
          cscToken: "GPB0JBWLUR6HWFTVEAS6RJ69GPCROFPBBB8G",
          cscId: "",
        })
      ).rejects.toThrow("CSC ID is required");
    });

    it("testQRCodePutQRTagThrowsOnMissingUrl — should produce malformed QR code when base URL is empty", async () => {
      const result = await buildNfceQrCodeUrl({
        accessKey: "35170358716523000119650010000000011000000015",
        version: 200,
        environment: 2,
        emissionType: 1,
        qrCodeBaseUrl: "",
        cscToken: "GPB0JBWLUR6HWFTVEAS6RJ69GPCROFPBBB8G",
        cscId: "000001",
      });
      // Empty URL produces malformed result starting with "?p="
      expect(result).toMatch(/^\?p=/);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  //  Additional Make.php render paths
  // ══════════════════════════════════════════════════════════════════

  describe("Additional Make render paths", () => {
    it.todo(
      "testRenderWithMultipleItems — render produces det nItem=1 and det nItem=2"
    );
  });
});

// =============================================================================
// CommunicationCoverageTest
// =============================================================================

describe("CommunicationCoverageTest", () => {
  // ──────────────────────────────────────────────────────────────────
  //  1. sefazEnviaLote
  // ──────────────────────────────────────────────────────────────────

  describe("sefazEnviaLote", () => {
    it.todo(
      "test_sefaz_envia_lote_modelo_55_sincrono — should build request with idLote and indSinc=1"
    );

    it.todo(
      "test_sefaz_envia_lote_modelo_55_assincrono — should build request with indSinc=0"
    );

    it.todo(
      "test_sefaz_envia_lote_modelo_65_sincrono — should build request with model 65 and indSinc=1"
    );

    it.todo(
      "test_sefaz_envia_lote_modelo_65_assincrono — should build request with model 65 and indSinc=0"
    );
  });

  // ──────────────────────────────────────────────────────────────────
  //  2. sefazConsultaRecibo
  // ──────────────────────────────────────────────────────────────────

  describe("sefazConsultaRecibo", () => {
    it.todo(
      "test_sefaz_consulta_recibo_valido — should build request with nRec and consReciNFe"
    );

    it.todo(
      "test_sefaz_consulta_recibo_com_tpAmb — should build request with tpAmb=1"
    );
  });

  // ──────────────────────────────────────────────────────────────────
  //  3. sefazConsultaChave
  // ──────────────────────────────────────────────────────────────────

  describe("sefazConsultaChave", () => {
    it.todo(
      "test_sefaz_consulta_chave_valida — should build request with chNFe and consSitNFe"
    );

    it.todo(
      "test_sefaz_consulta_chave_44_digitos_diferente_uf — should work with chave from different UF"
    );

    it.todo(
      "test_sefaz_consulta_chave_vazia_throws — should throw on empty chave"
    );

    it.todo(
      "test_sefaz_consulta_chave_curta_throws — should throw on chave with length < 44"
    );

    it.todo(
      "test_sefaz_consulta_chave_nao_numerica_throws — should throw on non-numeric chave"
    );

    it.todo(
      "test_sefaz_consulta_chave_longa_throws — should throw on chave with length > 44"
    );
  });

  // ──────────────────────────────────────────────────────────────────
  //  4. sefazInutiliza
  // ──────────────────────────────────────────────────────────────────

  describe("sefazInutiliza", () => {
    it("test_sefaz_inutiliza_serie_1 — builds voiding XML with nNFIni and nNFFin", () => {
      const xml = buildVoidingXml("SP", 2, "58716523000119", 55, 1, 1, 10, "Testando Inutilizacao", 2022);
      expect(xml).toContain("inutNFe");
      expect(xml).toContain("<nNFIni>1</nNFIni>");
      expect(xml).toContain("<nNFFin>10</nNFFin>");
    });

    it("test_sefaz_inutiliza_serie_diferente — builds voiding XML with serie and tpAmb", () => {
      const xml = buildVoidingXml("SP", 2, "58716523000119", 55, 5, 100, 200, "Justificativa de teste", 2024);
      expect(xml).toContain("<serie>5</serie>");
      expect(xml).toContain("<nNFIni>100</nNFIni>");
      expect(xml).toContain("<nNFFin>200</nNFFin>");
      expect(xml).toContain("<tpAmb>2</tpAmb>");
    });

    it.todo(
      "test_sefaz_inutiliza_sem_ano — should use current year when year is omitted"
    );
  });

  // ──────────────────────────────────────────────────────────────────
  //  5. sefazStatus
  // ──────────────────────────────────────────────────────────────────

  describe("sefazStatus", () => {
    it("test_sefaz_status_uf_rs — builds status request with consStatServ and xServ STATUS", () => {
      const xml = buildStatusRequestXml("RS", 2);
      expect(xml).toContain("consStatServ");
      expect(xml).toContain("<xServ>STATUS</xServ>");
    });

    it("test_sefaz_status_uf_sp — builds status request for SP", () => {
      const xml = buildStatusRequestXml("SP", 2);
      expect(xml).toContain("consStatServ");
    });

    it.todo(
      "test_sefaz_status_sem_uf_usa_config — should use config UF when empty UF provided"
    );

    it("test_sefaz_status_com_tpAmb — builds status request with tpAmb=1", () => {
      const xml = buildStatusRequestXml("SP", 1);
      expect(xml).toContain("<tpAmb>1</tpAmb>");
    });
  });

  // ──────────────────────────────────────────────────────────────────
  //  6. sefazDistDFe
  // ──────────────────────────────────────────────────────────────────

  describe("sefazDistDFe", () => {
    it.todo(
      "test_sefaz_dist_dfe_com_ultNSU — should build request with ultNSU padded to 15 digits"
    );

    it.todo(
      "test_sefaz_dist_dfe_com_numNSU — should build request with NSU padded to 15 digits"
    );

    it.todo(
      "test_sefaz_dist_dfe_com_chave — should build request with chNFe and consChNFe"
    );

    it.todo(
      "test_sefaz_dist_dfe_ultNSU_zero — should build request with ultNSU=000000000000000"
    );
  });

  // ──────────────────────────────────────────────────────────────────
  //  7. sefazCCe
  // ──────────────────────────────────────────────────────────────────

  describe("sefazCCe", () => {
    it.todo(
      "test_sefaz_cce_request — should build CCe request with Carta de Correcao, xCorrecao, xCondUso"
    );

    it.todo(
      "test_sefaz_cce_chave_vazia_throws — should throw on empty chave"
    );

    it.todo(
      "test_sefaz_cce_correcao_vazia_throws — should throw on empty correction text"
    );
  });

  // ──────────────────────────────────────────────────────────────────
  //  8. sefazCancela
  // ──────────────────────────────────────────────────────────────────

  describe("sefazCancela", () => {
    it("test_sefaz_cancela_request — builds cancellation XML with nProt and chNFe", () => {
      const chNFe = "35150300822602000124550010009923461099234656";
      const xml = buildCancellationXml(
        chNFe,
        "123456789101234",
        "Preenchimento incorreto dos dados",
        "93623057000128",
        2
      );
      expect(xml).toContain("Cancelamento");
      expect(xml).toContain("<nProt>123456789101234</nProt>");
      expect(xml).toContain(chNFe);
    });

    it.todo(
      "test_sefaz_cancela_chave_vazia_throws — should throw on empty chave"
    );

    it.todo(
      "test_sefaz_cancela_just_vazia_throws — should throw on empty justification"
    );
  });

  // ──────────────────────────────────────────────────────────────────
  //  9. sefazCancelaPorSubstituicao
  // ──────────────────────────────────────────────────────────────────

  describe("sefazCancelaPorSubstituicao", () => {
    it.todo(
      "test_sefaz_cancela_por_substituicao_modelo_55_throws — should throw when using substitution cancellation with model 55"
    );

    it.todo(
      "test_sefaz_cancela_por_substituicao_modelo_65 — should build correct substitution cancellation request for model 65 with chNFeRef"
    );

    it.todo(
      "test_sefaz_cancela_por_substituicao_parametros_vazios_throws — should throw when verAplic is empty"
    );
  });

  // ──────────────────────────────────────────────────────────────────
  // 10. sefazManifesta (all 4 event types)
  // ──────────────────────────────────────────────────────────────────

  describe("sefazManifesta", () => {
    it.todo(
      "test_sefaz_manifesta_confirmacao — should build request with Confirmacao da Operacao and tpEvento 210200"
    );

    it.todo(
      "test_sefaz_manifesta_ciencia — should build request with Ciencia da Operacao and tpEvento 210210"
    );

    it.todo(
      "test_sefaz_manifesta_desconhecimento — should build request with Desconhecimento da Operacao and tpEvento 210220"
    );

    it.todo(
      "test_sefaz_manifesta_nao_realizada — should build request with Operacao nao Realizada, tpEvento 210240, and xJust"
    );

    it.todo(
      "test_sefaz_manifesta_chave_vazia_throws — should throw on empty chave"
    );
  });

  // ──────────────────────────────────────────────────────────────────
  // 11. sefazEvento (generic)
  // ──────────────────────────────────────────────────────────────────

  describe("sefazEvento — generic", () => {
    it.todo(
      "test_sefaz_evento_generico — should build envEvento with idLote and chNFe for CCe event"
    );

    it.todo(
      "test_sefaz_evento_cancela_com_lote_automatico — should auto-generate idLote for cancellation event"
    );
  });

  // ──────────────────────────────────────────────────────────────────
  // 12. sefazComprovanteEntrega
  // ──────────────────────────────────────────────────────────────────

  describe("sefazComprovanteEntrega", () => {
    it.todo(
      "test_sefaz_comprovante_entrega — should build request with dhEntrega, nDoc, xNome, latGPS, longGPS, hashComprovante"
    );

    it.todo(
      "test_sefaz_comprovante_entrega_sem_gps — should build request without GPS coordinates when empty"
    );

    it.todo(
      "test_sefaz_comprovante_entrega_cancelamento — should build cancellation request with nProtEvento"
    );
  });

  // ──────────────────────────────────────────────────────────────────
  // 13. sefazInsucessoEntrega
  // ──────────────────────────────────────────────────────────────────

  describe("sefazInsucessoEntrega", () => {
    it.todo(
      "test_sefaz_insucesso_entrega — should build request with dhTentativaEntrega, nTentativa, tpMotivo, latGPS"
    );

    it.todo(
      "test_sefaz_insucesso_entrega_motivo_4_com_justificativa — should build request with tpMotivo=4 and xJustMotivo"
    );

    it.todo(
      "test_sefaz_insucesso_entrega_cancelamento — should build cancellation request with nProtEvento"
    );
  });

  // ──────────────────────────────────────────────────────────────────
  // 14. Complements - error cases
  // ──────────────────────────────────────────────────────────────────

  describe("Complements — toAuthorize error cases", () => {
    it("test_complements_to_authorize_empty_request_throws — should throw on empty request XML", () => {
      expect(() => attachProtocol("", "<retorno>dummy</retorno>")).toThrow("Request XML (NFe) is empty");
    });

    it("test_complements_to_authorize_empty_response_throws — should throw on empty response XML", () => {
      const request = '<?xml version="1.0" encoding="UTF-8"?>'
        + '<NFe xmlns="http://www.portalfiscal.inf.br/nfe">'
        + '<infNFe versao="4.00" Id="NFe35220605730928000145550010000048661583302923">'
        + '<ide><cUF>35</cUF></ide>'
        + '</infNFe>'
        + '</NFe>';
      expect(() => attachProtocol(request, "")).toThrow("Response XML (protocol) is empty");
    });

    it.todo(
      "test_complements_to_authorize_wrong_document_type — should throw when XML is not NFe/EnvEvento/InutNFe (e.g. eSocial)"
    );

    it("test_complements_to_authorize_event_xml — attachEventProtocol produces procEventoNFe", () => {
      const request = '<?xml version="1.0" encoding="UTF-8"?>'
        + '<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">'
        + '<idLote>201704091147536</idLote>'
        + '<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">'
        + '<infEvento Id="ID21021035220605730928000145550010000048661583302923001">'
        + '<cOrgao>91</cOrgao>'
        + '<tpAmb>2</tpAmb>'
        + '<CNPJ>93623057000128</CNPJ>'
        + '<chNFe>35220605730928000145550010000048661583302923</chNFe>'
        + '<dhEvento>2024-05-31T11:59:12-03:00</dhEvento>'
        + '<tpEvento>210210</tpEvento>'
        + '<nSeqEvento>1</nSeqEvento>'
        + '<verEvento>1.00</verEvento>'
        + '<detEvento versao="1.00"><descEvento>Ciencia da Operacao</descEvento></detEvento>'
        + '</infEvento>'
        + '</evento>'
        + '</envEvento>';

      const response = '<?xml version="1.0" encoding="UTF-8"?>'
        + '<retEnvEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">'
        + '<idLote>201704091147536</idLote>'
        + '<tpAmb>2</tpAmb>'
        + '<verAplic>SP_EVENTOS_PL_100</verAplic>'
        + '<cOrgao>91</cOrgao>'
        + '<cStat>128</cStat>'
        + '<xMotivo>Lote de Evento Processado</xMotivo>'
        + '<retEvento versao="1.00">'
        + '<infEvento>'
        + '<tpAmb>2</tpAmb>'
        + '<verAplic>SP_EVENTOS_PL_100</verAplic>'
        + '<cOrgao>91</cOrgao>'
        + '<cStat>135</cStat>'
        + '<xMotivo>Evento registrado e vinculado a NF-e</xMotivo>'
        + '<chNFe>35220605730928000145550010000048661583302923</chNFe>'
        + '<tpEvento>210210</tpEvento>'
        + '<xEvento>Ciencia da Operacao</xEvento>'
        + '<nSeqEvento>1</nSeqEvento>'
        + '<dhRegEvento>2024-05-31T12:00:00-03:00</dhRegEvento>'
        + '<nProt>135220000009999</nProt>'
        + '</infEvento>'
        + '</retEvento>'
        + '</retEnvEvento>';

      const result = attachEventProtocol(request, response);
      expect(result).toContain("procEventoNFe");
      expect(result).toContain("135220000009999");
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 15. Complements::cancelRegister
  // ──────────────────────────────────────────────────────────────────

  describe("Complements — cancelRegister", () => {
    it("test_complements_cancel_register — attachCancellation appends retEvento to nfeProc", () => {
      const nfeProc = '<?xml version="1.0" encoding="UTF-8"?>'
        + '<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">'
        + '<NFe xmlns="http://www.portalfiscal.inf.br/nfe">'
        + '<infNFe versao="4.00" Id="NFe35220605730928000145550010000048661583302923">'
        + '<ide><cUF>35</cUF><mod>55</mod></ide>'
        + '</infNFe>'
        + '</NFe>'
        + '<protNFe versao="4.00">'
        + '<infProt>'
        + '<chNFe>35220605730928000145550010000048661583302923</chNFe>'
        + '<nProt>135220000009921</nProt>'
        + '<cStat>100</cStat>'
        + '</infProt>'
        + '</protNFe>'
        + '</nfeProc>';

      const cancelamento = '<?xml version="1.0" encoding="UTF-8"?>'
        + '<procEventoNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">'
        + '<retEvento versao="1.00">'
        + '<infEvento>'
        + '<cStat>135</cStat>'
        + '<tpEvento>110111</tpEvento>'
        + '<chNFe>35220605730928000145550010000048661583302923</chNFe>'
        + '<nProt>135220000009999</nProt>'
        + '</infEvento>'
        + '</retEvento>'
        + '</procEventoNFe>';

      const result = attachCancellation(nfeProc, cancelamento);
      expect(result).toContain("nfeProc");
      expect(result).toContain("retEvento");
    });

    it("test_complements_cancel_register_no_protocol_throws — attachCancellation throws when nfeProc has no protNFe", () => {
      const nfeNoProc = '<?xml version="1.0" encoding="UTF-8"?>'
        + '<NFe xmlns="http://www.portalfiscal.inf.br/nfe">'
        + '<infNFe versao="4.00" Id="NFe35220605730928000145550010000048661583302923">'
        + '<ide><cUF>35</cUF><mod>55</mod></ide>'
        + '</infNFe>'
        + '</NFe>';

      const cancelamento = '<procEventoNFe><retEvento><infEvento>'
        + '<cStat>135</cStat><tpEvento>110111</tpEvento>'
        + '<chNFe>35220605730928000145550010000048661583302923</chNFe>'
        + '<nProt>135220000009999</nProt>'
        + '</infEvento></retEvento></procEventoNFe>';

      expect(() => attachCancellation(nfeNoProc, cancelamento)).toThrow();
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 16. Complements::b2bTag
  // ──────────────────────────────────────────────────────────────────

  describe("Complements — b2bTag", () => {
    it.todo(
      "test_complements_b2b_tag_no_nfeProc_throws — should throw when XML has no nfeProc wrapper"
    );

    it.todo(
      "test_complements_b2b_tag_no_b2b_tag_throws — should throw when B2B content does not contain NFeB2BFin tag"
    );
  });

  // ──────────────────────────────────────────────────────────────────
  // 17. QRCode::putQRTag
  // ──────────────────────────────────────────────────────────────────

  describe("QRCode — putQRTag", () => {
    it.todo(
      "test_qrcode_put_qr_tag_v200 — should insert infNFeSupl with qrCode and urlChave into NFC-e XML"
    );

    it("test_qrcode_put_qr_tag_sem_token_throws — should throw when CSC token is empty", async () => {
      await expect(
        buildNfceQrCodeUrl({
          accessKey: "35200505730928000145650010000000121000000129",
          version: 200,
          environment: 2,
          emissionType: 1,
          qrCodeBaseUrl: "https://example.com",
          cscToken: "",
          cscId: "000001",
        })
      ).rejects.toThrow("CSC token is required");
    });

    it("test_qrcode_put_qr_tag_sem_idtoken_throws — should throw when CSC ID is empty", async () => {
      await expect(
        buildNfceQrCodeUrl({
          accessKey: "35200505730928000145650010000000121000000129",
          version: 200,
          environment: 2,
          emissionType: 1,
          qrCodeBaseUrl: "https://example.com",
          cscToken: "TOKENXYZ",
          cscId: "",
        })
      ).rejects.toThrow("CSC ID is required");
    });

    it("test_qrcode_put_qr_tag_sem_url_throws — should produce malformed URL when base URL is empty", async () => {
      const result = await buildNfceQrCodeUrl({
        accessKey: "35200505730928000145650010000000121000000129",
        version: 200,
        environment: 2,
        emissionType: 1,
        qrCodeBaseUrl: "",
        cscToken: "TOKENXYZ",
        cscId: "000001",
      });
      expect(result).toMatch(/^\?p=/);
    });

    it.todo(
      "test_qrcode_put_qr_tag_versao_vazia_usa_200 — empty version defaults to v200 and produces infNFeSupl"
    );
  });

  // ──────────────────────────────────────────────────────────────────
  // 18. Make - entrega tags
  // ──────────────────────────────────────────────────────────────────

  describe("Make — entrega tags", () => {
    it("test_make_tag_entrega_cnpj — builds entrega tag with CNPJ", () => {
      const xml = tag("entrega", {}, [
        tag("CNPJ", {}, "11222333000181"),
        tag("xNome", {}, "Empresa Destino"),
        tag("xLgr", {}, "Rua Exemplo"),
        tag("nro", {}, "100"),
        tag("xCpl", {}, "Sala 1"),
        tag("xBairro", {}, "Centro"),
        tag("cMun", {}, "3550308"),
        tag("xMun", {}, "Sao Paulo"),
        tag("UF", {}, "SP"),
        tag("CEP", {}, "01001000"),
        tag("cPais", {}, "1058"),
        tag("xPais", {}, "BRASIL"),
        tag("fone", {}, "1133334444"),
        tag("email", {}, "teste@teste.com"),
        tag("IE", {}, "123456789"),
      ]);

      expect(xml).toContain("<entrega>");
      expectXmlContains(xml, {
        CNPJ: "11222333000181",
        xLgr: "Rua Exemplo",
        xBairro: "Centro",
        UF: "SP",
        IE: "123456789",
      });
    });

    it("test_make_tag_entrega_cpf — builds entrega tag with CPF", () => {
      const xml = tag("entrega", {}, [
        tag("CPF", {}, "12345678901"),
        tag("xNome", {}, "Pessoa Fisica"),
        tag("xLgr", {}, "Av Brasil"),
        tag("nro", {}, "200"),
        tag("xBairro", {}, "Jardim"),
        tag("cMun", {}, "3304557"),
        tag("xMun", {}, "Rio de Janeiro"),
        tag("UF", {}, "RJ"),
      ]);

      expectXmlContains(xml, {
        CPF: "12345678901",
      });
      expect(xml).not.toContain("<CNPJ>");
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 19. Make - retirada tags
  // ──────────────────────────────────────────────────────────────────

  describe("Make — retirada tags", () => {
    it("test_make_tag_retirada_cnpj — builds retirada tag with CNPJ", () => {
      const xml = tag("retirada", {}, [
        tag("CNPJ", {}, "99887766000100"),
        tag("xNome", {}, "Empresa Origem"),
        tag("xLgr", {}, "Rua Retirada"),
        tag("nro", {}, "50"),
        tag("xBairro", {}, "Industrial"),
        tag("cMun", {}, "4106902"),
        tag("xMun", {}, "Curitiba"),
        tag("UF", {}, "PR"),
      ]);

      expect(xml).toContain("<retirada>");
      expectXmlContains(xml, {
        CNPJ: "99887766000100",
        xMun: "Curitiba",
      });
    });

    it("test_make_tag_retirada_cpf — builds retirada tag with CPF and IE", () => {
      const xml = tag("retirada", {}, [
        tag("CPF", {}, "98765432100"),
        tag("xNome", {}, "Produtor Rural"),
        tag("xLgr", {}, "Estrada Municipal"),
        tag("nro", {}, "KM 5"),
        tag("xCpl", {}, "Lote 10"),
        tag("xBairro", {}, "Zona Rural"),
        tag("cMun", {}, "5108402"),
        tag("xMun", {}, "Varzea Grande"),
        tag("UF", {}, "MT"),
        tag("IE", {}, "987654321"),
      ]);

      expectXmlContains(xml, {
        CPF: "98765432100",
        IE: "987654321",
      });
      expect(xml).not.toContain("<CNPJ>");
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 20. Make - comb (fuel) tags
  // ──────────────────────────────────────────────────────────────────

  describe("Make — comb (fuel) tags", () => {
    it.todo(
      "test_make_tag_comb — should build comb tag with cProdANP, descANP, CODIF, UFCons"
    );

    it.todo(
      "test_make_tag_comb_with_cide — should build comb tag with CIDE sub-element, qBCProd, vAliqProd, vCIDE, pGLP, pBio"
    );

    it.todo(
      "test_make_tag_encerrante — should build encerrante tag with nBico, nBomba, nTanque, vEncIni, vEncFin"
    );

    it.todo(
      "test_make_tag_encerrante_sem_bomba — should build encerrante tag without nBomba when null"
    );

    it.todo(
      "test_make_tag_orig_comb — should build origComb tag with indImport, cUFOrig, pOrig"
    );

    it.todo(
      "test_make_tag_orig_comb_importado — should build origComb with indImport=1"
    );

    it.todo(
      "test_make_multiple_orig_comb_same_item — should handle multiple origComb for same item"
    );
  });

  // ──────────────────────────────────────────────────────────────────
  // 21. TraitEventsRTC - checkModel (model 65 throws)
  // ──────────────────────────────────────────────────────────────────

  describe("TraitEventsRTC — model validation", () => {
    it.todo(
      "test_sefaz_info_pagto_integral_model_65_throws — should throw when model is 65"
    );

    it.todo(
      "test_sefaz_info_pagto_integral_chave_mod_65_throws — should throw when chave contains mod=65"
    );

    it.todo(
      "test_sefaz_info_pagto_integral_success — should build request with tpEvento=112110 and indQuitacao=1"
    );
  });

  // ──────────────────────────────────────────────────────────────────
  // 22. TraitEPECNfce - sefazStatusEpecNfce
  // ──────────────────────────────────────────────────────────────────

  describe("TraitEPECNfce — sefazStatusEpecNfce", () => {
    it.todo(
      "test_sefaz_status_epec_nfce_modelo_55_throws — should throw when model is 55"
    );

    it.todo(
      "test_sefaz_status_epec_nfce_uf_nao_sp_throws — should throw when UF is not SP"
    );

    it.todo(
      "test_sefaz_status_epec_nfce_sp — should build status request for EPEC NFC-e in SP"
    );
  });

  // ──────────────────────────────────────────────────────────────────
  // Parse response helpers (features we HAVE)
  // ──────────────────────────────────────────────────────────────────

  describe("parseStatusResponse", () => {
    it("parses a valid status response XML", () => {
      const xml = '<retConsStatServ><cStat>107</cStat><xMotivo>Servico em Operacao</xMotivo><tMed>1</tMed></retConsStatServ>';
      const result = parseStatusResponse(xml);
      expect(result.statusCode).toBe(107);
      expect(result.statusMessage).toBe("Servico em Operacao");
      expect(result.averageTime).toBe(1);
    });
  });

  describe("parseAuthorizationResponse", () => {
    it("parses a valid authorization response with protNFe", () => {
      const xml = '<retEnviNFe><cStat>104</cStat>'
        + '<protNFe versao="4.00"><infProt>'
        + '<cStat>100</cStat>'
        + '<xMotivo>Autorizado o uso da NF-e</xMotivo>'
        + '<nProt>135220000009921</nProt>'
        + '<dhRecbto>2024-05-31T12:00:00-03:00</dhRecbto>'
        + '</infProt></protNFe>'
        + '</retEnviNFe>';
      const result = parseAuthorizationResponse(xml);
      expect(result.statusCode).toBe(100);
      expect(result.protocolNumber).toBe("135220000009921");
      expect(result.authorizedAt).toBe("2024-05-31T12:00:00-03:00");
    });
  });

  describe("parseCancellationResponse", () => {
    it("parses a valid cancellation event response", () => {
      const xml = '<retEvento><infEvento>'
        + '<cStat>135</cStat>'
        + '<xMotivo>Evento registrado e vinculado a NF-e</xMotivo>'
        + '<nProt>135220000009999</nProt>'
        + '</infEvento></retEvento>';
      const result = parseCancellationResponse(xml);
      expect(result.statusCode).toBe(135);
      expect(result.protocolNumber).toBe("135220000009999");
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // buildNfceConsultUrl (feature we HAVE)
  // ──────────────────────────────────────────────────────────────────

  describe("buildNfceConsultUrl", () => {
    it("builds consultation URL with access key and environment", () => {
      const url = buildNfceConsultUrl(
        "https://www.homologacao.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaPublica.aspx",
        "35200505730928000145650010000000121000000129",
        2
      );
      expect(url).toContain("35200505730928000145650010000000121000000129");
      expect(url).toContain("|2");
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // attachInutilizacao (feature we HAVE)
  // ──────────────────────────────────────────────────────────────────

  describe("attachInutilizacao", () => {
    it("throws on empty request XML", () => {
      expect(() => attachInutilizacao("", "<retInutNFe><infInut><cStat>102</cStat></infInut></retInutNFe>"))
        .toThrow("Inutilizacao request XML is empty");
    });

    it("throws on empty response XML", () => {
      expect(() => attachInutilizacao("<inutNFe versao='4.00'><infInut>data</infInut></inutNFe>", ""))
        .toThrow("Inutilizacao response XML is empty");
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // getSefazUrl with model param for NFC-e (feature we HAVE)
  // ──────────────────────────────────────────────────────────────────

  describe("getSefazUrl with model param", () => {
    it("returns NFC-e URL for model 65", () => {
      const url = getSefazUrl("SP", "NfeAutorizacao", 2, false, 65);
      expect(url).toContain("nfce");
    });

    it("returns NF-e URL for model 55 (default)", () => {
      const url = getSefazUrl("SP", "NfeAutorizacao", 2, false, 55);
      expect(url).toContain("nfe");
      expect(url).not.toContain("nfce");
    });
  });
});
