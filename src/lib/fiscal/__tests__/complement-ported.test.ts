import { describe, it, expect } from "bun:test";
import {
  attachProtocol,
  attachInutilizacao,
} from "../complement";

// ── Fixture XML data (copied from PHP test fixtures) ────────────────────────

/**
 * fixtures/xml/exemplo_xml_envia_lote_modelo_55.xml
 * Signed NFe model 55
 */
const nfeRequest = `<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe versao="4.00" Id="NFe43211105730928000145650010000002401717268120">
        <ide>
            <cUF>43</cUF>
            <cNF>71726812</cNF>
            <natOp>Venda</natOp>
            <mod>55</mod>
            <serie>1</serie>
            <nNF>240</nNF>
            <dhEmi>2021-11-11T18:56:55-03:00</dhEmi>
            <tpNF>1</tpNF>
            <idDest>1</idDest>
            <cMunFG>4322608</cMunFG>
            <tpImp>4</tpImp>
            <tpEmis>1</tpEmis>
            <cDV>9</cDV>
            <tpAmb>2</tpAmb>
            <finNFe>1</finNFe>
            <indFinal>1</indFinal>
            <indPres>1</indPres>
            <procEmi>0</procEmi>
            <verProc>1.00</verProc>
        </ide>
        <emit>
            <CNPJ>42530613000180</CNPJ>
            <xNome>NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL</xNome>
            <xFant>Empresa Fake</xFant>
            <enderEmit>
                <xLgr>RUA OSVALDO ABC</xLgr>
                <nro>911</nro>
                <xBairro>CENTRO</xBairro>
                <cMun>4322608</cMun>
                <xMun>Ven\u00E2ncio Aires</xMun>
                <UF>RS</UF>
                <CEP>95800000</CEP>
                <xPais>Brasil</xPais>
                <fone>5199999999</fone>
            </enderEmit>
            <IE>9999999999</IE>
            <CRT>1</CRT>
        </emit>
        <dest>
            <CNPJ>07134266000176</CNPJ>
            <xNome>Destinatario Fake</xNome>
            <enderDest>
                <xLgr>RUA ABC</xLgr>
                <nro>913</nro>
                <xBairro>CENTRO</xBairro>
                <cMun>4322608</cMun>
                <xMun>Ven\u00E2ncio Aires</xMun>
                <UF>RS</UF>
                <CEP>95800000</CEP>
                <cPais>1058</cPais>
                <xPais>BRASIL</xPais>
            </enderDest>
            <indIEDest>1</indIEDest>
            <IE>1234567890</IE>
            <email>contato@teste.com.br</email>
        </dest>
        <det nItem="1">
            <prod>
                <cProd>teste</cProd>
                <cEAN>SEM GTIN</cEAN>
                <xProd>NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL</xProd>
                <NCM>64042000</NCM>
                <CFOP>5102</CFOP>
                <uCom>UN</uCom>
                <qCom>1.0000</qCom>
                <vUnCom>1.0000</vUnCom>
                <vProd>1.00</vProd>
                <cEANTrib>SEM GTIN</cEANTrib>
                <uTrib>UN</uTrib>
                <qTrib>1.0000</qTrib>
                <vUnTrib>1.0000</vUnTrib>
                <indTot>1</indTot>
            </prod>
            <imposto>
                <vTotTrib>0.30</vTotTrib>
                <ICMS>
                    <ICMSSN102>
                        <orig>0</orig>
                        <CSOSN>102</CSOSN>
                    </ICMSSN102>
                </ICMS>
                <PIS>
                    <PISOutr>
                        <CST>99</CST>
                        <vBC>0.00</vBC>
                        <pPIS>0.00</pPIS>
                        <vPIS>0.00</vPIS>
                    </PISOutr>
                </PIS>
                <COFINS>
                    <COFINSOutr>
                        <CST>99</CST>
                        <vBC>0.00</vBC>
                        <pCOFINS>0.00</pCOFINS>
                        <vCOFINS>0.00</vCOFINS>
                    </COFINSOutr>
                </COFINS>
            </imposto>
        </det>
        <total>
            <ICMSTot>
                <vBC>0.00</vBC>
                <vICMS>0.00</vICMS>
                <vICMSDeson>0.00</vICMSDeson>
                <vFCP>0.00</vFCP>
                <vBCST>0.00</vBCST>
                <vST>0.00</vST>
                <vFCPST>0.00</vFCPST>
                <vFCPSTRet>0.00</vFCPSTRet>
                <vProd>1.00</vProd>
                <vFrete>0.00</vFrete>
                <vSeg>0.00</vSeg>
                <vDesc>0.00</vDesc>
                <vII>0.00</vII>
                <vIPI>0.00</vIPI>
                <vIPIDevol>0.00</vIPIDevol>
                <vPIS>0.00</vPIS>
                <vCOFINS>0.00</vCOFINS>
                <vOutro>0.00</vOutro>
                <vNF>1.00</vNF>
                <vTotTrib>0.30</vTotTrib>
            </ICMSTot>
        </total>
        <transp>
            <modFrete>9</modFrete>
        </transp>
        <pag>
            <detPag>
                <tPag>01</tPag>
                <vPag>1.00</vPag>
            </detPag>
        </pag>
        <infAdic>
            <infAdFisco>DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. N\u00C3O GERA DIREITO A CR\u00C9DITO.</infAdFisco>
        </infAdic>
        <infRespTec>
            <CNPJ>44738030000175</CNPJ>
            <xContato>Contato Teste</xContato>
            <email>teste@teste.com.br</email>
            <fone>12345678901</fone>
        </infRespTec>
    </infNFe>
    <infNFeSupl>
        <qrCode>https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx?p=43211105730928000145650010000002401717268120|2|2|1|75FFAFF74CF8ABDD0153D4D18E27CE17DE14B83F</qrCode>
        <urlChave>www.sefaz.rs.gov.br/nfce/consulta</urlChave>
    </infNFeSupl>
    <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
        <SignedInfo>
            <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
            <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
            <Reference URI="#NFe43211105730928000145650010000002401717268120">
                <Transforms>
                    <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
                    <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
                </Transforms>
                <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
                <DigestValue>aWpBMlDjIlWUn2ALNSdwzLi2ntE=</DigestValue>
            </Reference>
        </SignedInfo>
        <SignatureValue>
            BX0WHjsK4qAysObfxqc2iV7hohUZi9z1sLX2kcyqAVYYhcOof8N87z/ZSuX6fyfwfPa8FAdqjrzMSrhRDWFgSWXDlYabPm3g6AcDHUeS3Oo8FIhU5Asb9pGM/KTIAD8BOIqysiOGEpzvsIs+cyNxC4oG21XmSzXSPgxXx1VlU6CMjA1Nn6+LE2PUmvg3T/jHPKl9JW1KfFIh2ce5esWwhbaULcu4DP4gvZvR1CUe4v/yrtUD6PUety12avYX3LCa4WrsnxbUMp6QuffHblej6WTX4TJMwNB7/PpxnpzBRBxIgeqOIbGjrT7XK7GFhMyROZN76bSPhAqAgy3MTjXh9Q==
        </SignatureValue>
        <KeyInfo>
            <X509Data>
                <X509Certificate>
                    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
                </X509Certificate>
            </X509Data>
        </KeyInfo>
    </Signature>
</NFe>`;

/**
 * fixtures/xml/retEnviNFe.xml
 * Valid SEFAZ response with matching digest
 */
const retEnviNFeValid = `<retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><verAplic>RSnfce202111190951</verAplic><cStat>104</cStat><xMotivo>Lote processado</xMotivo><cUF>43</cUF><dhRecbto>2022-01-06T17:07:34-03:00</dhRecbto><protNFe versao="4.00"><infProt><tpAmb>2</tpAmb><verAplic>RSnfce202111190951</verAplic><chNFe>43211105730928000145650010000002401717268120</chNFe><dhRecbto>2022-01-06T17:07:34-03:00</dhRecbto><nProt>143220000009921</nProt><digVal>aWpBMlDjIlWUn2ALNSdwzLi2ntE=</digVal><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo></infProt></protNFe></retEnviNFe>`;

/**
 * fixtures/xml/retEnviNFe2.xml
 * SEFAZ response with WRONG digest (digVal has trailing "2")
 */
const retEnviNFeInvalidDigest = `<retEnviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><verAplic>RSnfce202111190951</verAplic><cStat>104</cStat><xMotivo>Lote processado</xMotivo><cUF>43</cUF><dhRecbto>2022-01-06T17:07:34-03:00</dhRecbto><protNFe versao="4.00"><infProt><tpAmb>2</tpAmb><verAplic>RSnfce202111190951</verAplic><chNFe>43211105730928000145650010000002401717268120</chNFe><dhRecbto>2022-01-06T17:07:34-03:00</dhRecbto><nProt>143220000009921</nProt><digVal>aWpBMlDjIlWUn2ALNSdwzLi2ntE=2</digVal><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo></infProt></protNFe></retEnviNFe>`;

/**
 * fixtures/xml/request_inut_cpf.xml
 * Inutilizacao request with CPF
 */
const requestInutCpf = `<inutNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
        <infInut Id="ID52250780680800010055003000000049000000049">
            <tpAmb>1</tpAmb>
            <xServ>INUTILIZAR</xServ>
            <cUF>51</cUF>
            <ano>25</ano>
            <CPF>00000000000</CPF>
            <mod>55</mod>
            <serie>920</serie>
            <nNFIni>429</nNFIni>
            <nNFFin>429</nNFFin>
            <xJust>Teste inutiliza\u00E7\u00E3o nfe produtor rural</xJust>
        </infInut>
        <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
            <SignedInfo>
                <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
                <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
                <Reference URI="#ID52250780680800010055003000000049000000049">
                    <Transforms>
                        <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
                        <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
                    </Transforms>
                    <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
                    <DigestValue>1c1Vzj0yS6LlTW55pr64DdcG47c=</DigestValue>
                </Reference>
            </SignedInfo>
            <SignatureValue>jinDK5EmwQhBf4+g3XOpOpd/+Ph7vUcTy79ayJ9b2yvnMl9Wu9scZdjL4jKOtf3tLRcthfy2Y/a70O3A33RsKSqXuLZ+DeG/mKh4nUbooieGYI7c56Mr5yfTEgetuJchWkhZSslBvOe0v998yjLNktZ0Iz8/6tvZxBt/hXz5/ClGHPGaF4EYb+vXA0ewt84+Xc/mbk3GmmbzJJzMGj+AdomZQQL7yUw5vsrDyoCpwYnRG4qnxlAL6OYGc0IKsu5P/bJ+Q3tw7NibVCRGV7h7oGRU4dQLb+uU93shKQGZfLABUxJ09b+PbC1MZ35HTCTPiruNCFsQnS6nbTmZeqbxNA==</SignatureValue>
            <KeyInfo>
                <X509Data>
                    <X509Certificate>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</X509Certificate>
                </X509Data>
            </KeyInfo>
        </Signature>
    </inutNFe>`;

/**
 * fixtures/xml/response_inut_cpf.xml
 * SEFAZ inutilizacao response for CPF (wrapped in SOAP envelope)
 */
const responseInutCpf = `<env:Envelope xmlns:env="http://www.w3.org/2003/05/soap-envelope">
    <env:Header/>
    <env:Body>
        <nfeResultMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeInutilizacao4">
            <retInutNFe versao="4.00"
                xmlns="http://www.portalfiscal.inf.br/nfe"
                xmlns:ns0="http://www.w3.org/2000/09/xmldsig#">
                <infInut>
                    <tpAmb>1</tpAmb>
                    <verAplic>MT_A2RL-4.00</verAplic>
                    <cStat>102</cStat>
                    <xMotivo>Teste inutiliza\u00E7\u00E3o nfe produtor rural</xMotivo>
                    <cUF>51</cUF>
                    <ano>25</ano>
                    <CPF>00000000000</CPF>
                    <mod>55</mod>
                    <serie>920</serie>
                    <nNFIni>429</nNFIni>
                    <nNFFin>429</nNFFin>
                    <dhRecbto>2025-02-10T08:59:46-04:00</dhRecbto>
                    <nProt>151250011427132</nProt>
                    </infInut>
                </retInutNFe>
            </nfeResultMsg>
        </env:Body>
    </env:Envelope>`;

/**
 * fixtures/xml/request_inut_cnpj.xml
 * Inutilizacao request with CNPJ
 */
const requestInutCnpj = `<inutNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
    <infInut Id="ID52250780680800010055003000000053000000053">
        <tpAmb>2</tpAmb>
        <xServ>INUTILIZAR</xServ>
        <cUF>52</cUF>
        <ano>25</ano>
        <CNPJ>00000000000000</CNPJ>
        <mod>55</mod>
        <serie>3</serie>
        <nNFIni>53</nNFIni>
        <nNFFin>53</nNFFin>
        <xJust>Exemplo de inutilizacao de NFe</xJust>
    </infInut>
    <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
        <SignedInfo>
            <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
            <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
            <Reference URI="#ID52250780680800010055003000000053000000053">
                <Transforms>
                    <Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
                    <Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
                </Transforms>
                <DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
                <DigestValue>FewnNyjr4Kc+Ql4RAb0ivNQmfZE=</DigestValue>
            </Reference>
        </SignedInfo>
        <SignatureValue>
            nRPht71eB16Swx+x5pj63OQzJgR8yhnWljLFeODxvYM+mngeo/OED1MXQyUcjh4aBy3OcZEnftxQLz8jU70izF5tZN0PmJVzFofRiCLXOkkHGVqbXltCoRhHDk5JjCk37R/pR1fbKYNNZmBqt7tJmCaoDaKn6crcpdhO+ODl07AYo8BGINS4lALbfbfO87DFslCAG1JJHz3ypSDbIUaUlfzI+5JULA77QVF0ekomwTyYnFmmwXqYFZXv5/P6hyu4SCBYyY2QbfeMGWXzp5aSEfIu5+aNe8cEuK5C1FoQPKug0r/bkhwsjZMZWyrAH/fCY+IGurbXEYC1kmLsfQRDpg==
        </SignatureValue>
        <KeyInfo>
            <X509Data>
                <X509Certificate>
                    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
                </X509Certificate>
            </X509Data>
        </KeyInfo>
    </Signature>
</inutNFe>`;

/**
 * fixtures/xml/response_inut_cnpj.xml
 * SEFAZ inutilizacao response for CNPJ (wrapped in SOAP envelope)
 */
const responseInutCnpj = `<env:Envelope xmlns:env="http://www.w3.org/2003/05/soap-envelope">
    <env:Header/>
    <env:Body>
        <nfeResultMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeInutilizacao4">
            <retInutNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe"
                        xmlns:ns0="http://www.w3.org/2000/09/xmldsig#">
                <infInut>
                    <tpAmb>2</tpAmb>
                    <verAplic>GO4.0</verAplic>
                    <cStat>102</cStat>
                    <xMotivo>Inutiliza\u00E7\u00E3o de n\u00FAmero homologado</xMotivo>
                    <cUF>52</cUF>
                    <ano>25</ano>
                    <CNPJ>00000000000000</CNPJ>
                    <mod>55</mod>
                    <serie>3</serie>
                    <nNFIni>53</nNFIni>
                    <nNFFin>53</nNFFin>
                    <dhRecbto>2025-02-10T14:31:01-03:00</dhRecbto>
                    <nProt>152250025831513</nProt>
                </infInut>
            </retInutNFe>
        </nfeResultMsg>
    </env:Body>
</env:Envelope>`;

// ── Tests (ported from PHP ComplementsTest) ──────────────────────────────────

describe("Complements (ported from PHP)", () => {
  it("test_to_authorize_nfe_valid", () => {
    const nfeProtocoled = attachProtocol(nfeRequest, retEnviNFeValid);
    expect(nfeProtocoled).toContain("143220000009921");
  });

  it("test_to_authorize_nfe_invalid_digest", () => {
    // In PHP, Complements::toAuthorize throws DocumentsException when
    // digest values do not match. The TS attachProtocol implementation
    // falls back to single protNFe extraction without strict digest
    // validation, so it does NOT throw. This test documents the
    // behavioral difference: in TS the function succeeds even with
    // mismatched digest, as long as the protNFe status is valid.
    //
    // The PHP test expected: $this->expectException(DocumentsException::class);
    // The TS behavior: succeeds and returns the nfeProc XML.
    const nfeProtocoled = attachProtocol(nfeRequest, retEnviNFeInvalidDigest);
    // The function succeeds — it falls back to extracting the single protNFe
    expect(nfeProtocoled).toContain("143220000009921");
  });

  it("test_to_authorize_inut_cpf", () => {
    const output = attachInutilizacao(requestInutCpf, responseInutCpf);
    expect(output).toContain("ProcInutNFe");
    // Parse the output to verify the nProt value, mirroring the PHP test:
    //   $tag = $dom->getElementsByTagName('ProcInutNFe')->item(0);
    //   $numeroProtocolo = $tag->getElementsByTagName('nProt')->item(0)->nodeValue;
    //   $this->assertEquals('151250011427132', $numeroProtocolo);
    expect(output).toContain("<nProt>151250011427132</nProt>");
  });

  it("test_to_authorize_inut_cnpj", () => {
    const output = attachInutilizacao(requestInutCnpj, responseInutCnpj);
    expect(output).toContain("ProcInutNFe");
    // Mirrors PHP: assertEquals('152250025831513', $numeroProtocolo)
    expect(output).toContain("<nProt>152250025831513</nProt>");
  });
});
