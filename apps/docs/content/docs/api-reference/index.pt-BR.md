---
layout: docs
title: "API Reference"
---



## Classes

| Class | Description |
| ------ | ------ |
| [AccessKey](/docs/api-reference/classes/AccessKey) | Chave de acesso NF-e/NFC-e imutavel de 44 digitos com metodos de extracao de componentes. |
| [Contingency](/docs/api-reference/classes/Contingency) | Gerencia ativacao e desativacao do modo de contingencia NF-e/NFC-e. |
| [Convert](/docs/api-reference/classes/Convert) | Converte representacao SPED TXT de documentos NF-e para XML. |
| [ParserError](/docs/api-reference/classes/ParserError) | Erro lancado quando o parsing de TXT falha. |
| [TaxId](/docs/api-reference/classes/TaxId) | Wrapper imutavel para CPF ou CNPJ com formatacao e helpers XML. |

## Interfaces

| Interface | Description |
| ------ | ------ |
| [AccessKeyParams](/docs/api-reference/interfaces/AccessKeyParams) | Componentes da chave de acesso da NF-e/NFC-e |
| [ArmaData](/docs/api-reference/interfaces/ArmaData) | Detalhes de armamento (arma) -- dentro de prod, até 500 por item |
| [CepResult](/docs/api-reference/interfaces/CepResult) | Resultado de endereco de uma consulta de CEP. |
| [CertificateData](/docs/api-reference/interfaces/CertificateData) | Certificado digital carregado de arquivo PFX |
| [CertificateInfo](/docs/api-reference/interfaces/CertificateInfo) | Informações do certificado digital para exibição |
| [CofinsData](/docs/api-reference/interfaces/CofinsData) | Dados de entrada da COFINS. Valores monetários em centavos, alíquotas como inteiro * 10000. |
| [CofinsStData](/docs/api-reference/interfaces/CofinsStData) | Dados de entrada da COFINS-ST (substituição tributária). |
| [CombustivelItem](/docs/api-reference/interfaces/CombustivelItem) | Item para o evento de apropriacao de credito de combustivel |
| [ConsumoItem](/docs/api-reference/interfaces/ConsumoItem) | Item para o evento de destinacao para consumo pessoal |
| [ContingencyConfig](/docs/api-reference/interfaces/ContingencyConfig) | Dados de configuracao de contingencia. |
| [CreditoBensItem](/docs/api-reference/interfaces/CreditoBensItem) | Item para o evento de apropriacao de credito para bens e servicos |
| [CredPresumidoItem](/docs/api-reference/interfaces/CredPresumidoItem) | Item para o evento de apropriacao de credito presumido |
| [DFeReferenciadoData](/docs/api-reference/interfaces/DFeReferenciadoData) | DF-e referenciado por item (DFeReferenciado) -- dentro de det, schema PL_010 |
| [EpecNfceConfig](/docs/api-reference/interfaces/EpecNfceConfig) | Configuracao para construcao de evento EPEC NFC-e. |
| [FiscalConfig](/docs/api-reference/interfaces/FiscalConfig) | Estrutura do objeto de configuracao fiscal. |
| [FiscalSettings](/docs/api-reference/interfaces/FiscalSettings) | Configurações fiscais do banco de dados (sem PFX bruto) |
| [IcmsData](/docs/api-reference/interfaces/IcmsData) | Dados unificados para todas as variações de ICMS. |
| [IcmsTotals](/docs/api-reference/interfaces/IcmsTotals) | Totais acumulados de ICMS entre todos os itens. |
| [IiData](/docs/api-reference/interfaces/IiData) | Dados de entrada do II (Imposto de Importação). |
| [ImobilizacaoItem](/docs/api-reference/interfaces/ImobilizacaoItem) | Item para o evento de imobilizacao de ativo |
| [ImportacaoZFMItem](/docs/api-reference/interfaces/ImportacaoZFMItem) | Item para o evento de importacao em ALC/ZFM nao convertida em isencao |
| [InvoiceBuildData](/docs/api-reference/interfaces/InvoiceBuildData) | Dados necessários para construir o XML da nota fiscal |
| [InvoiceItemData](/docs/api-reference/interfaces/InvoiceItemData) | Dados do item para construção do XML |
| [IpiData](/docs/api-reference/interfaces/IpiData) | Dados de entrada do IPI (Imposto sobre Produtos Industrializados). |
| [IsData](/docs/api-reference/interfaces/IsData) | Dados de entrada do IS (Imposto Seletivo / IBS+CBS) -- reforma tributária PL_010. |
| [IssqnData](/docs/api-reference/interfaces/IssqnData) | Dados de entrada do ISSQN (ISS - Imposto Sobre Serviços). |
| [IssqnTotals](/docs/api-reference/interfaces/IssqnTotals) | Acumulador de totais do ISSQN (espelha stdISSQNTot do PHP). |
| [ItemNaoFornecido](/docs/api-reference/interfaces/ItemNaoFornecido) | Item para o evento de fornecimento nao realizado com pagamento antecipado |
| [MedData](/docs/api-reference/interfaces/MedData) | Detalhes de medicamento (med) -- dentro de prod |
| [NfceQrCodeParams](/docs/api-reference/interfaces/NfceQrCodeParams) | Parametros para construcao da URL do QR Code NFC-e. |
| [ObsItemData](/docs/api-reference/interfaces/ObsItemData) | Observações por item (obsItem) -- dentro de det |
| [PaymentData](/docs/api-reference/interfaces/PaymentData) | Dados de pagamento da nota fiscal |
| [PerecimentoAdquirenteItem](/docs/api-reference/interfaces/PerecimentoAdquirenteItem) | Item para o evento de perecimento/perda/roubo/furto pelo adquirente (FOB) |
| [PerecimentoFornecedorItem](/docs/api-reference/interfaces/PerecimentoFornecedorItem) | Item para o evento de perecimento/perda/roubo/furto pelo fornecedor (CIF) |
| [PisData](/docs/api-reference/interfaces/PisData) | Dados de entrada do PIS. Valores monetários em centavos, alíquotas como inteiro * 10000. |
| [PisStData](/docs/api-reference/interfaces/PisStData) | Dados de entrada do PIS-ST (substituição tributária). |
| [PutQRTagParams](/docs/api-reference/interfaces/PutQRTagParams) | Parametros para insercao do QR Code no XML da NFC-e. |
| [RastroData](/docs/api-reference/interfaces/RastroData) | Rastreabilidade de lote -- até 500 por item, dentro de prod |
| [RetTribData](/docs/api-reference/interfaces/RetTribData) | Tributos retidos (retTrib) -- dentro de total |
| [SefazReformConfig](/docs/api-reference/interfaces/SefazReformConfig) | Configuracao para os construtores de eventos da reforma tributaria SEFAZ |
| [SefazResponse](/docs/api-reference/interfaces/SefazResponse) | Resposta da SEFAZ após processamento |
| [TaxElement](/docs/api-reference/interfaces/TaxElement) | Structured representation of a tax XML element. |
| [TaxField](/docs/api-reference/interfaces/TaxField) | A single XML field: <name>value</name> |
| [VeicProdData](/docs/api-reference/interfaces/VeicProdData) | Detalhes do veículo (veicProd) -- dentro de prod |

## Type Aliases

| Type Alias | Description |
| ------ | ------ |
| [ContingencyType](/docs/api-reference/type-aliases/ContingencyType) | Tipo de contingência para emissão de NF-e em caso de falha |
| [ContingencyTypeName](/docs/api-reference/type-aliases/ContingencyTypeName) | Nome do tipo de contingencia: SVCAN, SVCRS ou vazio (modo normal). |
| [DestIdType](/docs/api-reference/type-aliases/DestIdType) | Tipo de identificacao do destinatario: 1=CNPJ, 2=CPF, 3=estrangeiro, ""=sem dest. |
| [EmissionType](/docs/api-reference/type-aliases/EmissionType) | Tipo de emissão (tpEmis): 1=normal, 6=SVC-AN, 7=SVC-RS, 9=contingência offline |
| [InvoiceModel](/docs/api-reference/type-aliases/InvoiceModel) | Modelo da NF-e: 55 = NF-e (entre empresas), 65 = NFC-e (consumidor) |
| [InvoiceStatus](/docs/api-reference/type-aliases/InvoiceStatus) | Ciclo de vida do status da nota fiscal |
| [QrCodeVersion](/docs/api-reference/type-aliases/QrCodeVersion) | Versao do QR Code: 200 (v2) ou 300 (v3, NT 2025.001). |
| [SefazEnvironment](/docs/api-reference/type-aliases/SefazEnvironment) | Ambiente SEFAZ: 1 = produção, 2 = homologação |
| [SefazService](/docs/api-reference/type-aliases/SefazService) | Nomes dos web services SEFAZ usados nas requisições SOAP |
| [TaxRegime](/docs/api-reference/type-aliases/TaxRegime) | Código de Regime Tributário (CRT): 1=Simples Nacional, 2=Excesso Simples, 3=Normal |

## Variables

| Variable | Description |
| ------ | ------ |
| [C14N\_ALGORITHM](/docs/api-reference/variables/C14N_ALGORITHM) | URI do algoritmo de canonicalização C14N |
| [ENVELOPED\_SIGNATURE\_TRANSFORM](/docs/api-reference/variables/ENVELOPED_SIGNATURE_TRANSFORM) | URI da transformação de assinatura envelopada |
| [EVENT\_TYPES](/docs/api-reference/variables/EVENT_TYPES) | Constantes de tipos de evento compativeis com o sped-nfe PHP |
| [IBGE\_TO\_UF](/docs/api-reference/variables/IBGE_TO_UF) | IBGE numeric code -> UF abbreviation (reverse lookup). |
| [LAYOUT\_LOCAL](/docs/api-reference/variables/LAYOUT_LOCAL) | Layout LOCAL padrao |
| [LAYOUT\_LOCAL\_V12](/docs/api-reference/variables/LAYOUT_LOCAL_V12) | Layout LOCAL v1.2 |
| [LAYOUT\_LOCAL\_V13](/docs/api-reference/variables/LAYOUT_LOCAL_V13) | Layout LOCAL v1.3 |
| [LAYOUT\_SEBRAE](/docs/api-reference/variables/LAYOUT_SEBRAE) | Layout SEBRAE |
| [LOCAL](/docs/api-reference/variables/LOCAL) | Layout TXT LOCAL padrao. |
| [LOCAL\_V12](/docs/api-reference/variables/LOCAL_V12) | Layout TXT LOCAL v1.2. |
| [LOCAL\_V13](/docs/api-reference/variables/LOCAL_V13) | Layout TXT LOCAL v1.3. |
| [NFCE\_QRCODE\_URLS](/docs/api-reference/variables/NFCE_QRCODE_URLS) | URLs base do QR Code da NFC-e por ambiente e estado |
| [NFE\_NAMESPACE](/docs/api-reference/variables/NFE_NAMESPACE) | Namespace XML da NF-e |
| [NFE\_PROC\_NAMESPACE](/docs/api-reference/variables/NFE_PROC_NAMESPACE) | Namespace do processo NF-e (para wrapper procNFe) |
| [NFE\_VERSION](/docs/api-reference/variables/NFE_VERSION) | Versão do layout da NF-e (atualmente 4.00) |
| [NFE\_WSDL\_NS](/docs/api-reference/variables/NFE_WSDL_NS) | Namespace base WSDL da NF-e SEFAZ |
| [PAYMENT\_TYPES](/docs/api-reference/variables/PAYMENT_TYPES) | Códigos de tipo de pagamento (tPag) mapeados por nome amigável |
| [SEBRAE](/docs/api-reference/variables/SEBRAE) | Layout TXT SEBRAE. |
| [SEFAZ\_STATUS](/docs/api-reference/variables/SEFAZ_STATUS) | Codigos de status da SEFAZ (cStat) usados no modulo fiscal. |
| [SOAP\_ENVELOPE\_NS](/docs/api-reference/variables/SOAP_ENVELOPE_NS) | Namespace do envelope SOAP para requisições aos web services SEFAZ |
| [STATE\_IBGE\_CODES](/docs/api-reference/variables/STATE_IBGE_CODES) | UF abbreviation -> IBGE numeric code (cUF). |
| [STRUCTURE\_310](/docs/api-reference/variables/STRUCTURE_310) | Estrutura TXT para NFe versao 3.10. |
| [STRUCTURE\_400](/docs/api-reference/variables/STRUCTURE_400) | Estrutura TXT para NFe versao 4.00 (layout LOCAL padrao). |
| [STRUCTURE\_400\_SEBRAE](/docs/api-reference/variables/STRUCTURE_400_SEBRAE) | Estrutura TXT para NFe versao 4.00 (layout SEBRAE). |
| [STRUCTURE\_400\_V12](/docs/api-reference/variables/STRUCTURE_400_V12) | Estrutura TXT para NFe versao 4.00 (layout LOCAL v1.2). |
| [STRUCTURE\_400\_V13](/docs/api-reference/variables/STRUCTURE_400_V13) | Estrutura TXT para NFe versao 4.00 (layout LOCAL v1.3). |
| [VALID\_EVENT\_STATUSES](/docs/api-reference/variables/VALID_EVENT_STATUSES) | Valores validos de cStat para respostas de cancelamento e eventos. |
| [VALID\_PROTOCOL\_STATUSES](/docs/api-reference/variables/VALID_PROTOCOL_STATUSES) | Valores validos de cStat ao anexar protocolo a uma NFe assinada (nfeProc). |
| [XMLDSIG\_NAMESPACE](/docs/api-reference/variables/XMLDSIG_NAMESPACE) | Namespace da assinatura digital XML |

## Functions

| Function | Description |
| ------ | ------ |
| [adjustNfeForContingency](/docs/api-reference/functions/adjustNfeForContingency) | Ajusta XML de NF-e para modo de contingencia. |
| [attachB2B](/docs/api-reference/functions/attachB2B) | Anexa uma tag financeira B2B ao XML autorizado nfeProc. |
| [attachB2bTag](/docs/api-reference/functions/attachB2bTag) | Anexa a tag B2B (NFeB2BFin) ao XML do nfeProc. |
| [attachCancellation](/docs/api-reference/functions/attachCancellation) | Anexa a resposta do evento de cancelamento ao XML autorizado nfeProc. |
| [attachEventProtocol](/docs/api-reference/functions/attachEventProtocol) | Anexa a resposta do protocolo de evento à requisição, |
| [attachInutilizacao](/docs/api-reference/functions/attachInutilizacao) | Anexa a resposta de inutilização da SEFAZ à requisição, |
| [attachProtocol](/docs/api-reference/functions/attachProtocol) | Anexa o protocolo de autorização da SEFAZ ao XML assinado da NFe, |
| [buildAccessKey](/docs/api-reference/functions/buildAccessKey) | Gera a chave de acesso -- 44 dígitos. |
| [buildAccessKeyQueryXml](/docs/api-reference/functions/buildAccessKeyQueryXml) | Constroi o XML de consulta por chave de acesso (consSitNFe). |
| [buildAceiteDebito](/docs/api-reference/functions/buildAceiteDebito) | tpEvento=211128 -- Aceite de debito na apuracao |
| [buildApropriacaoCreditoBens](/docs/api-reference/functions/buildApropriacaoCreditoBens) | tpEvento=211150 -- Solicitacao de Apropriacao de Credito para bens e servicos |
| [buildApropriacaoCreditoComb](/docs/api-reference/functions/buildApropriacaoCreditoComb) | tpEvento=211140 -- Solicitacao de Apropriacao de Credito de Combustivel |
| [buildAtualizacaoDataEntrega](/docs/api-reference/functions/buildAtualizacaoDataEntrega) | tpEvento=112150 -- Atualizacao da data de previsao de entrega |
| [buildAuthorizationRequestXml](/docs/api-reference/functions/buildAuthorizationRequestXml) | Constroi o XML de autorizacao (envelope enviNFe para transmissao da NF-e). |
| [buildBatchEventXml](/docs/api-reference/functions/buildBatchEventXml) | Constroi o XML generico de eventos em lote (multiplos eventos em um envelope). |
| [buildBatchManifestationXml](/docs/api-reference/functions/buildBatchManifestationXml) | Constroi o XML de manifestacao em lote (multiplos eventos em um envelope). |
| [buildBatchSubmissionXml](/docs/api-reference/functions/buildBatchSubmissionXml) | Constroi o XML de envio em lote (enviNFe). |
| [buildCadastroQueryXml](/docs/api-reference/functions/buildCadastroQueryXml) | Constroi o XML de consulta cadastral (ConsCad) por CNPJ, IE ou CPF. |
| [buildCancelaEvento](/docs/api-reference/functions/buildCancelaEvento) | tpEvento=110001 -- Cancelamento de Evento |
| [buildCancellationEventXml](/docs/api-reference/functions/buildCancellationEventXml) | Constroi o XML do evento de cancelamento (via construtor generico de eventos). |
| [buildCancellationXml](/docs/api-reference/functions/buildCancellationXml) | Constroi o XML do evento de cancelamento da NF-e. |
| [buildCCeXml](/docs/api-reference/functions/buildCCeXml) | Constroi o XML do evento Carta de Correcao Eletronica (CC-e). |
| [buildCofinsStXml](/docs/api-reference/functions/buildCofinsStXml) | Gera a string XML da COFINS-ST (wrapper compatível). |
| [buildCofinsXml](/docs/api-reference/functions/buildCofinsXml) | Gera a string XML da COFINS (wrapper compatível). |
| [buildConciliacaoXml](/docs/api-reference/functions/buildConciliacaoXml) | Constroi o XML do evento de Conciliacao Financeira. |
| [buildCscXml](/docs/api-reference/functions/buildCscXml) | Constroi o XML de administracao do CSC para NFC-e (admCscNFCe). |
| [buildDeliveryFailureCancellationXml](/docs/api-reference/functions/buildDeliveryFailureCancellationXml) | Constroi o XML do evento de cancelamento do Insucesso na Entrega. |
| [buildDeliveryFailureXml](/docs/api-reference/functions/buildDeliveryFailureXml) | Constroi o XML do evento de Insucesso na Entrega da NF-e. |
| [buildDeliveryProofCancellationXml](/docs/api-reference/functions/buildDeliveryProofCancellationXml) | Constroi o XML do evento de cancelamento do Comprovante de Entrega. |
| [buildDeliveryProofXml](/docs/api-reference/functions/buildDeliveryProofXml) | Constroi o XML do evento Comprovante de Entrega da NF-e. |
| [buildDestinoConsumoPessoal](/docs/api-reference/functions/buildDestinoConsumoPessoal) | tpEvento=211120 -- Destinacao de item para consumo pessoal |
| [buildDistDFeQueryXml](/docs/api-reference/functions/buildDistDFeQueryXml) | Constroi o XML de consulta de distribuicao de DF-e (distDFeInt). |
| [buildEpecNfceStatusXml](/docs/api-reference/functions/buildEpecNfceStatusXml) | Constroi XML consStatServ para consulta de status EPEC NFC-e. |
| [buildEpecNfceXml](/docs/api-reference/functions/buildEpecNfceXml) | Constroi XML do evento EPEC para NFC-e (modelo 65). |
| [buildEpecStatusXml](/docs/api-reference/functions/buildEpecStatusXml) | Constroi o XML de consulta de status EPEC NFC-e (apenas SP, modelo 65). |
| [buildEventId](/docs/api-reference/functions/buildEventId) | Build an event ID: ID{tpEvento}{chNFe}{seqPadded} |
| [buildEventXml](/docs/api-reference/functions/buildEventXml) | Constroi o XML generico de evento SEFAZ (evento dentro de envEvento). |
| [buildExtensionCancellationXml](/docs/api-reference/functions/buildExtensionCancellationXml) | Constroi o XML do evento de Cancelamento de Pedido de Prorrogacao (ECPP). |
| [buildExtensionRequestXml](/docs/api-reference/functions/buildExtensionRequestXml) | Constroi o XML do evento de Pedido de Prorrogacao (EPP). |
| [buildFornecimentoNaoRealizado](/docs/api-reference/functions/buildFornecimentoNaoRealizado) | tpEvento=112140 -- Fornecimento nao realizado com pagamento antecipado |
| [buildIcmsPartXml](/docs/api-reference/functions/buildIcmsPartXml) | Gera o grupo XML ICMSPart (partilha entre estados). |
| [buildIcmsStXml](/docs/api-reference/functions/buildIcmsStXml) | Gera o grupo XML ICMSST (repasse de ST). |
| [buildIcmsUfDestXml](/docs/api-reference/functions/buildIcmsUfDestXml) | Gera o grupo XML ICMSUFDest (interestadual para consumidor final). |
| [buildIcmsXml](/docs/api-reference/functions/buildIcmsXml) | Gera a string XML do ICMS (wrapper compatível sobre calculateIcms). |
| [buildIiXml](/docs/api-reference/functions/buildIiXml) | Gera a string XML do II (Imposto de Importação) (wrapper compatível). |
| [buildImobilizacaoItem](/docs/api-reference/functions/buildImobilizacaoItem) | tpEvento=211130 -- Imobilizacao de Item |
| [buildImportacaoZFM](/docs/api-reference/functions/buildImportacaoZFM) | tpEvento=112120 -- Importacao em ALC/ZFM nao convertida em isencao |
| [buildImpostoDevol](/docs/api-reference/functions/buildImpostoDevol) | Gera a string XML do impostoDevol (wrapper compatível). |
| [buildInfoPagtoIntegral](/docs/api-reference/functions/buildInfoPagtoIntegral) | tpEvento=112110 -- Informacao de efetivo pagamento integral |
| [buildInfoPagtoIntegralXml](/docs/api-reference/functions/buildInfoPagtoIntegralXml) | Constroi o XML do evento Informacao de Pagamento Integral (tpEvento 112110). |
| [buildInterestedActorXml](/docs/api-reference/functions/buildInterestedActorXml) | Constroi o XML do evento Ator Interessado na NF-e. |
| [buildInvoiceXml](/docs/api-reference/functions/buildInvoiceXml) | Constrói o XML completo da NF-e/NFC-e (sem assinatura). |
| [buildIpiXml](/docs/api-reference/functions/buildIpiXml) | Gera a string XML do IPI (wrapper compatível). |
| [buildIssqnXml](/docs/api-reference/functions/buildIssqnXml) | Gera a string XML do ISSQN e acumula totais (wrapper compatível). |
| [buildIsXml](/docs/api-reference/functions/buildIsXml) | Gera a string XML do IS (wrapper compatível). |
| [buildManifestacaoTransfCredCBS](/docs/api-reference/functions/buildManifestacaoTransfCredCBS) | tpEvento=212120 -- Manifestacao sobre Pedido de Transferencia de Credito de CBS |
| [buildManifestacaoTransfCredIBS](/docs/api-reference/functions/buildManifestacaoTransfCredIBS) | tpEvento=212110 -- Manifestacao sobre Pedido de Transferencia de Credito de IBS |
| [buildManifestationXml](/docs/api-reference/functions/buildManifestationXml) | Constroi o XML do evento de manifestacao do destinatario. |
| [buildNfceConsultUrl](/docs/api-reference/functions/buildNfceConsultUrl) | Constroi o conteudo da tag urlChave para consulta da NFe pela chave de acesso. |
| [buildNfceQrCodeUrl](/docs/api-reference/functions/buildNfceQrCodeUrl) | Constroi a URL do QR Code NFC-e. |
| [buildPisStXml](/docs/api-reference/functions/buildPisStXml) | Gera a string XML do PIS-ST (wrapper compatível). |
| [buildPisXml](/docs/api-reference/functions/buildPisXml) | Gera a string XML do PIS (wrapper compatível). |
| [buildReceiptQueryXml](/docs/api-reference/functions/buildReceiptQueryXml) | Constroi o XML de consulta de recibo (consReciNFe). |
| [buildRouboPerdaTransporteAdquirente](/docs/api-reference/functions/buildRouboPerdaTransporteAdquirente) | tpEvento=211124 -- Perecimento, perda, roubo ou furto pelo adquirente (FOB) |
| [buildRouboPerdaTransporteFornecedor](/docs/api-reference/functions/buildRouboPerdaTransporteFornecedor) | tpEvento=112130 -- Perecimento, perda, roubo ou furto pelo fornecedor (CIF) |
| [buildSolApropCredPresumido](/docs/api-reference/functions/buildSolApropCredPresumido) | tpEvento=211110 -- Solicitacao de Apropriacao de Credito Presumido |
| [buildStatusRequestXml](/docs/api-reference/functions/buildStatusRequestXml) | Constroi o XML de consulta de status do servico (consStatServ). |
| [buildSubstitutionCancellationXml](/docs/api-reference/functions/buildSubstitutionCancellationXml) | Constroi o XML do evento de cancelamento por substituicao (apenas NFC-e modelo 65). |
| [buildTestNfceXml](/docs/api-reference/functions/buildTestNfceXml) | Constroi XML minimo de NFC-e para testes de EPEC. |
| [buildVoidingXml](/docs/api-reference/functions/buildVoidingXml) | Constroi o XML de inutilizacao de numeracao (inutNFe). |
| [calculateCofins](/docs/api-reference/functions/calculateCofins) | Calcula o elemento COFINS (lógica de domínio, sem XML). |
| [calculateCofinsSt](/docs/api-reference/functions/calculateCofinsSt) | Calcula o elemento COFINS-ST (lógica de domínio, sem XML). |
| [calculateIcms](/docs/api-reference/functions/calculateIcms) | Calcula o ICMS de um item (lógica de domínio, sem dependência de XML). |
| [calculateIi](/docs/api-reference/functions/calculateIi) | Calcula o elemento II (Imposto de Importação) (lógica de domínio, sem XML). |
| [calculateImpostoDevol](/docs/api-reference/functions/calculateImpostoDevol) | Calcula o elemento impostoDevol (lógica de domínio, sem XML). |
| [calculateIpi](/docs/api-reference/functions/calculateIpi) | Calcula o elemento IPI (lógica de domínio, sem XML). |
| [calculateIs](/docs/api-reference/functions/calculateIs) | Calcula o elemento IS (lógica de domínio, sem dependência de XML). |
| [calculateIssqn](/docs/api-reference/functions/calculateIssqn) | Calcula o elemento ISSQN e acumula totais (lógica de domínio, sem XML). |
| [calculatePis](/docs/api-reference/functions/calculatePis) | Calcula o elemento PIS (lógica de domínio, sem XML). |
| [calculatePisSt](/docs/api-reference/functions/calculatePisSt) | Calcula o elemento PIS-ST (lógica de domínio, sem XML). |
| [checkRtcModel](/docs/api-reference/functions/checkRtcModel) | Valida que o modelo e 55 (NFe) e a chave de acesso tambem indica modelo 55. |
| [createIcmsTotals](/docs/api-reference/functions/createIcmsTotals) | Cria um objeto de totais ICMS zerado. |
| [createIssqnTotals](/docs/api-reference/functions/createIssqnTotals) | Cria um objeto de totais ISSQN zerado. |
| [defaultLotId](/docs/api-reference/functions/defaultLotId) | Gera o ID do lote a partir do valor explicito ou fallback para Date.now() |
| [escapeXml](/docs/api-reference/functions/escapeXml) | Escapa caracteres especiais XML em conteúdo de texto e valores de atributos |
| [extractCertFromPfx](/docs/api-reference/functions/extractCertFromPfx) | Extrai o certificado PEM do PFX usando openssl CLI (com flag -legacy). |
| [extractKeyFromPfx](/docs/api-reference/functions/extractKeyFromPfx) | Extrai a chave privada PEM do PFX usando openssl CLI (com flag -legacy). |
| [extractXmlTagValue](/docs/api-reference/functions/extractXmlTagValue) | Extrai conteúdo de texto de uma tag XML simples de uma string XML bruta |
| [filterFields](/docs/api-reference/functions/filterFields) | Filtra entradas nulas de um array de TaxField |
| [formatCents](/docs/api-reference/functions/formatCents) | Format cents integer to decimal string. E.g. 1050 -> "10.50" |
| [formatCentsOrNull](/docs/api-reference/functions/formatCentsOrNull) | Formata centavos para string decimal, retornando null se a entrada for null/undefined |
| [formatCentsOrZero](/docs/api-reference/functions/formatCentsOrZero) | Formata centavos para string decimal, usando "0.00" como padrão para null/undefined |
| [formatDateTimeBR](/docs/api-reference/functions/formatDateTimeBR) | Format a Date as ISO 8601 with Brazil timezone offset. SEFAZ rejects UTC "Z" suffix -- requires explicit offset like -03:00. |
| [formatDecimal](/docs/api-reference/functions/formatDecimal) | Formata um número com N casas decimais |
| [formatRate](/docs/api-reference/functions/formatRate) | Format rate stored as hundredths to decimal string. E.g. 1800 -> "18.0000" |
| [formatRate4](/docs/api-reference/functions/formatRate4) | Format rate stored as value * 10000 to 4-decimal string. E.g. 16500 -> "1.6500" |
| [formatRate4OrZero](/docs/api-reference/functions/formatRate4OrZero) | Formata rate4 (valor * 10000) para string com 4 decimais, usando "0.0000" como padrão para null/undefined |
| [getCertificateInfo](/docs/api-reference/functions/getCertificateInfo) | Extrai informações do certificado para exibição (sem expor a chave privada). |
| [getContingencyType](/docs/api-reference/functions/getContingencyType) | Obtem o tipo de contingencia (SVC-AN ou SVC-RS) para o estado informado. |
| [getEventDescription](/docs/api-reference/functions/getEventDescription) | Retorna a descricao textual do tipo de evento SEFAZ |
| [getNfceConsultationUri](/docs/api-reference/functions/getNfceConsultationUri) | Obtem a URI de consulta NFC-e (urlChave) para o estado e ambiente informados. |
| [getSefazUrl](/docs/api-reference/functions/getSefazUrl) | Obtem a URL do web service da SEFAZ para o estado, servico, ambiente e modelo informados. |
| [getStateByCode](/docs/api-reference/functions/getStateByCode) | Obtem a sigla UF para um codigo numerico IBGE. |
| [getStateCode](/docs/api-reference/functions/getStateCode) | Obtem o codigo numerico IBGE para uma sigla de estado. |
| [getStructure](/docs/api-reference/functions/getStructure) | Obtem a estrutura apropriada para a versao e layout informados. |
| [getStructureByVersionString](/docs/api-reference/functions/getStructureByVersionString) | Obtem a estrutura apropriada para parsing, usando uma string de versao como "4.00" ou "3.10". |
| [isValidGtin](/docs/api-reference/functions/isValidGtin) | Valida codigo de barras GTIN-8/12/13/14. |
| [isValidTxt](/docs/api-reference/functions/isValidTxt) | Valida uma representacao TXT de NFe. |
| [loadCertificate](/docs/api-reference/functions/loadCertificate) | Carrega chave privada e certificado a partir de um buffer PFX/PKCS12. |
| [loadStructure](/docs/api-reference/functions/loadStructure) | Carrega a definicao de estrutura TXT para a versao e layout informados. |
| [lookupCep](/docs/api-reference/functions/lookupCep) | Consulta endereco pelo CEP usando ViaCEP com BrasilAPI como fallback. |
| [mergeIcmsTotals](/docs/api-reference/functions/mergeIcmsTotals) | Mescla os totais ICMS de um item no acumulador. |
| [optionalField](/docs/api-reference/functions/optionalField) | Auxiliar: cria um campo opcional (retorna null se o valor for nulo) |
| [parseAuthorizationResponse](/docs/api-reference/functions/parseAuthorizationResponse) | Faz o parse da resposta de autorizacao (retEnviNFe / protNFe). |
| [parseCancellationResponse](/docs/api-reference/functions/parseCancellationResponse) | Faz o parse da resposta do evento de cancelamento (retEvento). |
| [parseStatusResponse](/docs/api-reference/functions/parseStatusResponse) | Faz o parse da resposta de status do servico SEFAZ (retConsStatServ). |
| [putQRTag](/docs/api-reference/functions/putQRTag) | Insere tags de QR Code e urlChave em um XML de NFC-e assinado. |
| [requiredField](/docs/api-reference/functions/requiredField) | Auxiliar: cria um campo obrigatório (lança erro se o valor for nulo) |
| [resolveVerAplic](/docs/api-reference/functions/resolveVerAplic) | Resolve verAplic: explicit > config > default "4.00" |
| [sefazRequest](/docs/api-reference/functions/sefazRequest) | Envia requisicao SOAP 1.2 para o web service da SEFAZ com mTLS (certificado digital). |
| [serializeTaxElement](/docs/api-reference/functions/serializeTaxElement) | Serialize a TaxElement to an XML string. |
| [signEventXml](/docs/api-reference/functions/signEventXml) | Assina um XML de evento SEFAZ (cancelamento, CCe, etc.) com XMLDSig. |
| [signXml](/docs/api-reference/functions/signXml) | Assina um XML de NF-e com assinatura XMLDSig envelopada via xml-crypto. |
| [tag](/docs/api-reference/functions/tag) | Build an XML tag with optional attributes and children. |
| [toArray](/docs/api-reference/functions/toArray) | Converte uma string XML de NFe para objeto simples (equivalente ao toArray do PHP). |
| [toJson](/docs/api-reference/functions/toJson) | Converte uma string XML de NFe para string JSON. |
| [toStd](/docs/api-reference/functions/toStd) | Converte uma string XML de NFe para objeto normalizado (equivalente ao toStd do PHP). |
| [validate](/docs/api-reference/functions/validate) | Valida uma string JSON de configuracao fiscal. |
| [validateAccessKey](/docs/api-reference/functions/validateAccessKey) | Valida o formato da chave de acesso (44 digitos numericos) e lanca erro se invalida. |
| [whichIs](/docs/api-reference/functions/whichIs) | Identifica qual tipo de documento NFe uma string XML representa. |

## References

### ~~STATE\_CODES~~

Renames and re-exports [STATE_IBGE_CODES](/docs/api-reference/variables/STATE_IBGE_CODES)
