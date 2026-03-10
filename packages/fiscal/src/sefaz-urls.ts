import type { SefazEnvironment, SefazService, InvoiceModel } from "./types";

/**
 * Production and homologation URLs for a SEFAZ service
 *
 * [pt-BR] URLs de producao e homologacao para um servico da SEFAZ
 */
interface ServiceUrls {
  /** Production environment URL [pt-BR] URL do ambiente de producao */
  production: string;
  /** Homologation environment URL [pt-BR] URL do ambiente de homologacao */
  homologation: string;
}

/**
 * Map of all SEFAZ services to their production/homologation URLs for a given authorizer
 *
 * [pt-BR] Mapa de todos os servicos SEFAZ para suas URLs de producao/homologacao de um autorizador
 */
type AuthorizerServices = Record<SefazService, ServiceUrls>;

/**
 * SEFAZ authorizer URLs for NF-e and NFC-e web services (layout 4.00).
 * States either have their own authorizer or use SVRS (Sefaz Virtual do RS).
 * Contingency uses SVC-AN or SVC-RS depending on the state.
 * Source: https://www.nfe.fazenda.gov.br/portal/webServices.aspx
 *
 * [pt-BR] URLs dos autorizadores SEFAZ para web services de NF-e e NFC-e (layout 4.00).
 * Estados possuem autorizador proprio ou usam SVRS. Contingencia usa SVC-AN ou SVC-RS.
 */

// ── Own authorizers ─────────────────────────────────────────────────────────

const AM: AuthorizerServices = {
  NfeStatusServico: {
    production: "https://nfe.sefaz.am.gov.br/services2/services/NfeStatusServico4",
    homologation: "https://homnfe.sefaz.am.gov.br/services2/services/NfeStatusServico4",
  },
  NfeAutorizacao: {
    production: "https://nfe.sefaz.am.gov.br/services2/services/NfeAutorizacao4",
    homologation: "https://homnfe.sefaz.am.gov.br/services2/services/NfeAutorizacao4",
  },
  NfeRetAutorizacao: {
    production: "https://nfe.sefaz.am.gov.br/services2/services/NfeRetAutorizacao4",
    homologation: "https://homnfe.sefaz.am.gov.br/services2/services/NfeRetAutorizacao4",
  },
  NfeConsultaProtocolo: {
    production: "https://nfe.sefaz.am.gov.br/services2/services/NfeConsulta4",
    homologation: "https://homnfe.sefaz.am.gov.br/services2/services/NfeConsulta4",
  },
  NfeInutilizacao: {
    production: "https://nfe.sefaz.am.gov.br/services2/services/NfeInutilizacao4",
    homologation: "https://homnfe.sefaz.am.gov.br/services2/services/NfeInutilizacao4",
  },
  RecepcaoEvento: {
    production: "https://nfe.sefaz.am.gov.br/services2/services/RecepcaoEvento4",
    homologation: "https://homnfe.sefaz.am.gov.br/services2/services/RecepcaoEvento4",
  },
};

const BA: AuthorizerServices = {
  NfeStatusServico: {
    production: "https://nfe.sefaz.ba.gov.br/webservices/NFeStatusServico4/NFeStatusServico4.asmx",
    homologation: "https://hnfe.sefaz.ba.gov.br/webservices/NFeStatusServico4/NFeStatusServico4.asmx",
  },
  NfeAutorizacao: {
    production: "https://nfe.sefaz.ba.gov.br/webservices/NFeAutorizacao4/NFeAutorizacao4.asmx",
    homologation: "https://hnfe.sefaz.ba.gov.br/webservices/NFeAutorizacao4/NFeAutorizacao4.asmx",
  },
  NfeRetAutorizacao: {
    production: "https://nfe.sefaz.ba.gov.br/webservices/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx",
    homologation: "https://hnfe.sefaz.ba.gov.br/webservices/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx",
  },
  NfeConsultaProtocolo: {
    production: "https://nfe.sefaz.ba.gov.br/webservices/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx",
    homologation: "https://hnfe.sefaz.ba.gov.br/webservices/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx",
  },
  NfeInutilizacao: {
    production: "https://nfe.sefaz.ba.gov.br/webservices/NFeInutilizacao4/NFeInutilizacao4.asmx",
    homologation: "https://hnfe.sefaz.ba.gov.br/webservices/NFeInutilizacao4/NFeInutilizacao4.asmx",
  },
  RecepcaoEvento: {
    production: "https://nfe.sefaz.ba.gov.br/webservices/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx",
    homologation: "https://hnfe.sefaz.ba.gov.br/webservices/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx",
  },
};

const GO: AuthorizerServices = {
  NfeStatusServico: {
    production: "https://nfe.sefaz.go.gov.br/nfe/services/NFeStatusServico4",
    homologation: "https://homolog.sefaz.go.gov.br/nfe/services/NFeStatusServico4",
  },
  NfeAutorizacao: {
    production: "https://nfe.sefaz.go.gov.br/nfe/services/NFeAutorizacao4",
    homologation: "https://homolog.sefaz.go.gov.br/nfe/services/NFeAutorizacao4",
  },
  NfeRetAutorizacao: {
    production: "https://nfe.sefaz.go.gov.br/nfe/services/NFeRetAutorizacao4",
    homologation: "https://homolog.sefaz.go.gov.br/nfe/services/NFeRetAutorizacao4",
  },
  NfeConsultaProtocolo: {
    production: "https://nfe.sefaz.go.gov.br/nfe/services/NFeConsultaProtocolo4",
    homologation: "https://homolog.sefaz.go.gov.br/nfe/services/NFeConsultaProtocolo4",
  },
  NfeInutilizacao: {
    production: "https://nfe.sefaz.go.gov.br/nfe/services/NFeInutilizacao4",
    homologation: "https://homolog.sefaz.go.gov.br/nfe/services/NFeInutilizacao4",
  },
  RecepcaoEvento: {
    production: "https://nfe.sefaz.go.gov.br/nfe/services/NFeRecepcaoEvento4",
    homologation: "https://homolog.sefaz.go.gov.br/nfe/services/NFeRecepcaoEvento4",
  },
};

const MG: AuthorizerServices = {
  NfeStatusServico: {
    production: "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4",
    homologation: "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4",
  },
  NfeAutorizacao: {
    production: "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4",
    homologation: "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4",
  },
  NfeRetAutorizacao: {
    production: "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeRetAutorizacao4",
    homologation: "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeRetAutorizacao4",
  },
  NfeConsultaProtocolo: {
    production: "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeConsultaProtocolo4",
    homologation: "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeConsultaProtocolo4",
  },
  NfeInutilizacao: {
    production: "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeInutilizacao4",
    homologation: "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeInutilizacao4",
  },
  RecepcaoEvento: {
    production: "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeRecepcaoEvento4",
    homologation: "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeRecepcaoEvento4",
  },
};

const MS: AuthorizerServices = {
  NfeStatusServico: {
    production: "https://nfe.sefaz.ms.gov.br/ws/NFeStatusServico4",
    homologation: "https://homologacao.nfe.ms.gov.br/ws/NFeStatusServico4",
  },
  NfeAutorizacao: {
    production: "https://nfe.sefaz.ms.gov.br/ws/NFeAutorizacao4",
    homologation: "https://homologacao.nfe.ms.gov.br/ws/NFeAutorizacao4",
  },
  NfeRetAutorizacao: {
    production: "https://nfe.sefaz.ms.gov.br/ws/NFeRetAutorizacao4",
    homologation: "https://homologacao.nfe.ms.gov.br/ws/NFeRetAutorizacao4",
  },
  NfeConsultaProtocolo: {
    production: "https://nfe.sefaz.ms.gov.br/ws/NFeConsultaProtocolo4",
    homologation: "https://homologacao.nfe.ms.gov.br/ws/NFeConsultaProtocolo4",
  },
  NfeInutilizacao: {
    production: "https://nfe.sefaz.ms.gov.br/ws/NFeInutilizacao4",
    homologation: "https://homologacao.nfe.ms.gov.br/ws/NFeInutilizacao4",
  },
  RecepcaoEvento: {
    production: "https://nfe.sefaz.ms.gov.br/ws/NFeRecepcaoEvento4",
    homologation: "https://homologacao.nfe.ms.gov.br/ws/NFeRecepcaoEvento4",
  },
};

const MT: AuthorizerServices = {
  NfeStatusServico: {
    production: "https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeStatusServico4",
    homologation: "https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeStatusServico4",
  },
  NfeAutorizacao: {
    production: "https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeAutorizacao4",
    homologation: "https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeAutorizacao4",
  },
  NfeRetAutorizacao: {
    production: "https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeRetAutorizacao4",
    homologation: "https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeRetAutorizacao4",
  },
  NfeConsultaProtocolo: {
    production: "https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeConsulta4",
    homologation: "https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeConsulta4",
  },
  NfeInutilizacao: {
    production: "https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeInutilizacao4",
    homologation: "https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeInutilizacao4",
  },
  RecepcaoEvento: {
    production: "https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeRecepcaoEvento4",
    homologation: "https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeRecepcaoEvento4",
  },
};

const PE: AuthorizerServices = {
  NfeStatusServico: {
    production: "https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeStatusServico4",
    homologation: "https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeStatusServico4",
  },
  NfeAutorizacao: {
    production: "https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeAutorizacao4",
    homologation: "https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeAutorizacao4",
  },
  NfeRetAutorizacao: {
    production: "https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeRetAutorizacao4",
    homologation: "https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeRetAutorizacao4",
  },
  NfeConsultaProtocolo: {
    production: "https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeConsultaProtocolo4",
    homologation: "https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeConsultaProtocolo4",
  },
  NfeInutilizacao: {
    production: "https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeInutilizacao4",
    homologation: "https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeInutilizacao4",
  },
  RecepcaoEvento: {
    production: "https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeRecepcaoEvento4",
    homologation: "https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeRecepcaoEvento4",
  },
};

const PR: AuthorizerServices = {
  NfeStatusServico: {
    production: "https://nfe.sefa.pr.gov.br/nfe/NFeStatusServico4",
    homologation: "https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeStatusServico4",
  },
  NfeAutorizacao: {
    production: "https://nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4",
    homologation: "https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4",
  },
  NfeRetAutorizacao: {
    production: "https://nfe.sefa.pr.gov.br/nfe/NFeRetAutorizacao4",
    homologation: "https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeRetAutorizacao4",
  },
  NfeConsultaProtocolo: {
    production: "https://nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4",
    homologation: "https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4",
  },
  NfeInutilizacao: {
    production: "https://nfe.sefa.pr.gov.br/nfe/NFeInutilizacao4",
    homologation: "https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeInutilizacao4",
  },
  RecepcaoEvento: {
    production: "https://nfe.sefa.pr.gov.br/nfe/NFeRecepcaoEvento4",
    homologation: "https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeRecepcaoEvento4",
  },
};

const RS: AuthorizerServices = {
  NfeStatusServico: {
    production: "https://nfe.sefazrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
    homologation: "https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
  },
  NfeAutorizacao: {
    production: "https://nfe.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
    homologation: "https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
  },
  NfeRetAutorizacao: {
    production: "https://nfe.sefazrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
    homologation: "https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
  },
  NfeConsultaProtocolo: {
    production: "https://nfe.sefazrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx",
    homologation: "https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx",
  },
  NfeInutilizacao: {
    production: "https://nfe.sefazrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx",
    homologation: "https://nfe-homologacao.sefazrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx",
  },
  RecepcaoEvento: {
    production: "https://nfe.sefazrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
    homologation: "https://nfe-homologacao.sefazrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
  },
};

const SP: AuthorizerServices = {
  NfeStatusServico: {
    production: "https://nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx",
    homologation: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx",
  },
  NfeAutorizacao: {
    production: "https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx",
    homologation: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx",
  },
  NfeRetAutorizacao: {
    production: "https://nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx",
    homologation: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx",
  },
  NfeConsultaProtocolo: {
    production: "https://nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx",
    homologation: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx",
  },
  NfeInutilizacao: {
    production: "https://nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx",
    homologation: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx",
  },
  RecepcaoEvento: {
    production: "https://nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx",
    homologation: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx",
  },
};

// ── SVRS (Sefaz Virtual do RS) — used by most states ────────────────────────

const SVRS: AuthorizerServices = {
  NfeStatusServico: {
    production: "https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
    homologation: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
  },
  NfeAutorizacao: {
    production: "https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
    homologation: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
  },
  NfeRetAutorizacao: {
    production: "https://nfe.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
    homologation: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
  },
  NfeConsultaProtocolo: {
    production: "https://nfe.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx",
    homologation: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx",
  },
  NfeInutilizacao: {
    production: "https://nfe.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx",
    homologation: "https://nfe-homologacao.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx",
  },
  RecepcaoEvento: {
    production: "https://nfe.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
    homologation: "https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
  },
};

// ── SVAN (Sefaz Virtual do Ambiente Nacional) — MA ──────────────────────────

const SVAN: AuthorizerServices = {
  NfeStatusServico: {
    production: "https://www.sefazvirtual.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx",
    homologation: "https://hom.sefazvirtual.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx",
  },
  NfeAutorizacao: {
    production: "https://www.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx",
    homologation: "https://hom.sefazvirtual.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx",
  },
  NfeRetAutorizacao: {
    production: "https://www.sefazvirtual.fazenda.gov.br/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx",
    homologation: "https://hom.sefazvirtual.fazenda.gov.br/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx",
  },
  NfeConsultaProtocolo: {
    production: "https://www.sefazvirtual.fazenda.gov.br/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx",
    homologation: "https://hom.sefazvirtual.fazenda.gov.br/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx",
  },
  NfeInutilizacao: {
    production: "https://www.sefazvirtual.fazenda.gov.br/NFeInutilizacao4/NFeInutilizacao4.asmx",
    homologation: "https://hom.sefazvirtual.fazenda.gov.br/NFeInutilizacao4/NFeInutilizacao4.asmx",
  },
  RecepcaoEvento: {
    production: "https://www.sefazvirtual.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx",
    homologation: "https://hom.sefazvirtual.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx",
  },
};

// ── Contingency: SVC-AN ─────────────────────────────────────────────────────

const SVC_AN: AuthorizerServices = {
  NfeStatusServico: {
    production: "https://www.svc.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx",
    homologation: "https://hom.svc.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx",
  },
  NfeAutorizacao: {
    production: "https://www.svc.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx",
    homologation: "https://hom.svc.fazenda.gov.br/NFeAutorizacao4/NFeAutorizacao4.asmx",
  },
  NfeRetAutorizacao: {
    production: "https://www.svc.fazenda.gov.br/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx",
    homologation: "https://hom.svc.fazenda.gov.br/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx",
  },
  NfeConsultaProtocolo: {
    production: "https://www.svc.fazenda.gov.br/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx",
    homologation: "https://hom.svc.fazenda.gov.br/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx",
  },
  NfeInutilizacao: {
    production: "https://www.svc.fazenda.gov.br/NFeInutilizacao4/NFeInutilizacao4.asmx",
    homologation: "https://hom.svc.fazenda.gov.br/NFeInutilizacao4/NFeInutilizacao4.asmx",
  },
  RecepcaoEvento: {
    production: "https://www.svc.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx",
    homologation: "https://hom.svc.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx",
  },
};

// ── Contingency: SVC-RS ─────────────────────────────────────────────────────

const SVC_RS: AuthorizerServices = {
  NfeStatusServico: {
    production: "https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
    homologation: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
  },
  NfeAutorizacao: {
    production: "https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
    homologation: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
  },
  NfeRetAutorizacao: {
    production: "https://nfe.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
    homologation: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
  },
  NfeConsultaProtocolo: {
    production: "https://nfe.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx",
    homologation: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx",
  },
  NfeInutilizacao: {
    production: "https://nfe.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx",
    homologation: "https://nfe-homologacao.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx",
  },
  RecepcaoEvento: {
    production: "https://nfe.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
    homologation: "https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
  },
};

// ── State → Authorizer mapping ──────────────────────────────────────────────

const STATE_AUTHORIZER: Record<string, AuthorizerServices> = {
  AM, BA, GO, MG, MS, MT, PE, PR, RS, SP,
  // SVAN
  MA: SVAN,
  // SVRS (all remaining states)
  AC: SVRS, AL: SVRS, AP: SVRS, CE: SVRS, DF: SVRS, ES: SVRS,
  PA: SVRS, PB: SVRS, PI: SVRS, RJ: SVRS, RN: SVRS, RO: SVRS,
  RR: SVRS, SC: SVRS, SE: SVRS, TO: SVRS,
};

// ── State → Contingency mapping ─────────────────────────────────────────────

/**
 * SVC-AN serves: AC, AL, AP, CE, DF, ES, MG, PA, PB, PI, RJ, RN, RO, RR, RS, SC, SE, SP, TO
 * SVC-RS serves: AM, BA, GO, MA, MS, MT, PE, PR
 */
const STATE_CONTINGENCY: Record<string, AuthorizerServices> = {
  AC: SVC_AN, AL: SVC_AN, AP: SVC_AN, CE: SVC_AN, DF: SVC_AN,
  ES: SVC_AN, MG: SVC_AN, PA: SVC_AN, PB: SVC_AN, PI: SVC_AN,
  RJ: SVC_AN, RN: SVC_AN, RO: SVC_AN, RR: SVC_AN, RS: SVC_AN,
  SC: SVC_AN, SE: SVC_AN, SP: SVC_AN, TO: SVC_AN,
  AM: SVC_RS, BA: SVC_RS, GO: SVC_RS, MA: SVC_RS,
  MS: SVC_RS, MT: SVC_RS, PE: SVC_RS, PR: SVC_RS,
};

// ── NFC-e endpoints (model 65) ──────────────────────────────────────────────
// NFC-e uses different endpoints than NF-e. States with own NFC-e authorizers
// are listed here; the rest use SVRS_NFCE.

const SVRS_NFCE: AuthorizerServices = {
  NfeStatusServico: {
    production: "https://nfce.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
    homologation: "https://nfce-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
  },
  NfeAutorizacao: {
    production: "https://nfce.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
    homologation: "https://nfce-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
  },
  NfeRetAutorizacao: {
    production: "https://nfce.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
    homologation: "https://nfce-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
  },
  NfeConsultaProtocolo: {
    production: "https://nfce.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx",
    homologation: "https://nfce-homologacao.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx",
  },
  NfeInutilizacao: {
    production: "https://nfce.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx",
    homologation: "https://nfce-homologacao.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx",
  },
  RecepcaoEvento: {
    production: "https://nfce.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
    homologation: "https://nfce-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
  },
};

const PR_NFCE: AuthorizerServices = {
  NfeStatusServico: {
    production: "https://nfce.sefa.pr.gov.br/nfce/NFeStatusServico4",
    homologation: "https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeStatusServico4",
  },
  NfeAutorizacao: {
    production: "https://nfce.sefa.pr.gov.br/nfce/NFeAutorizacao4",
    homologation: "https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeAutorizacao4",
  },
  NfeRetAutorizacao: {
    production: "https://nfce.sefa.pr.gov.br/nfce/NFeRetAutorizacao4",
    homologation: "https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeRetAutorizacao4",
  },
  NfeConsultaProtocolo: {
    production: "https://nfce.sefa.pr.gov.br/nfce/NFeConsultaProtocolo4",
    homologation: "https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeConsultaProtocolo4",
  },
  NfeInutilizacao: {
    production: "https://nfce.sefa.pr.gov.br/nfce/NFeInutilizacao4",
    homologation: "https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeInutilizacao4",
  },
  RecepcaoEvento: {
    production: "https://nfce.sefa.pr.gov.br/nfce/NFeRecepcaoEvento4",
    homologation: "https://homologacao.nfce.sefa.pr.gov.br/nfce/NFeRecepcaoEvento4",
  },
};

// States with own NFC-e authorizers; rest use SVRS_NFCE
const STATE_NFCE_AUTHORIZER: Record<string, AuthorizerServices> = {
  PR: PR_NFCE,
  // AM, BA, GO, MG, MS, MT, PE, RS, SP also have own NFC-e endpoints
  // but for now we default them to SVRS_NFCE (can be added as needed)
};

/**
 * Get the SEFAZ web service URL for a given state, service, environment and model.
 *
 * [pt-BR] Obtem a URL do web service da SEFAZ para o estado, servico, ambiente e modelo informados.
 */
export function getSefazUrl(
  stateCode: string,
  service: SefazService,
  environment: SefazEnvironment,
  contingency = false,
  model: InvoiceModel = 55
): string {
  let authorizer: AuthorizerServices | undefined;

  if (contingency) {
    authorizer = STATE_CONTINGENCY[stateCode];
  } else if (model === 65) {
    authorizer = STATE_NFCE_AUTHORIZER[stateCode] || SVRS_NFCE;
  } else {
    authorizer = STATE_AUTHORIZER[stateCode];
  }

  if (!authorizer) {
    throw new Error(`No SEFAZ authorizer found for state: ${stateCode}`);
  }

  const serviceUrls = authorizer[service];
  if (!serviceUrls) {
    throw new Error(`Service ${service} not found for state ${stateCode}`);
  }

  return environment === 1 ? serviceUrls.production : serviceUrls.homologation;
}

/**
 * Get the contingency type for a given state.
 *
 * [pt-BR] Obtem o tipo de contingencia (SVC-AN ou SVC-RS) para o estado informado.
 */
export function getContingencyType(stateCode: string): "svc-an" | "svc-rs" {
  const contingencyMap = STATE_CONTINGENCY[stateCode];
  if (!contingencyMap) {
    throw new Error(`No contingency mapping for state: ${stateCode}`);
  }
  return contingencyMap === SVC_AN ? "svc-an" : "svc-rs";
}

// ── NFC-e Consultation URIs (urlChave) ──────────────────────────────────────

const NFCE_CONSULTATION_URIS: Record<string, Record<string, string>> = {
  "1": {
    AC: "www.sefaznet.ac.gov.br/nfce/consulta",
    AL: "www.sefaz.al.gov.br/nfce/consulta",
    AP: "www.sefaz.ap.gov.br/nfce/consulta",
    AM: "www.sefaz.am.gov.br/nfce/consulta",
    BA: "http://www.sefaz.ba.gov.br/nfce/consulta",
    CE: "www.sefaz.ce.gov.br/nfce/consulta",
    DF: "www.fazenda.df.gov.br/nfce/consulta",
    ES: "www.sefaz.es.gov.br/nfce/consulta",
    GO: "www.sefaz.go.gov.br/nfce/consulta",
    MA: "www.sefaz.ma.gov.br/nfce/consulta",
    MG: "https://portalsped.fazenda.mg.gov.br/portalnfce",
    MS: "http://www.dfe.ms.gov.br/nfce/consulta",
    MT: "http://www.sefaz.mt.gov.br/nfce/consultanfce",
    PA: "www.sefa.pa.gov.br/nfce/consulta",
    PB: "www.sefaz.pb.gov.br/nfce/consulta",
    PE: "nfce.sefaz.pe.gov.br/nfce/consulta",
    PR: "http://www.fazenda.pr.gov.br/nfce/consulta",
    PI: "www.sefaz.pi.gov.br/nfce/consulta",
    RJ: "www.fazenda.rj.gov.br/nfce/consulta",
    RN: "www.set.rn.gov.br/nfce/consulta",
    RO: "www.sefin.ro.gov.br/nfce/consulta",
    RR: "www.sefaz.rr.gov.br/nfce/consulta",
    RS: "www.sefaz.rs.gov.br/nfce/consulta",
    SC: "https://sat.sef.sc.gov.br/nfce/consulta",
    SE: "http://www.nfce.se.gov.br/nfce/consulta",
    SP: "https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica",
    TO: "www.sefaz.to.gov.br/nfce/consulta",
  },
  "2": {
    AC: "www.sefaznet.ac.gov.br/nfce/consulta",
    AL: "www.sefaz.al.gov.br/nfce/consulta",
    AP: "www.sefaz.ap.gov.br/nfce/consulta",
    AM: "www.sefaz.am.gov.br/nfce/consulta",
    BA: "http://hinternet.sefaz.ba.gov.br/nfce/consulta",
    CE: "www.sefaz.ce.gov.br/nfce/consulta",
    DF: "www.fazenda.df.gov.br/nfce/consulta",
    ES: "www.sefaz.es.gov.br/nfce/consulta",
    GO: "www.nfce.go.gov.br/post/ver/214413/consulta-nfc-e-homologacao",
    MA: "www.sefaz.ma.gov.br/nfce/consulta",
    MG: "https://hportalsped.fazenda.mg.gov.br/portalnfce",
    MS: "http://www.dfe.ms.gov.br/nfce/consulta",
    MT: "http://homologacao.sefaz.mt.gov.br/nfce/consultanfce",
    PA: "www.sefa.pa.gov.br/nfce/consulta",
    PB: "www.sefaz.pb.gov.br/nfcehom",
    PE: "nfce.sefaz.pe.gov.br/nfce/consulta",
    PR: "http://www.fazenda.pr.gov.br/nfce/consulta",
    PI: "www.sefaz.pi.gov.br/nfce/consulta",
    RJ: "www.fazenda.rj.gov.br/nfce/consulta",
    RN: "www.set.rn.gov.br/nfce/consulta",
    RO: "www.sefin.ro.gov.br/nfce/consulta",
    RR: "www.sefaz.rr.gov.br/nfce/consulta",
    RS: "www.sefaz.rs.gov.br/nfce/consulta",
    SC: "https://hom.sat.sef.sc.gov.br/nfce/consulta",
    SE: "http://www.hom.nfe.se.gov.br/nfce/consulta",
    SP: "https://www.homologacao.nfce.fazenda.sp.gov.br/NFCeConsultaPublica",
    TO: "http://homologacao.sefaz.to.gov.br/nfce/consulta.jsf",
  },
};

/**
 * Get the NFC-e consultation URI (urlChave) for a given state and environment.
 * Used for QR Code and DANFCE consultation links.
 *
 * [pt-BR] Obtem a URI de consulta NFC-e (urlChave) para o estado e ambiente informados.
 * Usada para links de QR Code e consulta do DANFCE.
 */
export function getNfceConsultationUri(
  stateCode: string,
  environment: SefazEnvironment
): string {
  const envMap = NFCE_CONSULTATION_URIS[String(environment)];
  if (!envMap) {
    throw new Error(`Invalid environment: ${environment}`);
  }
  const uri = envMap[stateCode];
  if (!uri) {
    throw new Error(`No NFC-e consultation URI for state: ${stateCode}`);
  }
  return uri;
}
