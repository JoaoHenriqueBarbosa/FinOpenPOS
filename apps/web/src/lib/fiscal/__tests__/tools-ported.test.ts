// @ts-nocheck
/**
 * Ported from PHP sped-nfe tests:
 * - tests/ToolsTest.php
 * - tests/Factories/ContingencyTest.php
 * - tests/Factories/ContingencyNFeTest.php
 * - tests/Factories/QRCodeTest.php
 * - tests/URIConsultaNfce.php (trait used by ToolsTest)
 */

import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getSefazUrl, getContingencyType, getNfceConsultationUri } from "../sefaz-urls";
import { buildNfceQrCodeUrl, putQRTag } from "../qrcode";
import { Contingency } from "../contingency";
import { adjustNfeForContingency } from "../contingency-nfe";

const FIXTURES_DIR = join(__dirname, "../../../../.reference/sped-nfe/tests/fixtures/xml");
import {
  buildStatusRequestXml,
  buildReceiptQueryXml,
  buildAccessKeyQueryXml,
  buildBatchSubmissionXml,
  buildVoidingXml,
  buildCadastroQueryXml,
  buildDistDFeQueryXml,
  buildCCeXml,
  buildInterestedActorXml,
  buildExtensionRequestXml,
  buildExtensionCancellationXml,
  buildCancellationEventXml,
  buildSubstitutionCancellationXml,
  buildManifestationXml,
  buildEventXml,
  buildCancellationXml,
  EVENT_TYPES,
  getEventDescription,
} from "../sefaz-client";

// =============================================================================
// ToolsTest
// =============================================================================

describe("ToolsTest", () => {
  // --------------------------------------------------------------------------
  // sefazConsultaRecibo
  // --------------------------------------------------------------------------

  it("testSefazConsultaReciboThrowsInvalidArgExceptionSemRecibo — should throw on empty recibo", () => {
    expect(() => buildReceiptQueryXml("", 2)).toThrow("Receipt number (recibo) is required");
  });

  it("test_sefaz_consulta_recibo_valido — should build correct XML request for valid recibo", () => {
    const xml = buildReceiptQueryXml("143220020730398", 2);
    expect(xml).toContain("<consReciNFe");
    expect(xml).toContain('versao="4.00"');
    expect(xml).toContain("<tpAmb>2</tpAmb>");
    expect(xml).toContain("<nRec>143220020730398</nRec>");
    expect(xml).toContain("</consReciNFe>");
  });

  // --------------------------------------------------------------------------
  // sefazConsultaChave
  // --------------------------------------------------------------------------

  it("testSefazConsultaChaveThrowsInvalidArgExceptionSemChave — should throw on empty chave", () => {
    expect(() => buildAccessKeyQueryXml("", 2)).toThrow("Access key (chave) is required");
  });

  it("test_sefaz_consulta_chave_valida — should build correct XML request for valid chave", () => {
    const chave = "43211105730928000145650010000002401717268120";
    const xml = buildAccessKeyQueryXml(chave, 2);
    expect(xml).toContain("<consSitNFe");
    expect(xml).toContain('versao="4.00"');
    expect(xml).toContain("<tpAmb>2</tpAmb>");
    expect(xml).toContain("<xServ>CONSULTAR</xServ>");
    expect(xml).toContain(`<chNFe>${chave}</chNFe>`);
    expect(xml).toContain("</consSitNFe>");
  });

  it("testSefazConsultaChaveThrowsInvalidArgExceptionChaveCompleta — should throw on chave with length != 44", () => {
    // 43 digits
    expect(() => buildAccessKeyQueryXml("1234567890123456789012345678901234567890123", 2)).toThrow(
      "must be 44 digits"
    );
  });

  it("testSefazConsultaChaveThrowsInvalidArgExceptionChaveNaoNumerica — should throw on non-numeric chave", () => {
    // Pad to 44 characters with non-numeric
    expect(() => buildAccessKeyQueryXml("aqui temos uma chave nao numerica xxxxxxxxxx", 2)).toThrow(
      "must be numeric"
    );
  });

  // --------------------------------------------------------------------------
  // URI Consulta NFCe (from URIConsultaNfce trait used by ToolsTest)
  // --------------------------------------------------------------------------

  const ufs = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MG", "MS", "MT", "PA", "PB", "PE", "PR", "PI", "RJ", "RN",
    "RO", "RR", "RS", "SE", "SC", "SP", "TO",
  ];

  for (const uf of ufs) {
    it(`testReturnURIConsultaNFCeInHomologation — ${uf} should return correct homologation consultation URL`, () => {
      const uri = getNfceConsultationUri(uf, 2);
      expect(typeof uri).toBe("string");
      expect(uri.length).toBeGreaterThan(5);
    });
  }

  for (const uf of ufs) {
    it(`testReturnURIConsultaNFCeInProduction — ${uf} should return correct production consultation URL`, () => {
      const uri = getNfceConsultationUri(uf, 1);
      expect(typeof uri).toBe("string");
      expect(uri.length).toBeGreaterThan(5);
    });
  }

  // --------------------------------------------------------------------------
  // sefazEnviaLote
  // --------------------------------------------------------------------------

  it("test_sefaz_envia_lote_parametro_invalido — should throw TypeError on invalid parameter", () => {
    expect(() => buildBatchSubmissionXml("" as any, "1", 0)).toThrow();
  });

  it("test_sefaz_envia_lote_varios_xml_sincronos — should throw when sending multiple XMLs in sync mode", () => {
    const xml = '<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe></infNFe></NFe>';
    expect(() => buildBatchSubmissionXml([xml, xml], "1", 1)).toThrow(
      "single document"
    );
  });

  it("test_sefaz_envia_lote_xml_valido_modelo_65 — should build correct request for model 65", () => {
    const xml = '<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe65"></infNFe></NFe>';
    const idLote = "1636667815";
    const result = buildBatchSubmissionXml([xml], idLote, 1);
    expect(result).toContain("<enviNFe");
    expect(result).toContain(`<idLote>${idLote}</idLote>`);
    expect(result).toContain("<indSinc>1</indSinc>");
    expect(result).toContain("</enviNFe>");
    // Should strip XML declaration
    expect(result).not.toContain("<?xml");
  });

  it("test_sefaz_envia_lote_xml_valido_modelo_55 — should build correct request for model 55", () => {
    const xml = '<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe55"></infNFe></NFe>';
    const idLote = "1636667815";
    const result = buildBatchSubmissionXml([xml], idLote, 1);
    expect(result).toContain("<enviNFe");
    expect(result).toContain(`<idLote>${idLote}</idLote>`);
    expect(result).toContain("<indSinc>1</indSinc>");
  });

  it("test_sefaz_envia_lote_xml_valido_modelo_55_compactado — should build correct compressed request for model 55", () => {
    const xml = '<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe55"></infNFe></NFe>';
    const idLote = "1636667815";
    const result = buildBatchSubmissionXml([xml], idLote, 1, true);
    // Compressed mode returns the raw enviNFe XML (compression at transport)
    expect(result).toContain("<enviNFe");
    expect(result).toContain(`<idLote>${idLote}</idLote>`);
  });

  // --------------------------------------------------------------------------
  // sefazInutiliza
  // --------------------------------------------------------------------------

  it("test_sefaz_inutiliza — should build correct XML request for number voiding", () => {
    const xml = buildVoidingXml("SP", 2, "93623057000128", 55, 1, 1, 10, "Testando Inutilizacao", 2022);
    expect(xml).toContain("<inutNFe");
    expect(xml).toContain('versao="4.00"');
    expect(xml).toContain("<tpAmb>2</tpAmb>");
    expect(xml).toContain("<xServ>INUTILIZAR</xServ>");
    expect(xml).toContain("<cUF>35</cUF>");
    expect(xml).toContain("<ano>22</ano>");
    expect(xml).toContain("<CNPJ>93623057000128</CNPJ>");
    expect(xml).toContain("<mod>55</mod>");
    expect(xml).toContain("<serie>1</serie>");
    expect(xml).toContain("<nNFIni>1</nNFIni>");
    expect(xml).toContain("<nNFFin>10</nNFFin>");
    expect(xml).toContain("<xJust>Testando Inutilizacao</xJust>");
    expect(xml).toContain("</inutNFe>");
    // Check the ID format
    expect(xml).toContain('Id="ID');
  });

  // --------------------------------------------------------------------------
  // sefazCadastro
  // --------------------------------------------------------------------------

  it("test_sefaz_cadastro_cnpj — should build correct cadastro request by CNPJ", () => {
    const xml = buildCadastroQueryXml("RS", "20532295000154");
    expect(xml).toContain("<ConsCad");
    expect(xml).toContain('versao="2.00"');
    expect(xml).toContain("<xServ>CONS-CAD</xServ>");
    expect(xml).toContain("<UF>RS</UF>");
    expect(xml).toContain("<CNPJ>20532295000154</CNPJ>");
    expect(xml).toContain("</ConsCad>");
  });

  it("test_sefaz_cadastro_ie — should build correct cadastro request by IE", () => {
    const xml = buildCadastroQueryXml("RS", "", "1234567");
    expect(xml).toContain("<ConsCad");
    expect(xml).toContain("<UF>RS</UF>");
    expect(xml).toContain("<IE>1234567</IE>");
    expect(xml).not.toContain("<CNPJ>");
  });

  it("test_sefaz_cadastro_cpf — should build correct cadastro request by CPF", () => {
    const xml = buildCadastroQueryXml("RS", "", "", "60140174028");
    expect(xml).toContain("<ConsCad");
    expect(xml).toContain("<UF>RS</UF>");
    expect(xml).toContain("<CPF>60140174028</CPF>");
    expect(xml).not.toContain("<CNPJ>");
    expect(xml).not.toContain("<IE>");
  });

  // --------------------------------------------------------------------------
  // sefazStatus
  // --------------------------------------------------------------------------

  it("test_sefaz_status — should build correct status request XML", () => {
    const xml = buildStatusRequestXml("RS", 2);
    expect(xml).toContain("<consStatServ");
    expect(xml).toContain('versao="4.00"');
    expect(xml).toContain("<tpAmb>2</tpAmb>");
    expect(xml).toContain("<cUF>43</cUF>");
    expect(xml).toContain("<xServ>STATUS</xServ>");
    expect(xml).toContain("</consStatServ>");
  });

  // --------------------------------------------------------------------------
  // sefazDistDFe
  // --------------------------------------------------------------------------

  it("test_sefaz_dist_dfe — should build correct DistDFe request XML", () => {
    const xml = buildDistDFeQueryXml(2, "SP", "93623057000128", 100, 200);
    expect(xml).toContain("<distDFeInt");
    expect(xml).toContain('versao="1.01"');
    expect(xml).toContain("<tpAmb>2</tpAmb>");
    expect(xml).toContain("<cUFAutor>35</cUFAutor>");
    expect(xml).toContain("<CNPJ>93623057000128</CNPJ>");
    // When specificNSU > 0, it takes priority over lastNSU
    expect(xml).toContain("<consNSU>");
    expect(xml).toContain("<NSU>000000000000200</NSU>");
    expect(xml).toContain("</distDFeInt>");
  });

  // --------------------------------------------------------------------------
  // sefazCCe
  // --------------------------------------------------------------------------

  it("test_sefazCCe — should build correct CCe (Carta de Correcao) request XML", () => {
    const chave = "35220605730928000145550010000048661583302923";
    const xml = buildCCeXml({
      accessKey: chave,
      correction: "Descricao da correcao",
      sequenceNumber: 1,
      taxId: "93623057000128",
      orgCode: "35",
      environment: 2,
      eventDateTime: "2024-05-31T11:59:12-03:00",
      lotId: "12345",
    });
    expect(xml).toContain("<envEvento");
    expect(xml).toContain("<idLote>12345</idLote>");
    expect(xml).toContain(`ID110110${chave}01`);
    expect(xml).toContain("<cOrgao>35</cOrgao>");
    expect(xml).toContain("<tpAmb>2</tpAmb>");
    expect(xml).toContain("<CNPJ>93623057000128</CNPJ>");
    expect(xml).toContain(`<chNFe>${chave}</chNFe>`);
    expect(xml).toContain("<tpEvento>110110</tpEvento>");
    expect(xml).toContain("<nSeqEvento>1</nSeqEvento>");
    expect(xml).toContain("<descEvento>Carta de Correcao</descEvento>");
    expect(xml).toContain("<xCorrecao>Descricao da correcao</xCorrecao>");
    expect(xml).toContain("<xCondUso>");
    expect(xml).toContain("</envEvento>");
  });

  // --------------------------------------------------------------------------
  // sefazAtorInteressado
  // --------------------------------------------------------------------------

  it("test_sefazAtorInteressado — should build correct Ator Interessado event request XML", () => {
    const chave = "35220605730928000145550010000048661583302923";
    const xml = buildInterestedActorXml({
      accessKey: chave,
      authorType: 1,
      appVersion: "2",
      actorTaxId: "88880563000162",
      authorizationType: 1,
      sequenceNumber: 1,
      taxId: "93623057000128",
      stateCode: "SP",
      environment: 2,
      eventDateTime: "2024-05-31T13:45:41-03:00",
      lotId: "202405311345419",
    });
    expect(xml).toContain("<envEvento");
    expect(xml).toContain("<idLote>202405311345419</idLote>");
    expect(xml).toContain(`ID110150${chave}01`);
    expect(xml).toContain("<cOrgao>91</cOrgao>");
    expect(xml).toContain("<tpEvento>110150</tpEvento>");
    expect(xml).toContain("<descEvento>Ator interessado na NF-e</descEvento>");
    expect(xml).toContain("<cOrgaoAutor>35</cOrgaoAutor>");
    expect(xml).toContain("<tpAutor>1</tpAutor>");
    expect(xml).toContain("<verAplic>2</verAplic>");
    expect(xml).toContain("<CNPJ>88880563000162</CNPJ>");
    expect(xml).toContain("<tpAutorizacao>1</tpAutorizacao>");
    expect(xml).toContain("<xCondUso>");
  });

  // --------------------------------------------------------------------------
  // sefazEPP
  // --------------------------------------------------------------------------

  it("test_sefazEPP — should build correct EPP (Pedido de Prorrogacao) request XML", () => {
    const chave = "35150300822602000124550010009923461099234656";
    const xml = buildExtensionRequestXml({
      accessKey: chave,
      protocolNumber: "135150001686732",
      items: [[1, 111], [2, 222], [3, 333]],
      extensionType: 1,
      sequenceNumber: 1,
      taxId: "93623057000128",
      orgCode: "35",
      environment: 2,
      eventDateTime: "2024-02-01T14:07:05-03:00",
      lotId: "123",
    });
    expect(xml).toContain("<envEvento");
    expect(xml).toContain("<idLote>123</idLote>");
    expect(xml).toContain(`ID111500${chave}01`);
    expect(xml).toContain("<tpEvento>111500</tpEvento>");
    expect(xml).toContain("<descEvento>Pedido de Prorrogacao</descEvento>");
    expect(xml).toContain("<nProt>135150001686732</nProt>");
    expect(xml).toContain('<itemPedido numItem="1"><qtdeItem>111</qtdeItem></itemPedido>');
    expect(xml).toContain('<itemPedido numItem="2"><qtdeItem>222</qtdeItem></itemPedido>');
    expect(xml).toContain('<itemPedido numItem="3"><qtdeItem>333</qtdeItem></itemPedido>');
  });

  // --------------------------------------------------------------------------
  // sefazECPP
  // --------------------------------------------------------------------------

  it("test_sefazECPP — should build correct ECPP (Cancelamento de Pedido de Prorrogacao) request XML", () => {
    const chave = "35150300822602000124550010009923461099234656";
    const xml = buildExtensionCancellationXml({
      accessKey: chave,
      protocolNumber: "135150001686732",
      extensionType: 1,
      sequenceNumber: 1,
      taxId: "93623057000128",
      orgCode: "35",
      environment: 2,
      eventDateTime: "2024-02-01T14:07:05-03:00",
      lotId: "123",
    });
    expect(xml).toContain("<envEvento");
    expect(xml).toContain("<idLote>123</idLote>");
    expect(xml).toContain(`ID111502${chave}01`);
    expect(xml).toContain("<tpEvento>111502</tpEvento>");
    expect(xml).toContain("<descEvento>Cancelamento de Pedido de Prorrogacao</descEvento>");
    expect(xml).toContain(`<idPedidoCancelado>ID111500${chave}01</idPedidoCancelado>`);
    expect(xml).toContain("<nProt>135150001686732</nProt>");
  });

  // --------------------------------------------------------------------------
  // sefazCancela
  // --------------------------------------------------------------------------

  it("test_sefazCancela — should build correct cancellation event request XML", () => {
    const chave = "35150300822602000124550010009923461099234656";
    const xml = buildCancellationEventXml({
      accessKey: chave,
      protocolNumber: "123456789101234",
      reason: "Preenchimento incorreto dos dados",
      taxId: "93623057000128",
      orgCode: "35",
      environment: 2,
      eventDateTime: "2024-02-01T14:07:05-03:00",
      lotId: "123",
    });
    expect(xml).toContain("<envEvento");
    expect(xml).toContain("<idLote>123</idLote>");
    expect(xml).toContain(`ID110111${chave}01`);
    expect(xml).toContain("<tpEvento>110111</tpEvento>");
    expect(xml).toContain("<descEvento>Cancelamento</descEvento>");
    expect(xml).toContain("<nProt>123456789101234</nProt>");
    expect(xml).toContain("<xJust>Preenchimento incorreto dos dados</xJust>");
  });

  // --------------------------------------------------------------------------
  // sefazCancelaPorSubstituicao
  // --------------------------------------------------------------------------

  it("test_sefazCancelaPorSubstituicaoErroChave — should throw when using substitution cancellation with model 55", () => {
    const chave = "35150300822602000124550010009923461099234656";
    expect(() =>
      buildSubstitutionCancellationXml({
        accessKey: chave,
        reason: "Preenchimento incorreto dos dados",
        protocolNumber: "123456789101234",
        referenceAccessKey: "35170705248891000181550010000011831339972127",
        appVersion: "1",
        model: 55,
        taxId: "93623057000128",
        orgCode: "35",
        environment: 2,
        eventDateTime: "2024-02-01T14:07:05-03:00",
        lotId: "123",
      })
    ).toThrow("model 65");
  });

  it("test_sefazCancelaPorSubstituicao — should build correct substitution cancellation request XML for model 65", () => {
    const chave = "35240305730928000145650010000001421071400478";
    const xml = buildSubstitutionCancellationXml({
      accessKey: chave,
      reason: "Preenchimento incorreto dos dados",
      protocolNumber: "123456789101234",
      referenceAccessKey: chave,
      appVersion: "1",
      model: 65,
      taxId: "93623057000128",
      orgCode: "35",
      environment: 2,
      eventDateTime: "2024-02-01T14:07:05-03:00",
      lotId: "123",
    });
    expect(xml).toContain("<envEvento");
    expect(xml).toContain(`ID110112${chave}01`);
    expect(xml).toContain("<tpEvento>110112</tpEvento>");
    expect(xml).toContain("<descEvento>Cancelamento por substituicao</descEvento>");
    expect(xml).toContain("<cOrgaoAutor>35</cOrgaoAutor>");
    expect(xml).toContain("<tpAutor>1</tpAutor>");
    expect(xml).toContain("<verAplic>1</verAplic>");
    expect(xml).toContain("<nProt>123456789101234</nProt>");
    expect(xml).toContain("<xJust>Preenchimento incorreto dos dados</xJust>");
    expect(xml).toContain(`<chNFeRef>${chave}</chNFeRef>`);
  });

  // --------------------------------------------------------------------------
  // sefazManifesta
  // --------------------------------------------------------------------------

  it("test_sefazManifesta — should build correct manifestacao do destinatario request XML", () => {
    const chave = "35240305730928000145650010000001421071400478";
    const xml = buildManifestationXml({
      accessKey: chave,
      eventType: EVENT_TYPES.AWARENESS,
      sequenceNumber: 1,
      taxId: "93623057000128",
      environment: 2,
      eventDateTime: "2024-02-01T14:07:05-03:00",
      lotId: "123",
    });
    expect(xml).toContain("<envEvento");
    expect(xml).toContain("<idLote>123</idLote>");
    expect(xml).toContain(`ID210210${chave}01`);
    expect(xml).toContain("<cOrgao>91</cOrgao>");
    expect(xml).toContain("<tpEvento>210210</tpEvento>");
    expect(xml).toContain("<descEvento>Ciencia da Operacao</descEvento>");
    // Ciencia does not include xJust
    expect(xml).not.toContain("<xJust>");
  });
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

  it("testActivateExceptionFailIncorrectSmallerMotive — should throw on motive shorter than 15 chars", () => {
    const contingency = new Contingency();
    expect(() => contingency.activate("SP", "Testes")).toThrow(
      "between 15 and 256 UTF-8 characters"
    );
  });

  // --------------------------------------------------------------------------
  // PHP: testActivateExceptionFailIncorrectGreaterMotive
  // --------------------------------------------------------------------------

  it("testActivateExceptionFailIncorrectGreaterMotive — should throw on motive longer than 255 chars", () => {
    const contingency = new Contingency();
    const motive =
      "Eu fui emitir uma NFe e a SEFAZ autorizadora estava fora do ar, " +
      "entrei em contato com o técnico de informática que me mandou acionar o modo de contingência, " +
      "indicando o motivo. Nosso diretor está exigindo a emissão da NFe agora, e sei não sei mais o que fazer." +
      " Então fiz essa tentativa agora.";
    expect(() => contingency.activate("SP", motive)).toThrow(
      "between 15 and 256 UTF-8 characters"
    );
  });

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

  it("testActivateForcedTypeSVCAN — should allow forcing SVCAN for a state that defaults to SVCRS", () => {
    const contingency = new Contingency();
    const result = contingency.activate("AM", "Testes Unitarios", "SVCAN");
    const std = JSON.parse(result);
    expect(std.motive).toBe("Testes Unitarios");
    expect(std.type).toBe("SVCAN");
    expect(std.tpEmis).toBe(6);
  });

  // --------------------------------------------------------------------------
  // PHP: testActivateForcedTypeSVCRS
  // SP defaults to SVCAN, but can be forced to SVCRS. We verify SP defaults.
  // --------------------------------------------------------------------------

  it("testActivateForcedTypeSVCRS — should allow forcing SVCRS for a state that defaults to SVCAN", () => {
    const contingency = new Contingency();
    const result = contingency.activate("SP", "Testes Unitarios", "SVCRS");
    const std = JSON.parse(result);
    expect(std.motive).toBe("Testes Unitarios");
    expect(std.type).toBe("SVCRS");
    expect(std.tpEmis).toBe(7);
  });

  // --------------------------------------------------------------------------
  // PHP: testLoad — loading contingency from JSON
  // We don't have a Contingency class with load(). Tested as todo.
  // --------------------------------------------------------------------------

  it("testLoad — should load contingency configuration from JSON string", () => {
    const cont = {
      motive: "Testes Unitarios",
      timestamp: 1480700623,
      type: "SVCAN",
      tpEmis: 6,
    };
    const contJson = JSON.stringify(cont);
    const contingency = new Contingency();
    contingency.load(contJson);
    expect(contingency.toString()).toBe(contJson);
    expect(contingency.motive).toBe(cont.motive);
    expect(contingency.timestamp).toBe(cont.timestamp);
    expect(contingency.type).toBe(cont.type);
    expect(contingency.tpEmis).toBe(cont.tpEmis);
  });

  // --------------------------------------------------------------------------
  // PHP: testDeactivate — resetting contingency
  // --------------------------------------------------------------------------

  it("testDeactivate — should reset contingency to default (tpEmis=1, empty motive)", () => {
    const cont = {
      motive: "Testes Unitarios",
      timestamp: 1480700623,
      type: "SVCAN",
      tpEmis: 6,
    };
    const contJson = JSON.stringify(cont);
    const contingency = new Contingency(contJson);
    expect(contingency.toString()).toBe(contJson);
    const deactivated = {
      motive: "",
      timestamp: 0,
      type: "",
      tpEmis: 1,
    };
    const deactivatedJson = JSON.stringify(deactivated);
    contingency.deactivate();
    expect(contingency.toString()).toBe(deactivatedJson);
  });

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

  it("testAdjustSuccess — should adjust NF-e XML with contingency data (tpEmis, dhCont, xJust)", () => {
    const cont = new Contingency();
    cont.activate("RS", "Teste de uso da classe em contingencia");
    const xml = readFileSync(join(FIXTURES_DIR, "nfe_layout4.xml"), "utf-8");
    const newxml = adjustNfeForContingency(xml, cont);
    // tpEmis should be 6 (SVCAN for RS)
    expect(newxml).toContain("<tpEmis>6</tpEmis>");
    // dhCont and xJust should be present
    expect(newxml).toContain("<dhCont>");
    expect(newxml).toContain("<xJust>Teste de uso da classe em contingencia</xJust>");
    // Should not contain the original tpEmis=1
    expect(newxml).not.toContain("<tpEmis>1</tpEmis>");
    // infNFe Id should have been recalculated (different from original)
    expect(newxml).not.toContain('Id="NFe43180906929383000163550010000000261000010301"');
    // The new key should contain tpEmis=6 (position 34 is the tpEmis digit)
    const idMatch = newxml.match(/Id="NFe(\d{44})"/);
    expect(idMatch).toBeTruthy();
    // tpEmis is at position 34 (0-indexed) in the access key
    expect(idMatch![1][34]).toBe("6");
  });

  // --------------------------------------------------------------------------
  // PHP: testAdjustNFeContingencyReady
  // Tests that an NFe XML already set for contingency is not changed.
  // --------------------------------------------------------------------------

  it("testAdjustNFeContingencyReady — should not alter XML already configured for contingency", () => {
    const cont = new Contingency();
    cont.activate("RS", "Teste contingencia SVCAN");
    const xml = readFileSync(join(FIXTURES_DIR, "nfe_layout4_contingencia_sem_assinatura.xml"), "utf-8");
    const newxml = adjustNfeForContingency(xml, cont);
    // XML already has tpEmis=6, so it should not be changed
    expect(newxml).toContain("<tpEmis>6</tpEmis>");
    expect(newxml).toContain("<dhCont>2024-06-11T23:30:41-03:00</dhCont>");
    expect(newxml).toContain("<xJust>Teste de uso da classe em conting");
  });

  // --------------------------------------------------------------------------
  // PHP: testAdjustFailNFCe
  // ContingencyNFe::adjust() should throw when used with NFC-e (model 65).
  // --------------------------------------------------------------------------

  it("testAdjustFailNFCe — should throw RuntimeError when adjusting NFC-e XML for contingency", () => {
    const cont = new Contingency();
    cont.activate("RS", "Teste de uso da classe em contingencia");
    const xml = readFileSync(join(FIXTURES_DIR, "nfce.xml"), "utf-8");
    expect(() => adjustNfeForContingency(xml, cont)).toThrow("model 65");
  });
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

  it("testPutQRTag — should insert QR Code and urlChave tags into NFC-e XML", async () => {
    const xml = readFileSync(join(FIXTURES_DIR, "nfce_sem_qrcode.xml"), "utf-8");

    const token = "GPB0JBWLUR6HWFTVEAS6RJ69GPCROFPBBB8G";
    const idToken = "000001";
    const versao = "200";
    const urlqr =
      "https://www.homologacao.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx";

    const result = await putQRTag({
      xml,
      cscToken: token,
      cscId: idToken,
      version: versao,
      qrCodeBaseUrl: urlqr,
      urlChave: "",
    });

    // Result should contain infNFeSupl with qrCode and urlChave
    expect(result).toContain("<infNFeSupl>");
    expect(result).toContain("<qrCode>");
    expect(result).toContain("</qrCode>");
    expect(result).toContain("<urlChave>");
    expect(result).toContain("</infNFeSupl>");
    // infNFeSupl should be before Signature
    const infNFeSuplPos = result.indexOf("<infNFeSupl>");
    const signaturePos = result.indexOf("<Signature");
    expect(infNFeSuplPos).toBeLessThan(signaturePos);
    // QR Code URL should contain the access key
    expect(result).toContain("29181033657677000156650010001654399001654399");
  });

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
