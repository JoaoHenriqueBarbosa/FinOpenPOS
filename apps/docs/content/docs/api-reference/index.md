---
layout: docs
title: "API Reference"
---



## Classes

| Class | Description |
| ------ | ------ |
| [AccessKey](/docs/api-reference/classes/AccessKey) | Immutable 44-digit NF-e/NFC-e access key with component extraction methods. |
| [Contingency](/docs/api-reference/classes/Contingency) | Manages NF-e/NFC-e contingency mode activation and deactivation. |
| [Convert](/docs/api-reference/classes/Convert) | Converts SPED TXT representation of NF-e documents into XML. |
| [ParserError](/docs/api-reference/classes/ParserError) | Error thrown when TXT parsing fails. |
| [TaxId](/docs/api-reference/classes/TaxId) | Immutable wrapper for CPF or CNPJ with formatting and XML helpers. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [AccessKeyParams](/docs/api-reference/interfaces/AccessKeyParams) | Access key components for NF-e/NFC-e |
| [ArmaData](/docs/api-reference/interfaces/ArmaData) | Weapon details (arma) -- inside prod, up to 500 per item |
| [CepResult](/docs/api-reference/interfaces/CepResult) | Address result from a CEP (zip code) lookup. |
| [CertificateData](/docs/api-reference/interfaces/CertificateData) | Certificate loaded from PFX file |
| [CertificateInfo](/docs/api-reference/interfaces/CertificateInfo) | Certificate info for display purposes |
| [CofinsData](/docs/api-reference/interfaces/CofinsData) | COFINS tax input data. Monetary amounts in cents, rates as integer * 10000. |
| [CofinsStData](/docs/api-reference/interfaces/CofinsStData) | COFINS-ST (substituicao tributaria) input data. |
| [CombustivelItem](/docs/api-reference/interfaces/CombustivelItem) | Item for fuel credit appropriation event |
| [ConsumoItem](/docs/api-reference/interfaces/ConsumoItem) | Item for personal consumption destination event |
| [ContingencyConfig](/docs/api-reference/interfaces/ContingencyConfig) | Contingency configuration data. |
| [CreditoBensItem](/docs/api-reference/interfaces/CreditoBensItem) | Item for goods and services credit appropriation event |
| [CredPresumidoItem](/docs/api-reference/interfaces/CredPresumidoItem) | Item for deemed credit appropriation event |
| [DFeReferenciadoData](/docs/api-reference/interfaces/DFeReferenciadoData) | Referenced DFe per item (DFeReferenciado) -- inside det, PL_010 schema |
| [EpecNfceConfig](/docs/api-reference/interfaces/EpecNfceConfig) | Configuration for EPEC NFC-e event building. |
| [FiscalConfig](/docs/api-reference/interfaces/FiscalConfig) | Fiscal configuration object structure. |
| [FiscalSettings](/docs/api-reference/interfaces/FiscalSettings) | Fiscal settings from database (without raw PFX) |
| [IcmsData](/docs/api-reference/interfaces/IcmsData) | Unified input data for all ICMS variations. All monetary fields in cents; rate fields in hundredths or * 10000. |
| [IcmsTotals](/docs/api-reference/interfaces/IcmsTotals) | Accumulated ICMS totals across all items. |
| [IiData](/docs/api-reference/interfaces/IiData) | II (Imposto de Importacao) input data. |
| [ImobilizacaoItem](/docs/api-reference/interfaces/ImobilizacaoItem) | Item for asset immobilization event |
| [ImportacaoZFMItem](/docs/api-reference/interfaces/ImportacaoZFMItem) | Item for ALC/ZFM import not converted to exemption event |
| [InvoiceBuildData](/docs/api-reference/interfaces/InvoiceBuildData) | Data needed to build an invoice XML |
| [InvoiceItemData](/docs/api-reference/interfaces/InvoiceItemData) | Item data for XML building |
| [IpiData](/docs/api-reference/interfaces/IpiData) | IPI (Imposto sobre Produtos Industrializados) input data. |
| [IsData](/docs/api-reference/interfaces/IsData) | IS (Imposto Seletivo / IBS+CBS) input data -- PL_010 tax reform. Goes inside <imposto> as an alternative/addition to ICMS. |
| [IssqnData](/docs/api-reference/interfaces/IssqnData) | ISSQN (ISS - Imposto Sobre Servicos) input data. All monetary amounts in cents, rates as hundredths. |
| [IssqnTotals](/docs/api-reference/interfaces/IssqnTotals) | ISSQN totals accumulator (mirrors PHP stdISSQNTot). |
| [ItemNaoFornecido](/docs/api-reference/interfaces/ItemNaoFornecido) | Item for unfulfilled supply with prepayment event |
| [MedData](/docs/api-reference/interfaces/MedData) | Medicine details (med) -- inside prod |
| [NfceQrCodeParams](/docs/api-reference/interfaces/NfceQrCodeParams) | Parameters for building an NFC-e QR Code URL. |
| [ObsItemData](/docs/api-reference/interfaces/ObsItemData) | Per-item observations (obsItem) -- inside det |
| [PaymentData](/docs/api-reference/interfaces/PaymentData) | Payment data for invoice |
| [PerecimentoAdquirenteItem](/docs/api-reference/interfaces/PerecimentoAdquirenteItem) | Item for perishment/loss/theft by acquirer event (FOB) |
| [PerecimentoFornecedorItem](/docs/api-reference/interfaces/PerecimentoFornecedorItem) | Item for perishment/loss/theft by supplier event (CIF) |
| [PisData](/docs/api-reference/interfaces/PisData) | PIS tax input data. Monetary amounts in cents, rates as integer * 10000. |
| [PisStData](/docs/api-reference/interfaces/PisStData) | PIS-ST (substituicao tributaria) input data. |
| [PutQRTagParams](/docs/api-reference/interfaces/PutQRTagParams) | Parameters for inserting QR Code into NFC-e XML. |
| [RastroData](/docs/api-reference/interfaces/RastroData) | Batch tracking (rastro) -- up to 500 per item, inside prod |
| [RetTribData](/docs/api-reference/interfaces/RetTribData) | Retained taxes (retTrib) -- inside total |
| [SefazReformConfig](/docs/api-reference/interfaces/SefazReformConfig) | Configuration for SEFAZ reform event builders |
| [SefazResponse](/docs/api-reference/interfaces/SefazResponse) | SEFAZ response after processing |
| [TaxElement](/docs/api-reference/interfaces/TaxElement) | Structured representation of a tax XML element. |
| [TaxField](/docs/api-reference/interfaces/TaxField) | A single XML field: <name>value</name> |
| [VeicProdData](/docs/api-reference/interfaces/VeicProdData) | Vehicle details (veicProd) -- inside prod |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [ContingencyType](/docs/api-reference/type-aliases/ContingencyType) | Contingency type for NF-e emission fallback |
| [ContingencyTypeName](/docs/api-reference/type-aliases/ContingencyTypeName) | Contingency type name: SVCAN, SVCRS, or empty (normal mode). |
| [DestIdType](/docs/api-reference/type-aliases/DestIdType) | Destination ID type (tp_idDest): 1=CNPJ, 2=CPF, 3=foreign, ""=none. |
| [EmissionType](/docs/api-reference/type-aliases/EmissionType) | Emission type (tpEmis): 1=normal, 6=SVC-AN, 7=SVC-RS, 9=offline contingency |
| [InvoiceModel](/docs/api-reference/type-aliases/InvoiceModel) | NF-e model: 55 = NF-e (B2B), 65 = NFC-e (consumer) |
| [InvoiceStatus](/docs/api-reference/type-aliases/InvoiceStatus) | Invoice status lifecycle |
| [QrCodeVersion](/docs/api-reference/type-aliases/QrCodeVersion) | QR Code version: 200 (v2) or 300 (v3, NT 2025.001). |
| [SefazEnvironment](/docs/api-reference/type-aliases/SefazEnvironment) | SEFAZ environment: 1 = production, 2 = homologation |
| [SefazService](/docs/api-reference/type-aliases/SefazService) | SEFAZ web service names used for SOAP requests |
| [TaxRegime](/docs/api-reference/type-aliases/TaxRegime) | Tax regime (CRT): 1=Simples Nacional, 2=Simples excess, 3=Normal |

## Variables

| Variable | Description |
| ------ | ------ |
| [C14N\_ALGORITHM](/docs/api-reference/variables/C14N_ALGORITHM) | C14N canonicalization algorithm URI |
| [ENVELOPED\_SIGNATURE\_TRANSFORM](/docs/api-reference/variables/ENVELOPED_SIGNATURE_TRANSFORM) | Enveloped signature transform URI |
| [EVENT\_TYPES](/docs/api-reference/variables/EVENT_TYPES) | Event type constants matching PHP sped-nfe |
| [IBGE\_TO\_UF](/docs/api-reference/variables/IBGE_TO_UF) | IBGE numeric code -> UF abbreviation (reverse lookup). |
| [LOCAL](/docs/api-reference/variables/LOCAL) | Standard LOCAL TXT layout. |
| [LOCAL\_V12](/docs/api-reference/variables/LOCAL_V12) | LOCAL v1.2 TXT layout. |
| [LOCAL\_V13](/docs/api-reference/variables/LOCAL_V13) | LOCAL v1.3 TXT layout. |
| [NFCE\_QRCODE\_URLS](/docs/api-reference/variables/NFCE_QRCODE_URLS) | NFC-e QR Code base URLs per environment and state |
| [NFE\_NAMESPACE](/docs/api-reference/variables/NFE_NAMESPACE) | NF-e XML namespace |
| [NFE\_PROC\_NAMESPACE](/docs/api-reference/variables/NFE_PROC_NAMESPACE) | NF-e process namespace (for procNFe wrapper) |
| [NFE\_VERSION](/docs/api-reference/variables/NFE_VERSION) | NF-e version (currently 4.00) |
| [NFE\_WSDL\_NS](/docs/api-reference/variables/NFE_WSDL_NS) | SEFAZ NF-e WSDL base namespace |
| [PAYMENT\_TYPES](/docs/api-reference/variables/PAYMENT_TYPES) | Default payment type codes (tPag) mapped by friendly name |
| [SEBRAE](/docs/api-reference/variables/SEBRAE) | SEBRAE TXT layout. |
| [SEFAZ\_STATUS](/docs/api-reference/variables/SEFAZ_STATUS) | SEFAZ status codes (cStat) used across the fiscal module. These replace magic numbers scattered in invoice-service.ts, complement.ts, etc. Reference: Manual de Orientacao do Contribuinte (MOC) v7.0+ |
| [SOAP\_ENVELOPE\_NS](/docs/api-reference/variables/SOAP_ENVELOPE_NS) | SOAP envelope namespace for SEFAZ web service requests |
| [STATE\_IBGE\_CODES](/docs/api-reference/variables/STATE_IBGE_CODES) | UF abbreviation -> IBGE numeric code (cUF). |
| [STRUCTURE\_310](/docs/api-reference/variables/STRUCTURE_310) | TXT structure for NFe version 3.10. |
| [STRUCTURE\_400](/docs/api-reference/variables/STRUCTURE_400) | TXT structure for NFe version 4.00 (standard LOCAL layout). |
| [STRUCTURE\_400\_SEBRAE](/docs/api-reference/variables/STRUCTURE_400_SEBRAE) | TXT structure for NFe version 4.00 (SEBRAE layout). |
| [STRUCTURE\_400\_V12](/docs/api-reference/variables/STRUCTURE_400_V12) | TXT structure for NFe version 4.00 (LOCAL v1.2 layout). |
| [STRUCTURE\_400\_V13](/docs/api-reference/variables/STRUCTURE_400_V13) | TXT structure for NFe version 4.00 (LOCAL v1.3 layout). |
| [VALID\_EVENT\_STATUSES](/docs/api-reference/variables/VALID_EVENT_STATUSES) | Valid cStat values for cancellation and event responses. 135 = event registered, 136 = registered but unlinked, 155 = already cancelled. |
| [VALID\_PROTOCOL\_STATUSES](/docs/api-reference/variables/VALID_PROTOCOL_STATUSES) | Valid cStat values when attaching a protocol to a signed NFe (nfeProc). These statuses indicate the NFe was processed (authorized or denied) and the protocol can be attached. |
| [XMLDSIG\_NAMESPACE](/docs/api-reference/variables/XMLDSIG_NAMESPACE) | XML Digital Signature namespace |

## Functions

| Function | Description |
| ------ | ------ |
| [adjustNfeForContingency](/docs/api-reference/functions/adjustNfeForContingency) | Adjust NF-e XML for contingency mode. |
| [attachB2B](/docs/api-reference/functions/attachB2B) | Attach a B2B financial tag to an authorized nfeProc XML. Wraps the nfeProc and B2B content in a `<nfeProcB2B>` element. |
| [attachB2bTag](/docs/api-reference/functions/attachB2bTag) | Build b2b tag for nfeProc. |
| [attachCancellation](/docs/api-reference/functions/attachCancellation) | Attach a cancellation event response to an authorized nfeProc XML. Appends the `<retEvento>` node inside the `<nfeProc>` wrapper. |
| [attachEventProtocol](/docs/api-reference/functions/attachEventProtocol) | Attach an event protocol response to the event request, producing the `procEventoNFe` wrapper. |
| [attachInutilizacao](/docs/api-reference/functions/attachInutilizacao) | Attach the SEFAZ inutilizacao response to the request, producing the `ProcInutNFe` wrapper. |
| [attachProtocol](/docs/api-reference/functions/attachProtocol) | Attach the SEFAZ authorization protocol to a signed NFe XML, producing the `nfeProc` wrapper required for storage and DANFE. |
| [buildAccessKey](/docs/api-reference/functions/buildAccessKey) | Build the access key (chave de acesso) -- 44 digits. Delegates to AccessKey.build(); kept for backward compatibility. |
| [buildAccessKeyQueryXml](/docs/api-reference/functions/buildAccessKeyQueryXml) | Build access key query request XML (consSitNFe). |
| [buildAceiteDebito](/docs/api-reference/functions/buildAceiteDebito) | tpEvento=211128 -- Debit acceptance in tax assessment |
| [buildApropriacaoCreditoBens](/docs/api-reference/functions/buildApropriacaoCreditoBens) | tpEvento=211150 -- Goods and services credit appropriation request |
| [buildApropriacaoCreditoComb](/docs/api-reference/functions/buildApropriacaoCreditoComb) | tpEvento=211140 -- Fuel credit appropriation request |
| [buildAtualizacaoDataEntrega](/docs/api-reference/functions/buildAtualizacaoDataEntrega) | tpEvento=112150 -- Update estimated delivery date |
| [buildAuthorizationRequestXml](/docs/api-reference/functions/buildAuthorizationRequestXml) | Build the authorization request XML (envelope for sending an NF-e). |
| [buildBatchEventXml](/docs/api-reference/functions/buildBatchEventXml) | Build batch event XML (generic, multiple events in one envelope). |
| [buildBatchManifestationXml](/docs/api-reference/functions/buildBatchManifestationXml) | Build batch manifestation XML (multiple events in one envelope). |
| [buildBatchSubmissionXml](/docs/api-reference/functions/buildBatchSubmissionXml) | Build batch submission request XML (enviNFe). |
| [buildCadastroQueryXml](/docs/api-reference/functions/buildCadastroQueryXml) | Build cadastro query request XML (ConsCad). |
| [buildCancelaEvento](/docs/api-reference/functions/buildCancelaEvento) | tpEvento=110001 -- Event cancellation (cancel a previously registered event) |
| [buildCancellationEventXml](/docs/api-reference/functions/buildCancellationEventXml) | Build cancellation event XML (using the generic event builder). |
| [buildCancellationXml](/docs/api-reference/functions/buildCancellationXml) | Build cancellation event XML. |
| [buildCCeXml](/docs/api-reference/functions/buildCCeXml) | Build Carta de Correcao (CCe) event XML. |
| [buildCofinsStXml](/docs/api-reference/functions/buildCofinsStXml) | Build COFINS-ST XML string (backward-compatible wrapper). |
| [buildCofinsXml](/docs/api-reference/functions/buildCofinsXml) | Build COFINS XML string (backward-compatible wrapper). |
| [buildConciliacaoXml](/docs/api-reference/functions/buildConciliacaoXml) | Build conciliation event XML. |
| [buildCscXml](/docs/api-reference/functions/buildCscXml) | Build CSC admin request XML (admCscNFCe). |
| [buildDeliveryFailureCancellationXml](/docs/api-reference/functions/buildDeliveryFailureCancellationXml) | Build delivery failure cancellation event XML. |
| [buildDeliveryFailureXml](/docs/api-reference/functions/buildDeliveryFailureXml) | Build delivery failure event XML (Insucesso na Entrega da NF-e). |
| [buildDeliveryProofCancellationXml](/docs/api-reference/functions/buildDeliveryProofCancellationXml) | Build delivery proof cancellation event XML. |
| [buildDeliveryProofXml](/docs/api-reference/functions/buildDeliveryProofXml) | Build delivery proof event XML (Comprovante de Entrega da NF-e). |
| [buildDestinoConsumoPessoal](/docs/api-reference/functions/buildDestinoConsumoPessoal) | tpEvento=211120 -- Item destination for personal consumption |
| [buildDistDFeQueryXml](/docs/api-reference/functions/buildDistDFeQueryXml) | Build DFe distribution query XML (distDFeInt). |
| [buildEpecNfceStatusXml](/docs/api-reference/functions/buildEpecNfceStatusXml) | Build consStatServ XML for EPEC NFC-e status check. |
| [buildEpecNfceXml](/docs/api-reference/functions/buildEpecNfceXml) | Build EPEC event XML for an NFC-e (model 65). |
| [buildEpecStatusXml](/docs/api-reference/functions/buildEpecStatusXml) | Build EPEC NFC-e status request XML (same as status but for EPEC service). |
| [buildEventId](/docs/api-reference/functions/buildEventId) | Build an event ID: ID{tpEvento}{chNFe}{seqPadded} |
| [buildEventXml](/docs/api-reference/functions/buildEventXml) | Build a generic SEFAZ event XML (evento inside envEvento). This produces the unsigned inner evento XML. Signing is done separately. |
| [buildExtensionCancellationXml](/docs/api-reference/functions/buildExtensionCancellationXml) | Build ECPP (cancel extension request) event XML. |
| [buildExtensionRequestXml](/docs/api-reference/functions/buildExtensionRequestXml) | Build EPP (extension request) event XML. |
| [buildFornecimentoNaoRealizado](/docs/api-reference/functions/buildFornecimentoNaoRealizado) | tpEvento=112140 -- Unfulfilled supply with prepayment |
| [buildIcmsPartXml](/docs/api-reference/functions/buildIcmsPartXml) | Build the ICMSPart XML group (partition between states). Used inside `<ICMS>` for CST 10 or 90 with interstate partition. |
| [buildIcmsStXml](/docs/api-reference/functions/buildIcmsStXml) | Build the ICMSST XML group (ST repasse). Used inside `<ICMS>` for CST 41 or 60 with interstate ST repasse. |
| [buildIcmsUfDestXml](/docs/api-reference/functions/buildIcmsUfDestXml) | Build the ICMSUFDest XML group (interstate to final consumer). This is a sibling of `<ICMS>`, placed directly inside `<imposto>`. |
| [buildIcmsXml](/docs/api-reference/functions/buildIcmsXml) | Build ICMS XML string (backward-compatible wrapper around calculateIcms). |
| [buildIiXml](/docs/api-reference/functions/buildIiXml) | Build II (import tax) XML string (backward-compatible wrapper). |
| [buildImobilizacaoItem](/docs/api-reference/functions/buildImobilizacaoItem) | tpEvento=211130 -- Item immobilization (fixed asset registration) |
| [buildImportacaoZFM](/docs/api-reference/functions/buildImportacaoZFM) | tpEvento=112120 -- ALC/ZFM import not converted to exemption |
| [buildImpostoDevol](/docs/api-reference/functions/buildImpostoDevol) | Build impostoDevol XML string (backward-compatible wrapper). |
| [buildInfoPagtoIntegral](/docs/api-reference/functions/buildInfoPagtoIntegral) | tpEvento=112110 -- Full payment confirmation event Ported from PHP TraitEventsRTC::sefazInfoPagtoIntegral() |
| [buildInfoPagtoIntegralXml](/docs/api-reference/functions/buildInfoPagtoIntegralXml) | Build info pagamento integral event XML (tpEvento 112110). |
| [buildInterestedActorXml](/docs/api-reference/functions/buildInterestedActorXml) | Build Ator Interessado event XML. |
| [buildInvoiceXml](/docs/api-reference/functions/buildInvoiceXml) | Build a complete NF-e or NFC-e XML (unsigned). The XML follows layout 4.00 as defined by MOC. |
| [buildIpiXml](/docs/api-reference/functions/buildIpiXml) | Build IPI XML string (backward-compatible wrapper). |
| [buildIssqnXml](/docs/api-reference/functions/buildIssqnXml) | Build ISSQN XML string and accumulate totals (backward-compatible wrapper). |
| [buildIsXml](/docs/api-reference/functions/buildIsXml) | Build IS XML string (backward-compatible wrapper). |
| [buildManifestacaoTransfCredCBS](/docs/api-reference/functions/buildManifestacaoTransfCredCBS) | tpEvento=212120 -- Manifestation on CBS credit transfer request |
| [buildManifestacaoTransfCredIBS](/docs/api-reference/functions/buildManifestacaoTransfCredIBS) | tpEvento=212110 -- Manifestation on IBS credit transfer request |
| [buildManifestationXml](/docs/api-reference/functions/buildManifestationXml) | Build recipient manifestation event XML. |
| [buildNfceConsultUrl](/docs/api-reference/functions/buildNfceConsultUrl) | Build the NFC-e urlChave tag content for consulting the NFe by access key. |
| [buildNfceQrCodeUrl](/docs/api-reference/functions/buildNfceQrCodeUrl) | Build the NFC-e QR Code URL. |
| [buildPisStXml](/docs/api-reference/functions/buildPisStXml) | Build PIS-ST XML string (backward-compatible wrapper). |
| [buildPisXml](/docs/api-reference/functions/buildPisXml) | Build PIS XML string (backward-compatible wrapper). |
| [buildReceiptQueryXml](/docs/api-reference/functions/buildReceiptQueryXml) | Build receipt query request XML (consReciNFe). |
| [buildRouboPerdaTransporteAdquirente](/docs/api-reference/functions/buildRouboPerdaTransporteAdquirente) | tpEvento=211124 -- Perishment, loss, theft by acquirer (FOB) |
| [buildRouboPerdaTransporteFornecedor](/docs/api-reference/functions/buildRouboPerdaTransporteFornecedor) | tpEvento=112130 -- Perishment, loss, theft by supplier (CIF) |
| [buildSolApropCredPresumido](/docs/api-reference/functions/buildSolApropCredPresumido) | tpEvento=211110 -- Deemed credit appropriation request |
| [buildStatusRequestXml](/docs/api-reference/functions/buildStatusRequestXml) | Build the status service request XML. |
| [buildSubstitutionCancellationXml](/docs/api-reference/functions/buildSubstitutionCancellationXml) | Build substitution cancellation event XML (for NFC-e model 65 only). |
| [buildTestNfceXml](/docs/api-reference/functions/buildTestNfceXml) | Build a minimal NFC-e XML for testing EPEC. |
| [buildVoidingXml](/docs/api-reference/functions/buildVoidingXml) | Build number voiding (inutilizacao) request XML. |
| [calculateCofins](/docs/api-reference/functions/calculateCofins) | Calculate COFINS tax element (domain logic, no XML). |
| [calculateCofinsSt](/docs/api-reference/functions/calculateCofinsSt) | Calculate COFINS-ST tax element (domain logic, no XML). |
| [calculateIcms](/docs/api-reference/functions/calculateIcms) | Calculate ICMS for a single item (domain logic, no XML dependency). Returns structured TaxElement + accumulated totals. |
| [calculateIi](/docs/api-reference/functions/calculateIi) | Calculate II (import tax) element (domain logic, no XML). |
| [calculateImpostoDevol](/docs/api-reference/functions/calculateImpostoDevol) | Calculate impostoDevol element (domain logic, no XML). |
| [calculateIpi](/docs/api-reference/functions/calculateIpi) | Calculate IPI tax element (domain logic, no XML). |
| [calculateIs](/docs/api-reference/functions/calculateIs) | Calculate IS tax element (domain logic, no XML dependency). Three mutually exclusive modes based on which fields are present. |
| [calculateIssqn](/docs/api-reference/functions/calculateIssqn) | Calculate ISSQN tax element and accumulate totals (domain logic, no XML). |
| [calculatePis](/docs/api-reference/functions/calculatePis) | Calculate PIS tax element (domain logic, no XML). |
| [calculatePisSt](/docs/api-reference/functions/calculatePisSt) | Calculate PIS-ST tax element (domain logic, no XML). |
| [checkRtcModel](/docs/api-reference/functions/checkRtcModel) | Validate that the model is 55 (NFe) and the access key also indicates model 55. RTC events only apply to model 55. Ported from PHP TraitEventsRTC::checkModel(). |
| [createIcmsTotals](/docs/api-reference/functions/createIcmsTotals) | Create a zeroed-out ICMS totals object. |
| [createIssqnTotals](/docs/api-reference/functions/createIssqnTotals) | Create a zeroed-out ISSQN totals object. |
| [defaultLotId](/docs/api-reference/functions/defaultLotId) | Generate lot ID from explicit value or Date.now() fallback |
| [escapeXml](/docs/api-reference/functions/escapeXml) | Escape special XML characters in text content and attribute values |
| [extractCertFromPfx](/docs/api-reference/functions/extractCertFromPfx) | Extract certificate PEM from PFX using openssl CLI (with -legacy flag). |
| [extractKeyFromPfx](/docs/api-reference/functions/extractKeyFromPfx) | Extract private key PEM from PFX using openssl CLI (with -legacy flag). |
| [extractXmlTagValue](/docs/api-reference/functions/extractXmlTagValue) | Extract text content of a simple XML tag from a raw XML string |
| [filterFields](/docs/api-reference/functions/filterFields) | Filter null entries from a TaxField array |
| [formatCents](/docs/api-reference/functions/formatCents) | Format cents integer to decimal string. E.g. 1050 -> "10.50" |
| [formatCentsOrNull](/docs/api-reference/functions/formatCentsOrNull) | Format cents to decimal string, returning null for null/undefined input |
| [formatCentsOrZero](/docs/api-reference/functions/formatCentsOrZero) | Format cents to decimal string, defaulting to "0.00" for null/undefined |
| [formatDateTimeBR](/docs/api-reference/functions/formatDateTimeBR) | Format a Date as ISO 8601 with Brazil timezone offset. SEFAZ rejects UTC "Z" suffix -- requires explicit offset like -03:00. |
| [formatDecimal](/docs/api-reference/functions/formatDecimal) | Format a number with N decimal places |
| [formatRate](/docs/api-reference/functions/formatRate) | Format rate stored as hundredths to decimal string. E.g. 1800 -> "18.0000" |
| [formatRate4](/docs/api-reference/functions/formatRate4) | Format rate stored as value * 10000 to 4-decimal string. E.g. 16500 -> "1.6500" |
| [formatRate4OrZero](/docs/api-reference/functions/formatRate4OrZero) | Format rate4 (value * 10000) to 4-decimal string, defaulting to "0.0000" for null/undefined |
| [getCertificateInfo](/docs/api-reference/functions/getCertificateInfo) | Extract certificate info for display (without exposing private key). |
| [getContingencyType](/docs/api-reference/functions/getContingencyType) | Get the contingency type for a given state. |
| [getEventDescription](/docs/api-reference/functions/getEventDescription) | Map event type to its description |
| [getNfceConsultationUri](/docs/api-reference/functions/getNfceConsultationUri) | Get the NFC-e consultation URI (urlChave) for a given state and environment. Used for QR Code and DANFCE consultation links. |
| [getSefazUrl](/docs/api-reference/functions/getSefazUrl) | Get the SEFAZ web service URL for a given state, service, environment and model. |
| [getStateByCode](/docs/api-reference/functions/getStateByCode) | Get the UF abbreviation for an IBGE numeric code. |
| [getStateCode](/docs/api-reference/functions/getStateCode) | Get the IBGE numeric code for a state abbreviation. |
| [getStructure](/docs/api-reference/functions/getStructure) | Get the appropriate structure for the given version and layout. |
| [getStructureByVersionString](/docs/api-reference/functions/getStructureByVersionString) | Get the appropriate structure for parsing, using a version string like "4.00" or "3.10". |
| [isValidGtin](/docs/api-reference/functions/isValidGtin) | Validate a GTIN-8/12/13/14 barcode number. |
| [isValidTxt](/docs/api-reference/functions/isValidTxt) | Validate a TXT representation of an NFe. Returns an empty array if valid, or an array of error strings if invalid. |
| [loadCertificate](/docs/api-reference/functions/loadCertificate) | Load private key and certificate from a PFX/PKCS12 buffer. |
| [loadStructure](/docs/api-reference/functions/loadStructure) | Load the TXT structure definition for the given version and layout. |
| [lookupCep](/docs/api-reference/functions/lookupCep) | Lookup address by CEP using ViaCEP with BrasilAPI as fallback. |
| [mergeIcmsTotals](/docs/api-reference/functions/mergeIcmsTotals) | Merge item-level ICMS totals into an accumulator. |
| [optionalField](/docs/api-reference/functions/optionalField) | Helper: create an optional field (returns null if value is nullish) |
| [parseAuthorizationResponse](/docs/api-reference/functions/parseAuthorizationResponse) | Parse authorization response (NfeAutorizacao / NfeRetAutorizacao). |
| [parseCancellationResponse](/docs/api-reference/functions/parseCancellationResponse) | Parse cancellation event response. |
| [parseStatusResponse](/docs/api-reference/functions/parseStatusResponse) | Parse the SEFAZ service status response (NfeStatusServico). |
| [putQRTag](/docs/api-reference/functions/putQRTag) | Insert QR Code and urlChave tags into a signed NFC-e XML. |
| [requiredField](/docs/api-reference/functions/requiredField) | Helper: create a required field (throws if value is nullish) |
| [resolveVerAplic](/docs/api-reference/functions/resolveVerAplic) | Resolve verAplic: explicit > config > default "4.00" |
| [sefazRequest](/docs/api-reference/functions/sefazRequest) | Send a SOAP 1.2 request to a SEFAZ web service with mutual TLS (client certificate). Uses curl with PEM cert/key extracted from PFX, because Bun's node:https does not fully support mTLS with PFX (ECONNREFUSED on Agent with pfx option). |
| [serializeTaxElement](/docs/api-reference/functions/serializeTaxElement) | Serialize a TaxElement to an XML string. |
| [signEventXml](/docs/api-reference/functions/signEventXml) | Sign a SEFAZ event XML (cancelamento, CCe, etc.) with XMLDSig. Same as signXml() but references <infEvento> inside <evento>. |
| [signXml](/docs/api-reference/functions/signXml) | Sign an NF-e XML string with XMLDSig enveloped signature using xml-crypto. Covers <infNFe> with C14N canonicalization, SHA-1 digest, RSA-SHA1 signature. |
| [tag](/docs/api-reference/functions/tag) | Build an XML tag with optional attributes and children. |
| [toArray](/docs/api-reference/functions/toArray) | Convert an NFe XML string to a plain object (like PHP's toArray). |
| [toJson](/docs/api-reference/functions/toJson) | Convert an NFe XML string to a JSON string. |
| [toStd](/docs/api-reference/functions/toStd) | Convert an NFe XML string to a normalized object (like PHP's toStd). In TypeScript this is equivalent to toArray since we don't have stdClass. |
| [validate](/docs/api-reference/functions/validate) | Validate a fiscal configuration JSON string. Returns the parsed config object on success, throws on failure. |
| [validateAccessKey](/docs/api-reference/functions/validateAccessKey) | Validate access key format and throw if invalid. |
| [whichIs](/docs/api-reference/functions/whichIs) | Identify which NFe document type an XML string represents. |

## References

### ~~STATE\_CODES~~

Renames and re-exports [STATE_IBGE_CODES](/docs/api-reference/variables/STATE_IBGE_CODES)
