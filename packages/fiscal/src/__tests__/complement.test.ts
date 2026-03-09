import { describe, it, expect } from "bun:test";
import { attachProtocol, attachCancellation, attachInutilizacao } from "../complement";

const sampleNFeXml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<NFe xmlns="http://www.portalfiscal.inf.br/nfe">',
  '<infNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00" Id="NFe35260112345678000199650010000000011123456780">',
  "<ide><cUF>35</cUF></ide>",
  "</infNFe>",
  '<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">',
  "<SignedInfo><Reference><DigestValue>abc123digest==</DigestValue></Reference></SignedInfo>",
  "<SignatureValue>sig==</SignatureValue>",
  "</Signature>",
  "</NFe>",
].join("");

const sampleProtocolXml = [
  '<retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">',
  "<tpAmb>2</tpAmb>",
  "<cStat>104</cStat>",
  "<protNFe versao=\"4.00\">",
  "<infProt>",
  "<cStat>100</cStat>",
  "<xMotivo>Autorizado o uso da NF-e</xMotivo>",
  "<chNFe>35260112345678000199650010000000011123456780</chNFe>",
  "<digVal>abc123digest==</digVal>",
  "<nProt>141260000000001</nProt>",
  "<dhRecbto>2026-01-15T10:30:00-03:00</dhRecbto>",
  "</infProt>",
  "</protNFe>",
  "</retEnviNFe>",
].join("");

describe("attachProtocol", () => {
  it("creates nfeProc wrapper with NFe + protNFe", () => {
    const result = attachProtocol(sampleNFeXml, sampleProtocolXml);
    expect(result).toContain("<nfeProc");
    expect(result).toContain('versao="4.00"');
    expect(result).toContain("<NFe");
    expect(result).toContain("<protNFe");
    expect(result).toContain("</nfeProc>");
  });

  it("preserves original NFe content", () => {
    const result = attachProtocol(sampleNFeXml, sampleProtocolXml);
    expect(result).toContain("<cUF>35</cUF>");
    expect(result).toContain("abc123digest==");
  });

  it("includes protocol number", () => {
    const result = attachProtocol(sampleNFeXml, sampleProtocolXml);
    expect(result).toContain("141260000000001");
  });

  it("throws on empty request XML", () => {
    expect(() => attachProtocol("", sampleProtocolXml)).toThrow();
  });

  it("throws on empty response XML", () => {
    expect(() => attachProtocol(sampleNFeXml, "")).toThrow();
  });

  it("throws when NFe tag is missing", () => {
    expect(() => attachProtocol("<root>no nfe</root>", sampleProtocolXml)).toThrow();
  });

  it("still produces nfeProc even with mismatched protocol (best-effort)", () => {
    const mismatchProtocol = sampleProtocolXml
      .replace("35260112345678000199650010000000011123456780", "99999999999999999999999999999999999999999999")
      .replace("abc123digest==", "wrongdigest==");
    const result = attachProtocol(sampleNFeXml, mismatchProtocol);
    // Should still wrap in nfeProc (uses first available protNFe)
    expect(result).toContain("<nfeProc");
  });
});

describe("attachInutilizacao", () => {
  const inutRequest = [
    '<inutNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">',
    "<infInut><cStat>102</cStat></infInut>",
    "</inutNFe>",
  ].join("");

  const inutResponse = [
    '<retInutNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">',
    "<infInut><cStat>102</cStat><xMotivo>Inutilizacao homologada</xMotivo></infInut>",
    "</retInutNFe>",
  ].join("");

  it("creates ProcInutNFe wrapper", () => {
    const result = attachInutilizacao(inutRequest, inutResponse);
    expect(result).toContain("<ProcInutNFe");
    expect(result).toContain("<inutNFe");
    expect(result).toContain("<retInutNFe");
    expect(result).toContain("</ProcInutNFe>");
  });
});
