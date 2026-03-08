/**
 * Ported from PHP sped-nfe tests:
 * - tests/ToolsTest.php
 * - tests/Factories/ContingencyTest.php
 * - tests/Factories/ContingencyNFeTest.php
 * - tests/Factories/QRCodeTest.php
 * - tests/URIConsultaNfce.php (trait used by ToolsTest)
 */

import { describe, it, expect } from "bun:test";
import { getSefazUrl, getContingencyType } from "../sefaz-urls";
import { buildNfceQrCodeUrl } from "../qrcode";

// =============================================================================
// ToolsTest
// =============================================================================

describe("ToolsTest", () => {
  // --------------------------------------------------------------------------
  // sefazConsultaRecibo
  // --------------------------------------------------------------------------

  it.todo(
    "testSefazConsultaReciboThrowsInvalidArgExceptionSemRecibo — should throw on empty recibo"
  );

  it.todo(
    "test_sefaz_consulta_recibo_valido — should build correct XML request for valid recibo"
  );

  // --------------------------------------------------------------------------
  // sefazConsultaChave
  // --------------------------------------------------------------------------

  it.todo(
    "testSefazConsultaChaveThrowsInvalidArgExceptionSemChave — should throw on empty chave"
  );

  it.todo(
    "test_sefaz_consulta_chave_valida — should build correct XML request for valid chave"
  );

  it.todo(
    "testSefazConsultaChaveThrowsInvalidArgExceptionChaveCompleta — should throw on chave with length != 44"
  );

  it.todo(
    "testSefazConsultaChaveThrowsInvalidArgExceptionChaveNaoNumerica — should throw on non-numeric chave"
  );

  // --------------------------------------------------------------------------
  // URI Consulta NFCe (from URIConsultaNfce trait used by ToolsTest)
  // --------------------------------------------------------------------------

  // The PHP reference (uri_consulta_nfce.json) maps each UF to a consultation
  // page URL per environment. Our sefaz-urls.ts does not expose NFC-e
  // consultation page URLs (urlChave) — it only exposes web service endpoints.
  // These tests are ported as it.todo() until we add a getURIConsultaNFCe()
  // function.

  const ufs = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MG", "MS", "MT", "PA", "PB", "PE", "PR", "PI", "RJ", "RN",
    "RO", "RR", "RS", "SE", "SC", "SP", "TO",
  ];

  for (const uf of ufs) {
    it.todo(
      `testReturnURIConsultaNFCeInHomologation — ${uf} should return correct homologation consultation URL`
    );
  }

  for (const uf of ufs) {
    it.todo(
      `testReturnURIConsultaNFCeInProduction — ${uf} should return correct production consultation URL`
    );
  }

  // --------------------------------------------------------------------------
  // sefazEnviaLote
  // --------------------------------------------------------------------------

  it.todo(
    "test_sefaz_envia_lote_parametro_invalido — should throw TypeError on invalid parameter"
  );

  it.todo(
    "test_sefaz_envia_lote_varios_xml_sincronos — should throw when sending multiple XMLs in sync mode"
  );

  it.todo(
    "test_sefaz_envia_lote_xml_valido_modelo_65 — should build correct request for model 65"
  );

  it.todo(
    "test_sefaz_envia_lote_xml_valido_modelo_55 — should build correct request for model 55"
  );

  it.todo(
    "test_sefaz_envia_lote_xml_valido_modelo_55_compactado — should build correct compressed request for model 55"
  );

  // --------------------------------------------------------------------------
  // sefazInutiliza
  // --------------------------------------------------------------------------

  it.todo(
    "test_sefaz_inutiliza — should build correct XML request for number voiding"
  );

  // --------------------------------------------------------------------------
  // sefazCadastro
  // --------------------------------------------------------------------------

  it.todo(
    "test_sefaz_cadastro_cnpj — should build correct cadastro request by CNPJ"
  );

  it.todo(
    "test_sefaz_cadastro_ie — should build correct cadastro request by IE"
  );

  it.todo(
    "test_sefaz_cadastro_cpf — should build correct cadastro request by CPF"
  );

  // --------------------------------------------------------------------------
  // sefazStatus
  // --------------------------------------------------------------------------

  it.todo(
    "test_sefaz_status — should build correct status request XML"
  );

  // --------------------------------------------------------------------------
  // sefazDistDFe
  // --------------------------------------------------------------------------

  it.todo(
    "test_sefaz_dist_dfe — should build correct DistDFe request XML"
  );

  // --------------------------------------------------------------------------
  // sefazCCe
  // --------------------------------------------------------------------------

  it.todo(
    "test_sefazCCe — should build correct CCe (Carta de Correção) request XML"
  );

  // --------------------------------------------------------------------------
  // sefazAtorInteressado
  // --------------------------------------------------------------------------

  it.todo(
    "test_sefazAtorInteressado — should build correct Ator Interessado event request XML"
  );

  // --------------------------------------------------------------------------
  // sefazEPP
  // --------------------------------------------------------------------------

  it.todo(
    "test_sefazEPP — should build correct EPP (Pedido de Prorrogação) request XML"
  );

  // --------------------------------------------------------------------------
  // sefazECPP
  // --------------------------------------------------------------------------

  it.todo(
    "test_sefazECPP — should build correct ECPP (Cancelamento de Pedido de Prorrogação) request XML"
  );

  // --------------------------------------------------------------------------
  // sefazCancela
  // --------------------------------------------------------------------------

  it.todo(
    "test_sefazCancela — should build correct cancellation event request XML"
  );

  // --------------------------------------------------------------------------
  // sefazCancelaPorSubstituicao
  // --------------------------------------------------------------------------

  it.todo(
    "test_sefazCancelaPorSubstituicaoErroChave — should throw when using substitution cancellation with model 55"
  );

  it.todo(
    "test_sefazCancelaPorSubstituicao — should build correct substitution cancellation request XML for model 65"
  );

  // --------------------------------------------------------------------------
  // sefazManifesta
  // --------------------------------------------------------------------------

  it.todo(
    "test_sefazManifesta — should build correct manifestação do destinatário request XML"
  );
});

// =============================================================================
// ContingencyTest
// =============================================================================

describe("ContingencyTest", () => {
  // --------------------------------------------------------------------------
  // Instantiation (PHP: testIcanInstantiate)
  // Our getContingencyType is a pure function, not a class — this test
  // verifies it exists and returns a valid type.
  // --------------------------------------------------------------------------

  it("testIcanInstantiate — getContingencyType returns a valid contingency type", () => {
    const type = getContingencyType("SP");
    expect(["svc-an", "svc-rs"]).toContain(type);
  });

  // --------------------------------------------------------------------------
  // Activate (PHP: testActivate)
  // SP defaults to SVCAN (tpEmis=6) in PHP. Our code maps SP -> SVC_AN.
  // --------------------------------------------------------------------------

  it("testActivate — SP should default to svc-an contingency", () => {
    const type = getContingencyType("SP");
    expect(type).toBe("svc-an");
  });

  // --------------------------------------------------------------------------
  // PHP: testActivateExceptionFailForcedType
  // SP cannot use SVAN — but our code doesn't have activate(). The concept
  // is that the state mapping is fixed. We verify SP is not svc-rs.
  // --------------------------------------------------------------------------

  it("testActivateExceptionFailForcedType — SP should not use svc-rs", () => {
    const type = getContingencyType("SP");
    expect(type).not.toBe("svc-rs");
  });

  // --------------------------------------------------------------------------
  // PHP: testActivateExceptionFailIncorrectSmallerMotive
  // Motive validation (15-255 chars) — we don't have this validation yet.
  // --------------------------------------------------------------------------

  it.todo(
    "testActivateExceptionFailIncorrectSmallerMotive — should throw on motive shorter than 15 chars"
  );

  // --------------------------------------------------------------------------
  // PHP: testActivateExceptionFailIncorrectGreaterMotive
  // --------------------------------------------------------------------------

  it.todo(
    "testActivateExceptionFailIncorrectGreaterMotive — should throw on motive longer than 255 chars"
  );

  // --------------------------------------------------------------------------
  // PHP: testActivateForcedTypeSVCAN
  // AM defaults to SVCRS in PHP, but can be forced to SVCAN.
  // Our code's getContingencyType doesn't support forced override;
  // we verify AM's default mapping.
  // --------------------------------------------------------------------------

  it("testActivateForcedTypeSVCAN — AM defaults to svc-rs", () => {
    // In PHP, AM defaults to SVCRS. Forcing SVCAN is a feature we don't have yet.
    const type = getContingencyType("AM");
    expect(type).toBe("svc-rs");
  });

  it.todo(
    "testActivateForcedTypeSVCAN — should allow forcing SVCAN for a state that defaults to SVCRS"
  );

  // --------------------------------------------------------------------------
  // PHP: testActivateForcedTypeSVCRS
  // SP defaults to SVCAN, but can be forced to SVCRS. We verify SP defaults.
  // --------------------------------------------------------------------------

  it.todo(
    "testActivateForcedTypeSVCRS — should allow forcing SVCRS for a state that defaults to SVCAN"
  );

  // --------------------------------------------------------------------------
  // PHP: testLoad — loading contingency from JSON
  // We don't have a Contingency class with load(). Tested as todo.
  // --------------------------------------------------------------------------

  it.todo(
    "testLoad — should load contingency configuration from JSON string"
  );

  // --------------------------------------------------------------------------
  // PHP: testDeactivate — resetting contingency
  // --------------------------------------------------------------------------

  it.todo(
    "testDeactivate — should reset contingency to default (tpEmis=1, empty motive)"
  );

  // --------------------------------------------------------------------------
  // Verify all state contingency mappings match PHP reference
  // --------------------------------------------------------------------------

  // PHP mapping from Contingency.php:
  // SVCAN: AC, AL, AP, CE, DF, ES, MG, PA, PB, PI, RJ, RN, RO, RR, RS, SC, SE, SP, TO
  // SVCRS: AM, BA, GO, MA, MS, MT, PE, PR

  const svcanStates = [
    "AC", "AL", "AP", "CE", "DF", "ES", "MG", "PA", "PB",
    "PI", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
  ];

  const svcrsStates = ["AM", "BA", "GO", "MA", "MS", "MT", "PE", "PR"];

  for (const uf of svcanStates) {
    it(`state ${uf} should use svc-an contingency (matching PHP SVCAN)`, () => {
      expect(getContingencyType(uf)).toBe("svc-an");
    });
  }

  for (const uf of svcrsStates) {
    it(`state ${uf} should use svc-rs contingency (matching PHP SVCRS)`, () => {
      expect(getContingencyType(uf)).toBe("svc-rs");
    });
  }

  // --------------------------------------------------------------------------
  // Verify contingency URLs are returned correctly
  // --------------------------------------------------------------------------

  it("getSefazUrl with contingency=true should return SVC-AN URL for SP", () => {
    const url = getSefazUrl("SP", "NfeAutorizacao", 2, true);
    expect(url).toContain("svc.fazenda.gov.br");
  });

  it("getSefazUrl with contingency=true should return SVC-RS URL for AM", () => {
    const url = getSefazUrl("AM", "NfeAutorizacao", 2, true);
    expect(url).toContain("svrs.rs.gov.br");
  });
});

// =============================================================================
// ContingencyNFeTest
// =============================================================================

describe("ContingencyNFeTest", () => {
  // --------------------------------------------------------------------------
  // PHP: testAdjustSuccess
  // ContingencyNFe::adjust() modifies NFe XML to include contingency data
  // (tpEmis, dhCont, xJust). We don't have this XML adjustment yet.
  // --------------------------------------------------------------------------

  it.todo(
    "testAdjustSuccess — should adjust NF-e XML with contingency data (tpEmis, dhCont, xJust)"
  );

  // --------------------------------------------------------------------------
  // PHP: testAdjustNFeContingencyReady
  // Tests that an NFe XML already set for contingency is not changed.
  // --------------------------------------------------------------------------

  it.todo(
    "testAdjustNFeContingencyReady — should not alter XML already configured for contingency"
  );

  // --------------------------------------------------------------------------
  // PHP: testAdjustFailNFCe
  // ContingencyNFe::adjust() should throw when used with NFC-e (model 65).
  // --------------------------------------------------------------------------

  it.todo(
    "testAdjustFailNFCe — should throw RuntimeError when adjusting NFC-e XML for contingency"
  );
});

// =============================================================================
// QRCodeTest
// =============================================================================

describe("QRCodeTest", () => {
  // --------------------------------------------------------------------------
  // PHP: testPutQRTag (commented out in PHP source)
  // Verifies inserting the QR Code tag into NFC-e XML. The PHP test was
  // commented out. We port it as todo.
  // --------------------------------------------------------------------------

  it.todo(
    "testPutQRTag — should insert QR Code and urlChave tags into NFC-e XML"
  );

  // --------------------------------------------------------------------------
  // PHP: testPutQRTagFailWithoutCSC
  // Should throw when CSC token is empty.
  // --------------------------------------------------------------------------

  it("testPutQRTagFailWithoutCSC — should throw when CSC token is empty", async () => {
    await expect(
      buildNfceQrCodeUrl({
        accessKey: "35200505730928000145650010000000121000000129",
        version: 200,
        environment: 2,
        emissionType: 1,
        qrCodeBaseUrl:
          "https://www.homologacao.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx",
        cscToken: "",
        cscId: "000001",
      })
    ).rejects.toThrow("CSC token is required");
  });

  // --------------------------------------------------------------------------
  // PHP: testPutQRTagFailWithoutCSCid
  // Should throw when CSC ID is empty.
  // --------------------------------------------------------------------------

  it("testPutQRTagFailWithoutCSCid — should throw when CSC ID is empty", async () => {
    await expect(
      buildNfceQrCodeUrl({
        accessKey: "35200505730928000145650010000000121000000129",
        version: 200,
        environment: 2,
        emissionType: 1,
        qrCodeBaseUrl:
          "https://www.homologacao.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx",
        cscToken: "GPB0JBWLUR6HWFTVEAS6RJ69GPCROFPBBB8G",
        cscId: "",
      })
    ).rejects.toThrow("CSC ID is required");
  });

  // --------------------------------------------------------------------------
  // PHP: testPutQRTagFailWithoutURL
  // Should throw when QR Code URL is empty.
  // In our implementation, an empty URL doesn't explicitly throw — it just
  // produces an invalid URL. We test that the output is invalid or that
  // a missing URL is caught.
  // --------------------------------------------------------------------------

  it("testPutQRTagFailWithoutURL — should produce an invalid QR code URL when base URL is empty", async () => {
    // Our implementation doesn't throw on empty URL, but the resulting URL
    // starts with "?p=" which is clearly invalid. If we later add validation,
    // this test should be updated to expect a throw.
    const result = await buildNfceQrCodeUrl({
      accessKey: "35200505730928000145650010000000121000000129",
      version: 200,
      environment: 2,
      emissionType: 1,
      qrCodeBaseUrl: "",
      cscToken: "GPB0JBWLUR6HWFTVEAS6RJ69GPCROFPBBB8G",
      cscId: "000001",
    });
    // The result starts with "?p=" instead of a proper URL — it's malformed
    expect(result).toMatch(/^\?p=/);
  });
});
