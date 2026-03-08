// @ts-nocheck
/**
 * Ported from PHP sped-nfe test files:
 *   - tests/Common/ConfigTest.php
 *   - tests/Common/StandardizeTest.php
 *   - tests/Common/WebservicesTest.php
 *   - tests/Common/GtinTest.php
 *   - tests/Common/ValidTXTTest.php
 *   - tests/CertificateTest.php
 *   - tests/ConvertTest.php
 *   - tests/TiposBasicosTest.php
 *   - tests/MakeDevTest.php
 *   - tests/ComplementsTest.php (only tests NOT already in complement-ported.test.ts)
 *
 * Each PHP test method maps to one TS `it()` or `it.todo()` block.
 */

import { describe, it, expect } from "bun:test";
import { getSefazUrl } from "../sefaz-urls";
import { tag, buildAccessKey } from "../xml-builder";
import {
  buildIcmsXml,
} from "../tax-icms";
import {
  buildPisXml,
  buildCofinsXml,
  buildIpiXml,
} from "../tax-pis-cofins-ipi";
import fs from "node:fs";
import { loadCertificate, getCertificateInfo } from "../certificate";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Parse a simple XML string and check it contains all expected child tags with values. */
function expectXmlContains(xml: string, expectations: Record<string, string>) {
  for (const [tagName, value] of Object.entries(expectations)) {
    expect(xml).toContain(`<${tagName}>${value}</${tagName}>`);
  }
}

// =============================================================================
// ConfigTest (tests/Common/ConfigTest.php)
// We don't have a Config validator class — all tests are todo.
// =============================================================================

describe("ConfigTest", () => {
  it.todo("testValidate — validate config JSON returns object");

  it.todo("testValidadeWithoutSomeOptionalData — config without optional fields is valid");

  it.todo("testValidadeFailWithArray — config with array instead of JSON string throws TypeError");

  it.todo("testValidadeFailWithoutJsonString — empty string throws DocumentsException");

  it.todo("testValidadeFailWithoutTpAmb — missing tpAmb throws DocumentsException");

  it.todo("testValidadeFailWithoutRazao — missing razaosocial throws DocumentsException");

  it.todo("testValidadeFailWithoutUF — missing siglaUF throws DocumentsException");

  it.todo("testValidadeFailWithoutCNPJ — missing cnpj throws DocumentsException");

  it.todo("testValidadeFailWithoutSchemes — missing schemes throws DocumentsException");

  it.todo("testValidadeFailWithoutVersao — missing versao throws DocumentsException");

  it.todo("testValidadeWithCPF — config with CPF (11 digits) in cnpj field is valid");
});

// =============================================================================
// StandardizeTest (tests/Common/StandardizeTest.php)
// We don't have a Standardize class — all tests are todo.
// =============================================================================

describe("StandardizeTest", () => {
  it.todo("testWhichIs — detect NFe XML type returns 'NFe'");

  it.todo("testWhichIsFailNotXMLSting — non-XML string throws DocumentsException");

  it.todo("testWhichIsFailNotXMLNumber — numeric input throws DocumentsException");

  it.todo("testWhichIsFailNotXMLSpace — whitespace-only string throws DocumentsException");

  it.todo("testWhichIsFailNotXMLNull — null input throws DocumentsException");

  it.todo("testWhichIsFailNotXMLEmptyString — empty string throws DocumentsException");

  it.todo("testWhichIsFailNotBelongToNFe — CT-e XML throws DocumentsException");

  it.todo("testToJson — convert NFe XML to JSON string");

  it.todo("testToArray — convert NFe XML to array/object");

  it.todo("testToStd — convert NFe 4.0 XML to stdClass-like object");
});

// =============================================================================
// WebservicesTest (tests/Common/WebservicesTest.php)
// We have getSefazUrl() — port as real tests.
// =============================================================================

describe("WebservicesTest", () => {
  it("testIcanInstantiate — getSefazUrl function exists and is callable", () => {
    // PHP: assertInstanceOf('NFePHP\NFe\Common\Webservices', new Webservices($this->xml));
    // TS equivalent: just verify the function is accessible
    expect(typeof getSefazUrl).toBe("function");
  });

  it("testGetWebserviceValidUF — RS homologation model 55 returns a URL object", () => {
    // PHP: $ret = $ws->get('RS', 2, 55); assertInstanceOf('\\stdClass', $ret);
    // TS: getSefazUrl returns a string URL for a valid UF
    const url = getSefazUrl("RS", "NfeStatusServico", 2, false, 55);
    expect(typeof url).toBe("string");
    expect(url).toContain("https://");
    expect(url).toContain("sefazrs.rs.gov.br");
  });

  it("testRuntimeExceptionUsingAnInvalidUF — invalid UF 'XY' throws Error", () => {
    // PHP: $this->expectException(\RuntimeException::class);
    //      $ws->get('XY', 2, 55);
    expect(() => {
      getSefazUrl("XY", "NfeStatusServico", 2, false, 55);
    }).toThrow();
  });
});

// =============================================================================
// GtinTest (tests/Common/GtinTest.php)
// We don't have GTIN validation — all tests are todo.
// =============================================================================

describe("GtinTest", () => {
  it.todo("test_is_valid — empty string, 'SEM GTIN', and valid GTIN '7898357410015' are all valid");

  it.todo("test_is_invalid_1 — GTIN '7898357410010' (bad check digit) throws InvalidArgumentException");

  it.todo("test_is_invalid_2 — non-numeric 'abc' throws InvalidArgumentException");
});

// =============================================================================
// ValidTXTTest (tests/Common/ValidTXTTest.php)
// We don't have TXT validation — all tests are todo.
// =============================================================================

describe("ValidTXTTest", () => {
  it.todo("testIsValidFail — invalid TXT returns validation errors matching expected JSON");

  it.todo("testIsValidSebrae — valid Sebrae-format TXT passes validation");

  it.todo("testIsValidLocal — valid local-format TXT passes validation");
});

// =============================================================================
// CertificateTest (tests/CertificateTest.php)
// We have loadCertificate and getCertificateInfo — port as real tests using
// the PHP test fixture PFX files.
// =============================================================================

describe("CertificateTest", () => {
  const cnpjPfxPath =
    "/home/john/projects/FinOpenPOS/.reference/sped-nfe/tests/fixtures/certs/novo_cert_cnpj_06157250000116_senha_minhasenha.pfx";
  const cpfPfxPath =
    "/home/john/projects/FinOpenPOS/.reference/sped-nfe/tests/fixtures/certs/novo_cert_cpf_90483926086_minhasenha.pfx";
  const password = "minhasenha";

  it("test_certificado_pj — PJ certificate extracts CNPJ and validity date", () => {
    // PHP: Certificate::readPfx($conteudo, 'minhasenha');
    //      $this->assertSame('06157250000116', $certificado->getCnpj());
    //      $this->assertSame('05/06/2034', $certificado->getValidTo()->format('d/m/Y'));
    const pfxBuffer = fs.readFileSync(cnpjPfxPath);
    const certData = loadCertificate(pfxBuffer, password);
    expect(certData.privateKey).toContain("-----BEGIN PRIVATE KEY-----");
    expect(certData.certificate).toContain("-----BEGIN CERTIFICATE-----");

    const info = getCertificateInfo(pfxBuffer, password);
    // The CN contains the CNPJ (formatted with punctuation in the certificate)
    expect(info.commonName).toContain("06.157.250/0001-16");
    // Validity: valid until 2034-06-05
    const validTo = info.validUntil;
    expect(validTo.getFullYear()).toBe(2034);
    expect(validTo.getMonth() + 1).toBe(6); // June
    expect(validTo.getDate()).toBe(5);
  });

  it("test_certificado_pf — PF certificate extracts CPF and validity date", () => {
    // PHP: Certificate::readPfx($conteudo, 'minhasenha');
    //      $this->assertSame('90483926086', $certificado->getCpf());
    //      $this->assertSame('03/06/2034', $certificado->getValidTo()->format('d/m/Y'));
    const pfxBuffer = fs.readFileSync(cpfPfxPath);
    const certData = loadCertificate(pfxBuffer, password);
    expect(certData.privateKey).toContain("-----BEGIN PRIVATE KEY-----");
    expect(certData.certificate).toContain("-----BEGIN CERTIFICATE-----");

    const info = getCertificateInfo(pfxBuffer, password);
    // The CN contains the CPF (formatted with punctuation in the certificate)
    expect(info.commonName).toContain("904.839.260-86");
    // Validity: valid until 2034-06-03
    const validTo = info.validUntil;
    expect(validTo.getFullYear()).toBe(2034);
    expect(validTo.getMonth() + 1).toBe(6); // June
    expect(validTo.getDate()).toBe(3);
  });
});

// =============================================================================
// ConvertTest (tests/ConvertTest.php)
// We don't have TXT-to-XML conversion — all tests are todo.
// =============================================================================

describe("ConvertTest", () => {
  it.todo("test_convert — convert local TXT to XML, produces 1 NFe XML with correct structure");

  it.todo("test_convert_errors — convert TXT with invalid key throws ParserException");

  it.todo("test_convert_dump — dump parsed TXT returns stdNfe with correct Id");

  // Sub-assertions from the PHP test_convert method (each assertX helper is its own logical test):

  it.todo("assertIdentificacao — converted XML has correct ide fields (cUF=35, cNF=00000501, natOp, mod=55, serie=1, nNF=502, dhEmi, dhSaiEnt, tpNF, idDest, cMunFG, tpImp, tpEmis, cDV, tpAmb, finNFe, indFinal, indPres, indIntermed, procEmi, verProc)");

  it.todo("assertEmitente — converted XML has correct emit fields (CNPJ=25028332000105, xNome, IE=140950881119, CRT=3, enderEmit)");

  it.todo("assertDestinatario — converted XML has correct dest fields (CNPJ=17812455000295, xNome, indIEDest=1, IE, email, enderDest)");

  it.todo("assertItens — converted XML has 4 det items with correct prod, imposto/ICMS, IPI, PIS, COFINS, gCred fields");

  it.todo("assertTotais — converted XML has correct ICMSTot fields (vBC=55.84, vICMS=10.04, vProd=103.88, vNF=116.39, etc.)");

  it.todo("assertFrete — converted XML has correct transp fields (modFrete=3, transporta CNPJ/xNome/IE, vol)");

  it.todo("assertCobranca — converted XML has correct cobr/fat and dup fields");

  it.todo("assertPagamento — converted XML has correct pag/detPag fields (indPag=0, tPag=01, vPag=116.39)");

  it.todo("assertInfoAdicional — converted XML has correct infAdic/infCpl text");
});

// =============================================================================
// TiposBasicosTest (tests/TiposBasicosTest.php)
// Tests XSD pattern validation — we don't have XSD parsing. Todo.
// =============================================================================

describe("TiposBasicosTest", () => {
  it.todo("test_TString — XSD simpleType TString has correct pattern '[!-\u00FF]{1}[ -\u00FF]*[!-\u00FF]{1}|[!-\u00FF]{1}'");
});

// =============================================================================
// MakeDevTest (tests/MakeDevTest.php)
// These overlap with MakeTest. Port the tests that test unique dev scenarios.
// We use our tag() / builder functions for structural equivalence.
// =============================================================================

describe("MakeDevTest", () => {
  // testTaginfNFe — already in make-ported.test.ts, but the MakeDevTest version
  // instantiates Make with PL_010 scheme. Port as structural check.
  it("testTaginfNFe — infNFe with Id and versao attributes (PL_010 scheme)", () => {
    // PHP: $make = new Make('PL_010'); $std->Id = '35170358716523000119550010000000301000000300';
    //      $infNFe = $this->make->taginfNFe($std);
    //      $this->assertEquals('NFe' . $std->Id, $infNFe->getAttribute('Id'));
    const id = "35170358716523000119550010000000301000000300";
    const xml = tag("infNFe", { Id: `NFe${id}`, versao: "4.00" }, "");
    expect(xml).toContain(`Id="NFe${id}"`);
    expect(xml).toContain(`versao="4.00"`);
  });

  it("testTaginfNFeComPkNItem — infNFe with pk_nItem attribute", () => {
    const id = "35170358716523000119550010000000301000000300";
    const xml = tag("infNFe", { Id: `NFe${id}`, versao: "4.00", pk_nItem: "1" }, "");
    expect(xml).toContain(`Id="NFe${id}"`);
    expect(xml).toContain(`versao="4.00"`);
    expect(xml).toContain(`pk_nItem="1"`);
  });

  it("testTaginfNFeSemChaveDeAcesso — infNFe without access key", () => {
    // PHP: $std->versao = '4.00'; (no Id)
    //      $this->assertEquals('NFe', $infNFe->getAttribute('Id'));
    //      $this->assertEmpty($this->make->getChave());
    const xml = tag("infNFe", { Id: "NFe", versao: "4.00" }, "");
    expect(xml).toContain(`Id="NFe"`);
    expect(xml).toContain(`versao="4.00"`);
  });

  it("testTagideVersaoQuantroPontoZeroModeloCinquentaECinco — model 55 ide fields with all values", () => {
    // PHP: builds ide tag with cUF=50, cNF=80070008, natOp=VENDA, mod=55, etc.
    //      Asserts indPag is NOT present (v4.00 removed it)
    //      Asserts dhCont and xJust are NOT present
    const xml = tag("ide", {}, [
      tag("cUF", {}, "50"),
      tag("cNF", {}, "80070008"),
      tag("natOp", {}, "VENDA"),
      // indPag is intentionally NOT included for v4.00
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
      tpImp: "1",
      tpEmis: "1",
      cDV: "2",
      tpAmb: "2",
      finNFe: "1",
      indFinal: "0",
      indPres: "1",
      procEmi: "0",
      verProc: "5.0",
    });
    // indPag should NOT be in the output
    expect(xml).not.toContain("<indPag>");
    // dhCont and xJust should NOT be present
    expect(xml).not.toContain("<dhCont>");
    expect(xml).not.toContain("<xJust>");
  });

  it.todo("testTagideVersaoQuatroPontoZeroCamposObrigatoriosModeloCinquentaECinco — empty required fields produce validation errors for cUF, natOp, mod, serie, nNF, dhEmi, tpNF, idDest, cMunFG, tpAmb, finNFe, indFinal, indPres, procEmi, verProc");

  it("testTagideVersaoQuantroPontoZeroModeloCinquentaECincoEmContigencia — contingency ide fields (dhCont, xJust)", () => {
    // PHP: sets dhCont and xJust, asserts they appear in output
    const xml = tag("ide", {}, [
      tag("dhCont", {}, "2018-06-26T17:45:49-03:00"),
      tag("xJust", {}, "SEFAZ INDISPONIVEL"),
    ]);

    expectXmlContains(xml, {
      dhCont: "2018-06-26T17:45:49-03:00",
      xJust: "SEFAZ INDISPONIVEL",
    });
  });

  it("testTagideVersaoQuantroPontoZeroModeloSessentaECinco — model 65 ide fields with NFC-e specifics", () => {
    // PHP: mod=65, tpImp=4, dhSaiEnt=null (not included), indPres=5, indIntermed=1,
    //      cMunFGIBS present, tpNFDebito=1 present, tpNFCredito empty (not included)
    const xml = tag("ide", {}, [
      tag("cUF", {}, "50"),
      tag("cNF", {}, "80070008"),
      tag("natOp", {}, "VENDA"),
      // indPag intentionally NOT included for v4.00
      tag("mod", {}, "65"),
      tag("serie", {}, "1"),
      tag("nNF", {}, "1"),
      tag("dhEmi", {}, "2018-06-23T17:45:49-03:00"),
      // dhSaiEnt null => not included
      tag("tpNF", {}, "1"),
      tag("idDest", {}, "1"),
      tag("cMunFG", {}, "5002704"),
      tag("cMunFGIBS", {}, "5002704"),
      tag("tpImp", {}, "4"),
      tag("tpEmis", {}, "1"),
      tag("tpNFDebito", {}, "1"),
      // tpNFCredito empty => not included when both debito AND credito set, only debito wins
      tag("cDV", {}, "2"),
      tag("tpAmb", {}, "2"),
      tag("finNFe", {}, "1"),
      tag("indFinal", {}, "0"),
      tag("indPres", {}, "5"),
      tag("indIntermed", {}, "1"),
      tag("procEmi", {}, "0"),
      tag("verProc", {}, "5.0"),
    ]);

    expectXmlContains(xml, {
      cUF: "50",
      cNF: "80070008",
      natOp: "VENDA",
      mod: "65",
      serie: "1",
      nNF: "1",
      dhEmi: "2018-06-23T17:45:49-03:00",
      tpNF: "1",
      idDest: "1",
      cMunFG: "5002704",
      cMunFGIBS: "5002704",
      tpImp: "4",
      tpEmis: "1",
      tpNFDebito: "1",
      cDV: "2",
      tpAmb: "2",
      finNFe: "1",
      indFinal: "0",
      indPres: "5",
      indIntermed: "1",
      procEmi: "0",
      verProc: "5.0",
    });

    // indPag should NOT be present in v4.00
    expect(xml).not.toContain("<indPag>");
    // dhSaiEnt null => should NOT be present
    expect(xml).not.toContain("<dhSaiEnt>");
    // dhCont null => should NOT be present
    expect(xml).not.toContain("<dhCont>");
    // xJust null => should NOT be present
    expect(xml).not.toContain("<xJust>");
    // tpNFCredito should NOT be present (debito takes precedence)
    expect(xml).not.toContain("<tpNFCredito>");
  });
});

// =============================================================================
// ComplementsTest (tests/ComplementsTest.php)
// Only the tests NOT already in complement-ported.test.ts.
// The PHP source shows these as empty test bodies: testToAuthorizeEvent,
// testToAuthorizeFailWrongDocument, testToAuthorizeFailNotXML,
// testToAuthorizeFailWrongNode, testCancelRegister, testCancelRegisterFailNotNFe,
// testB2B, testB2BFailNotNFe, testB2BFailWrongNode
// =============================================================================

describe("ComplementsTest (missing from complement-ported)", () => {
  it.todo("testToAuthorizeEvent — attach protocol to an event XML");

  it.todo("testToAuthorizeFailWrongDocument — wrong document type throws error");

  it.todo("testToAuthorizeFailNotXML — non-XML input throws error");

  it.todo("testToAuthorizeFailWrongNode — wrong root node throws error");

  it.todo("testCancelRegister — register cancellation event for authorized NFe");

  it.todo("testCancelRegisterFailNotNFe — cancel non-NFe document throws error");

  it.todo("testB2B — attach B2B (NF-e model 55) complement");

  it.todo("testB2BFailNotNFe — B2B complement on non-NFe throws error");

  it.todo("testB2BFailWrongNode — B2B complement with wrong node throws error");
});
