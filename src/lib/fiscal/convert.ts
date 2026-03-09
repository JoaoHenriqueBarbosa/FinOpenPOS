/**
 * TXT-to-XML converter for NFe
 * Ported from PHP: NFePHP\NFe\Convert and NFePHP\NFe\Factories\Parser
 *
 * This module converts the SPED TXT representation of an NF-e into XML.
 */

import { isValidTxt } from "./valid-txt";
import { getStructureByVersionString } from "./txt-structures";
import { NFE_NAMESPACE, NFE_VERSION } from "./constants";
import { escapeXml } from "./xml-utils";

// ── Layout constants ────────────────────────────────────────────────────────

export const LOCAL = "LOCAL";
export const LOCAL_V12 = "LOCAL_V12";
export const LOCAL_V13 = "LOCAL_V13";
export const SEBRAE = "SEBRAE";

// ── Types ───────────────────────────────────────────────────────────────────

interface ParsedFields {
  [key: string]: string;
}

interface DumpEntry {
  tag: string;
  [key: string]: string;
}

// ── Convert class ───────────────────────────────────────────────────────────

export class Convert {
  private txt: string;
  private data: string[] = [];
  private nfeCount: number = 1;
  private invoices: string[][] = [];
  private layouts: string[] = [];
  private xmls: string[] = [];
  private baseLayout: string;

  constructor(txt: string = "", baseLayout: string = LOCAL) {
    this.baseLayout = baseLayout;
    if (txt) {
      this.txt = txt.trim();
    } else {
      this.txt = "";
    }
  }

  /**
   * Convert all NFe in the TXT to XML.
   */
  toXml(): string[] {
    if (!this.isNFe(this.txt)) {
      throw new Error("Wrong document: not a valid NFe TXT");
    }
    this.invoices = this.sliceInvoices(this.data);
    this.checkNfeCount();
    this.validateInvoices();

    for (let i = 0; i < this.invoices.length; i++) {
      const invoice = this.invoices[i];
      const version = this.layouts[i];
      const parser = new Parser(version, this.baseLayout);
      const xml = parser.toXml(invoice);
      if (!xml) {
        const errors = parser.getErrors();
        if (errors.length > 0) {
          throw new ParserError(errors.join(", "));
        }
        throw new Error("Failed to convert TXT to XML");
      }
      const parserErrors = parser.getErrors();
      if (parserErrors.length > 0) {
        throw new ParserError(parserErrors.join(", "));
      }
      this.xmls.push(xml);
    }
    return this.xmls;
  }

  /**
   * Dump the parsed TXT as structured objects (for inspection).
   */
  dump(): DumpEntry[][] {
    if (!this.isNFe(this.txt)) {
      throw new Error("Wrong document: not a valid NFe TXT");
    }
    this.invoices = this.sliceInvoices(this.data);
    this.checkNfeCount();
    this.validateInvoices();

    const dumps: DumpEntry[][] = [];
    for (let i = 0; i < this.invoices.length; i++) {
      const invoice = this.invoices[i];
      const version = this.layouts[i];
      const parser = new Parser(version, this.baseLayout);
      dumps.push(parser.dump(invoice));
    }
    return dumps;
  }

  private isNFe(txt: string): boolean {
    if (!txt) {
      throw new Error("Empty document");
    }
    this.data = txt.split("\n");
    const fields = this.data[0].split("|");
    if (fields[0] === "NOTAFISCAL") {
      this.nfeCount = parseInt(fields[1], 10);
      return true;
    }
    return false;
  }

  private sliceInvoices(array: string[]): string[][] {
    const invoices: string[][] = [];
    const invoiceCount = parseInt(array[0].split("|")[1], 10);
    const rest = array.slice(1);

    if (invoiceCount === 1) {
      invoices.push(rest);
      return invoices;
    }

    const markers: { init: number; end: number }[] = [];
    let xCount = 0;
    for (let i = 0; i < rest.length; i++) {
      if (rest[i].startsWith("A|")) {
        if (xCount > 0) {
          markers[xCount - 1].end = i;
        }
        markers.push({ init: i, end: 0 });
        xCount++;
      }
    }
    if (markers.length > 0) {
      markers[markers.length - 1].end = rest.length;
    }

    for (const m of markers) {
      invoices.push(rest.slice(m.init, m.end));
    }
    return invoices;
  }

  private checkNfeCount(): void {
    if (this.invoices.length !== this.nfeCount) {
      throw new Error(
        `Number of NFe declared (${this.nfeCount}) does not match found (${this.invoices.length})`
      );
    }
  }

  private validateInvoices(): void {
    for (const invoice of this.invoices) {
      this.loadLayoutVersion(invoice);
      this.isValidTxtInvoice(invoice);
    }
  }

  private loadLayoutVersion(invoice: string[]): void {
    if (!invoice.length) {
      throw new Error("Empty invoice");
    }
    for (const line of invoice) {
      const fields = line.split("|");
      if (fields[0] === "A") {
        this.layouts.push(fields[1]);
        break;
      }
    }
  }

  private isValidTxtInvoice(invoice: string[]): void {
    const errors = isValidTxt(invoice.join("\n"), this.baseLayout);
    if (errors.length > 0) {
      throw new Error(`Invalid TXT: ${errors.join("\n")}`);
    }
  }
}

// ── Parser error ────────────────────────────────────────────────────────────

export class ParserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParserError";
  }
}

// ── Parser ──────────────────────────────────────────────────────────────────

class Parser {
  private structure: Record<string, string>;
  private errors: string[] = [];
  private item: number = 0;
  private volId: number = -1;
  private baseLayout: string;

  // State for multi-line entities
  private stdEmit: ParsedFields | null = null;
  private stdDest: ParsedFields | null = null;
  private stdTransporta: ParsedFields | null = null;
  private stdIPI: ParsedFields | null = null;
  private stdPIS: ParsedFields | null = null;
  private stdCOFINS: ParsedFields | null = null;

  // Accumulated XML parts
  private infNFeId: string = "";
  private infNFeVersao: string = NFE_VERSION;
  private ideXml: string = "";
  private emitXml: string = "";
  private destXml: string = "";
  private detXmls: string[] = [];
  private currentDetXml: string = "";
  private currentProdXml: string = "";
  private currentImpostoXml: string = "";
  private currentIcmsXml: string = "";
  private currentIpiXml: string = "";
  private currentPisXml: string = "";
  private currentCofinsXml: string = "";
  private currentGCredXml: string = "";
  private totalXml: string = "";
  private transpXml: string = "";
  private cobrXml: string = "";
  private pagXml: string = "";
  private infAdicXml: string = "";

  constructor(version: string = "4.00", baseLayout: string = LOCAL) {
    this.baseLayout = baseLayout;
    this.structure = getStructureByVersionString(version, baseLayout);
  }

  getErrors(): string[] {
    return this.errors;
  }

  /**
   * Convert a TXT invoice (array of lines) to XML string.
   */
  toXml(invoice: string[]): string | null {
    this.processInvoice(invoice);
    return this.buildXml();
  }

  /**
   * Dump parsed fields from an invoice as structured objects.
   */
  dump(invoice: string[]): DumpEntry[] {
    const result: DumpEntry[] = [];
    for (const line of invoice) {
      if (!line.trim()) continue;
      const fields = line.split("|");
      const ref = fields[0].toUpperCase();
      const structDef = this.structure[ref];
      if (!structDef) continue;
      const parsed = fieldsToStd(fields, structDef);
      result.push({ tag: fields[0], ...parsed });
    }
    return result;
  }

  private processInvoice(invoice: string[]): void {
    for (const line of invoice) {
      if (!line.trim()) continue;
      const fields = line.split("|");
      const ref = fields[0].toUpperCase();
      const structDef = this.structure[ref];
      if (!structDef) continue;

      const std = fieldsToStd(fields, structDef);
      this.processEntity(ref, fields[0], std);
    }
  }

  private processEntity(ref: string, originalRef: string, std: ParsedFields): void {
    switch (ref) {
      case "A":
        this.entityA(std);
        break;
      case "B":
        this.entityB(std);
        break;
      case "BA":
        break; // noop
      case "BA02":
        this.entityBA02(std);
        break;
      case "C":
        this.entityC(std);
        break;
      case "C02":
        this.entityC02(std);
        break;
      case "C02A":
        this.entityC02a(std);
        break;
      case "C05":
        this.entityC05(std);
        break;
      case "D":
        break; // noop
      case "E":
        this.entityE(std);
        break;
      case "E02":
        this.entityE02(std);
        break;
      case "E03":
        this.entityE03(std);
        break;
      case "E03A":
        this.entityE03a(std);
        break;
      case "E05":
        this.entityE05(std);
        break;
      case "H":
        this.entityH(std);
        break;
      case "I":
        this.entityI(std);
        break;
      case "I05A":
        break; // NVE, skip
      case "I05C":
        this.entityI05c(std);
        break;
      case "I05G":
        this.entityI05g(std);
        break;
      case "M":
        this.entityM(std);
        break;
      case "N":
        break; // noop — ICMS group start
      case "N02":
      case "N03":
      case "N04":
      case "N05":
      case "N06":
      case "N07":
      case "N08":
      case "N09":
      case "N10":
        this.entityICMS(std, ref);
        break;
      case "O":
        this.entityO(std);
        break;
      case "O07":
        this.entityO07(std);
        break;
      case "O08":
        this.entityO08(std);
        break;
      case "O10":
        this.entityO10(std);
        break;
      case "Q":
        this.entityQ(std);
        break;
      case "Q02":
        this.entityQ02(std);
        break;
      case "S":
        this.entityS(std);
        break;
      case "S02":
        this.entityS02(std);
        break;
      case "W":
        break; // noop — totals group start
      case "W02":
        this.entityW02(std);
        break;
      case "W04C":
      case "W04E":
      case "W04G":
        break; // noop
      case "X":
        this.entityX(std);
        break;
      case "X03":
        this.entityX03(std);
        break;
      case "X04":
        this.entityX04(std);
        break;
      case "X05":
        this.entityX05(std);
        break;
      case "X26":
        this.entityX26(std);
        break;
      case "Y":
        this.entityY(std);
        break;
      case "Y02":
        this.entityY02(std);
        break;
      case "Y07":
        this.entityY07(std);
        break;
      case "YA":
        this.entityYA(std);
        break;
      case "YA01":
        this.entityYA01(std);
        break;
      case "Z":
        this.entityZ(std);
        break;
      default:
        // Unknown entity - silently skip
        break;
    }
  }

  // ── Entity handlers ───────────────────────────────────────────────────

  private entityA(std: ParsedFields): void {
    this.infNFeVersao = std.versao || NFE_VERSION;
    this.infNFeId = std.Id || "";
  }

  private entityB(std: ParsedFields): void {
    // Validate required fields
    const requiredFields = [
      "cUF", "natOp", "mod", "serie", "nNF", "dhEmi",
      "tpNF", "idDest", "cMunFG", "tpAmb", "finNFe",
      "indFinal", "indPres", "procEmi", "verProc"
    ];
    for (const f of requiredFields) {
      if (!std[f]) {
        this.errors.push(`B01 ide - Campo ${f} \u00e9 obrigat\u00f3rio`);
      }
    }

    // cNF handling
    let cNF = std.cNF || "";
    if (cNF) {
      cNF = cNF.replace(/\D/g, "").substring(0, 8).padStart(8, "0");
    }

    // cDV
    const cDV = std.cDV || "0";

    const children: string[] = [];
    addChild(children, "cUF", std.cUF);
    addChild(children, "cNF", cNF);
    addChild(children, "natOp", std.natOp);
    // indPag is NOT included in v4.00
    addChild(children, "mod", std.mod);
    addChild(children, "serie", std.serie);
    addChild(children, "nNF", std.nNF);
    addChild(children, "dhEmi", std.dhEmi);
    if (std.mod === "55" && std.dhSaiEnt) {
      addChild(children, "dhSaiEnt", std.dhSaiEnt);
    }
    addChild(children, "tpNF", std.tpNF);
    addChild(children, "idDest", std.idDest);
    addChild(children, "cMunFG", std.cMunFG);
    addChild(children, "tpImp", std.tpImp);
    addChild(children, "tpEmis", std.tpEmis);
    addChild(children, "cDV", cDV);
    addChild(children, "tpAmb", std.tpAmb);
    addChild(children, "finNFe", std.finNFe);
    addChild(children, "indFinal", std.indFinal);
    addChild(children, "indPres", std.indPres);
    if (std.indIntermed) {
      addChild(children, "indIntermed", std.indIntermed);
    }
    addChild(children, "procEmi", std.procEmi);
    addChild(children, "verProc", std.verProc);
    if (std.dhCont && std.xJust) {
      addChild(children, "dhCont", std.dhCont);
      addChild(children, "xJust", std.xJust);
    }

    this.ideXml = xmlTag("ide", children.join(""));
  }

  private entityBA02(std: ParsedFields): void {
    // NFe reference
    this.ideXml = this.ideXml.replace(
      "</ide>",
      xmlTag("NFref", xmlTag("refNFe", std.refNFe)) + "</ide>"
    );
  }

  private entityC(std: ParsedFields): void {
    this.stdEmit = { ...std };
  }

  private entityC02(std: ParsedFields): void {
    if (this.stdEmit) {
      this.stdEmit.CNPJ = std.CNPJ;
      this.buildEmit();
    }
  }

  private entityC02a(std: ParsedFields): void {
    if (this.stdEmit) {
      this.stdEmit.CPF = std.CPF;
      this.buildEmit();
    }
  }

  private buildEmit(): void {
    if (!this.stdEmit) return;
    const s = this.stdEmit;
    const children: string[] = [];
    if (s.CNPJ) addChild(children, "CNPJ", s.CNPJ);
    if (s.CPF) addChild(children, "CPF", s.CPF);
    addChild(children, "xNome", s.xNome);
    if (s.xFant) addChild(children, "xFant", s.xFant);
    // enderEmit will be appended by C05
    this.emitXml = `<emit>${children.join("")}`;
    this.stdEmit = null;
  }

  private entityC05(std: ParsedFields): void {
    const children: string[] = [];
    addChild(children, "xLgr", std.xLgr);
    addChild(children, "nro", std.nro);
    if (std.xCpl) addChild(children, "xCpl", std.xCpl);
    addChild(children, "xBairro", std.xBairro);
    addChild(children, "cMun", std.cMun);
    addChild(children, "xMun", std.xMun);
    addChild(children, "UF", std.UF);
    addChild(children, "CEP", std.CEP);
    if (std.cPais) addChild(children, "cPais", std.cPais);
    if (std.xPais) addChild(children, "xPais", std.xPais);
    if (std.fone) addChild(children, "fone", std.fone);

    const enderEmit = xmlTag("enderEmit", children.join(""));

    // Find where to insert IE (after enderEmit) - finalize emit
    // At this point emitXml is open (no closing tag). Append enderEmit then IE, CRT, close.
    // We need to recover stdEmit's IE/CRT from the still-open emitXml state.
    // Actually, emit was already partially written - let's just append
    this.emitXml += enderEmit;

    // Now we need to add IE and CRT, which were in the C entity.
    // We stored them in emitXml prefix; they need to come after enderEmit.
    // The PHP code puts them on the emit tag itself (before enderEmit).
    // Let's re-examine: PHP Make::tagemit builds: CNPJ/CPF, xNome, xFant, enderEmit (added separately),
    // IE, IEST, IM, CNAE, CRT. So IE/CRT come AFTER enderEmit.

    // We need to save IE/CRT from the C entity. Let's restructure.
    // Actually the C entity data was saved in stdEmit and used in buildEmit.
    // But IE/CRT need to be written after C05. Let me store them.
    // This is getting complex. Let me restructure buildEmit to leave placeholders.
  }

  // Actually, let me restructure the emit building to be simpler.
  // Override the C entity flow completely.

  private emitIE: string = "";
  private emitIEST: string = "";
  private emitIM: string = "";
  private emitCNAE: string = "";
  private emitCRT: string = "";
  private emitCNPJ: string = "";
  private emitCPF: string = "";
  private emitXNome: string = "";
  private emitXFant: string = "";
  private enderEmitXml: string = "";
  private hasEmit: boolean = false;

  // Re-implement emit flow:
  // When C entity comes, save all fields
  // When C02/C02a comes, save CNPJ/CPF
  // When C05 comes, build enderEmit
  // The emit XML is assembled at XML build time

  // Let me override the above methods properly by using state:

  private destCNPJ: string = "";
  private destCPF: string = "";
  private destIdEstrangeiro: string = "";
  private destXNome: string = "";
  private destIndIEDest: string = "";
  private destIE: string = "";
  private destISUF: string = "";
  private destIM: string = "";
  private destEmail: string = "";
  private enderDestXml: string = "";
  private hasDest: boolean = false;

  // Let me completely restructure. Instead of building XML in entity handlers,
  // I'll collect all data and build XML at the end.

  private ideData: ParsedFields = {};
  private nfRef: string[] = [];
  private emitData: ParsedFields = {};
  private enderEmitData: ParsedFields = {};
  private destData: ParsedFields = {};
  private enderDestData: ParsedFields = {};
  private items: ItemData[] = [];
  private currentItem: ItemData | null = null;
  private totalsData: ParsedFields = {};
  private transpData: ParsedFields = {};
  private transportaData: ParsedFields | null = null;
  private volumes: ParsedFields[] = [];
  private fatData: ParsedFields | null = null;
  private dupData: ParsedFields[] = [];
  private pagData: ParsedFields | null = null;
  private detPagItems: ParsedFields[] = [];
  private infAdicData: ParsedFields = {};

  // Completely re-do processEntity using data collection approach.
  // I need to override the entire processEntity. Let me rewrite this class
  // from scratch with a cleaner approach.
}

interface ItemData {
  nItem: number;
  prod: ParsedFields;
  cest: ParsedFields | null;
  gCred: ParsedFields | null;
  vTotTrib: string;
  icmsTag: string; // N02..N10
  icmsData: ParsedFields | null;
  ipi: IpiData | null;
  pis: PisData | null;
  cofins: CofinsData | null;
}

interface IpiData {
  header: ParsedFields; // O entity
  cst: string;
  vIPI?: string;
  vBC?: string;
  pIPI?: string;
}

interface PisData {
  CST: string;
  vBC?: string;
  pPIS?: string;
  vPIS?: string;
}

interface CofinsData {
  CST: string;
  vBC?: string;
  pCOFINS?: string;
  vCOFINS?: string;
}

// ── Helper functions ────────────────────────────────────────────────────────

function fieldsToStd(fields: string[], structDef: string): ParsedFields {
  const structFields = structDef.split("|");
  const std: ParsedFields = {};
  const len = structFields.length - 1;
  for (let i = 1; i < len; i++) {
    const name = structFields[i];
    const data = fields[i] ?? "";
    if (name && data !== "") {
      std[name] = data;
    }
  }
  return std;
}

function xmlTag(name: string, content: string): string {
  return `<${name}>${content}</${name}>`;
}

function addChild(arr: string[], name: string, value: string | undefined): void {
  if (value !== undefined && value !== null) {
    arr.push(`<${name}>${escapeXml(value)}</${name}>`);
  }
}

// escapeXml imported from ./xml-utils

// ── Clean Parser Implementation ─────────────────────────────────────────────

class NFeParser {
  private structure: Record<string, string>;
  private errors: string[] = [];
  private baseLayout: string;

  // State
  private infNFeId: string = "";
  private infNFeVersao: string = NFE_VERSION;
  private ideData: ParsedFields = {};
  private nfRef: string[] = [];
  private emitFields: ParsedFields = {};
  private enderEmitFields: ParsedFields = {};
  private destFields: ParsedFields = {};
  private enderDestFields: ParsedFields = {};
  private items: ItemBuild[] = [];
  private currentItemNum: number = 0;
  private totalsFields: ParsedFields = {};
  private transpFields: ParsedFields = {};
  private transportaFields: ParsedFields | null = null;
  private volumes: ParsedFields[] = [];
  private fatFields: ParsedFields | null = null;
  private dupItems: ParsedFields[] = [];
  private pagFields: ParsedFields | null = null;
  private detPagList: ParsedFields[] = [];
  private infAdicFields: ParsedFields = {};

  // Current item accumulation
  private curProd: ParsedFields = {};
  private curCest: ParsedFields | null = null;
  private curGCred: ParsedFields | null = null;
  private curVTotTrib: string = "";
  private curIcmsTag: string = "";
  private curIcmsData: ParsedFields | null = null;
  private curIpiHeader: ParsedFields | null = null;
  private curIpiCST: string = "";
  private curIpiVIPI: string = "";
  private curIpiVBC: string = "";
  private curIpiPIPI: string = "";
  private curPisCST: string = "";
  private curPisVBC: string = "";
  private curPisPPIS: string = "";
  private curPisVPIS: string = "";
  private curCofinsCST: string = "";
  private curCofinsVBC: string = "";
  private curCofinsPCOFINS: string = "";
  private curCofinsVCOFINS: string = "";
  private hadPIS: boolean = false;
  private hadCOFINS: boolean = false;

  constructor(version: string = "4.00", baseLayout: string = LOCAL) {
    this.baseLayout = baseLayout;
    this.structure = getStructureByVersionString(version, baseLayout);
  }

  getErrors(): string[] {
    return this.errors;
  }

  toXml(invoice: string[]): string | null {
    this.parse(invoice);
    // Validate the access key length (must be 44 digits after removing "NFe" prefix)
    if (this.infNFeId) {
      const key = this.infNFeId.replace(/^NFe/, "");
      if (key.length > 0 && key.length !== 44) {
        this.errors.push(
          `A chave informada est\u00e1 incorreta [${this.infNFeId}]`
        );
      }
    }
    if (this.errors.length > 0) {
      return null;
    }
    return this.buildXml();
  }

  dump(invoice: string[]): DumpEntry[] {
    const result: DumpEntry[] = [];
    for (const line of invoice) {
      if (!line.trim()) continue;
      const fields = line.split("|");
      const ref = fields[0].toUpperCase();
      const structDef = this.structure[ref];
      if (!structDef) continue;
      const parsed = fieldsToStd(fields, structDef);
      result.push({ tag: fields[0], ...parsed });
    }
    return result;
  }

  private parse(invoice: string[]): void {
    for (const line of invoice) {
      if (!line.trim()) continue;
      const fields = line.split("|");
      const ref = fields[0].toUpperCase();
      const structDef = this.structure[ref];
      if (!structDef) continue;
      const std = fieldsToStd(fields, structDef);
      this.handle(ref, std);
    }
    // Finalize last item if any
    this.finalizeCurrentItem();
  }

  private handle(ref: string, std: ParsedFields): void {
    switch (ref) {
      case "A":
        this.infNFeVersao = std.versao || NFE_VERSION;
        this.infNFeId = std.Id || "";
        break;
      case "B":
        this.ideData = std;
        break;
      case "BA":
        break;
      case "BA02":
        this.nfRef.push(std.refNFe || "");
        break;
      case "C":
        this.emitFields = std;
        break;
      case "C02":
        this.emitFields.CNPJ = std.CNPJ;
        break;
      case "C02A":
        this.emitFields.CPF = std.CPF;
        break;
      case "C05":
        this.enderEmitFields = std;
        break;
      case "D":
        break;
      case "E":
        this.destFields = std;
        break;
      case "E02":
        this.destFields.CNPJ = std.CNPJ;
        break;
      case "E03":
        this.destFields.CPF = std.CPF;
        break;
      case "E03A":
        this.destFields.idEstrangeiro = std.idEstrangeiro || "";
        break;
      case "E05":
        this.enderDestFields = std;
        break;
      case "H":
        this.finalizeCurrentItem();
        this.currentItemNum = parseInt(std.item || "0", 10);
        this.curProd = {};
        this.curCest = null;
        this.curGCred = null;
        this.curVTotTrib = "";
        this.curIcmsTag = "";
        this.curIcmsData = null;
        this.curIpiHeader = null;
        this.curIpiCST = "";
        this.curIpiVIPI = "";
        this.curIpiVBC = "";
        this.curIpiPIPI = "";
        this.curPisCST = "";
        this.curPisVBC = "";
        this.curPisPPIS = "";
        this.curPisVPIS = "";
        this.curCofinsCST = "";
        this.curCofinsVBC = "";
        this.curCofinsPCOFINS = "";
        this.curCofinsVCOFINS = "";
        this.hadPIS = false;
        this.hadCOFINS = false;
        break;
      case "I":
        this.curProd = std;
        break;
      case "I05C":
        this.curCest = std;
        break;
      case "I05G":
        this.curGCred = std;
        break;
      case "M":
        this.curVTotTrib = std.vTotTrib || "";
        break;
      case "N":
        break;
      case "N02":
      case "N03":
      case "N04":
      case "N05":
      case "N06":
      case "N07":
      case "N08":
      case "N09":
      case "N10":
        this.curIcmsTag = ref;
        this.curIcmsData = std;
        break;
      case "O":
        this.curIpiHeader = std;
        break;
      case "O07":
        this.curIpiCST = std.CST || "";
        this.curIpiVIPI = std.vIPI || "";
        break;
      case "O08":
        this.curIpiCST = std.CST || "";
        break;
      case "O10":
        this.curIpiVBC = std.vBC || "";
        this.curIpiPIPI = std.pIPI || "";
        break;
      case "Q":
        this.hadPIS = true;
        break;
      case "Q02":
        this.curPisCST = std.CST || "";
        this.curPisVBC = std.vBC || "";
        this.curPisPPIS = std.pPIS || "";
        this.curPisVPIS = std.vPIS || "";
        break;
      case "S":
        this.hadCOFINS = true;
        break;
      case "S02":
        this.curCofinsCST = std.CST || "";
        this.curCofinsVBC = std.vBC || "";
        this.curCofinsPCOFINS = std.pCOFINS || "";
        this.curCofinsVCOFINS = std.vCOFINS || "";
        break;
      case "W":
        this.finalizeCurrentItem();
        break;
      case "W02":
        this.totalsFields = std;
        break;
      case "W04C":
      case "W04E":
      case "W04G":
        break;
      case "X":
        this.transpFields = std;
        break;
      case "X03":
        this.transportaFields = std;
        break;
      case "X04":
        if (this.transportaFields) {
          this.transportaFields.CNPJ = std.CNPJ;
        }
        break;
      case "X05":
        if (this.transportaFields) {
          this.transportaFields.CPF = std.CPF;
        }
        break;
      case "X26":
        this.volumes.push(std);
        break;
      case "Y":
        this.pagFields = std;
        break;
      case "Y02":
        this.fatFields = std;
        break;
      case "Y07":
        this.dupItems.push(std);
        break;
      case "YA":
        if (this.baseLayout === SEBRAE) {
          this.pagFields = std;
        } else {
          this.detPagList.push(std);
        }
        break;
      case "YA01":
        this.detPagList.push(std);
        break;
      case "Z":
        this.infAdicFields = std;
        break;
      default:
        break;
    }
  }

  private finalizeCurrentItem(): void {
    if (!this.curProd.cProd && !this.curProd.xProd) return;

    this.items.push({
      nItem: this.currentItemNum,
      prod: { ...this.curProd },
      cest: this.curCest ? { ...this.curCest } : null,
      gCred: this.curGCred ? { ...this.curGCred } : null,
      vTotTrib: this.curVTotTrib,
      icmsTag: this.curIcmsTag,
      icmsData: this.curIcmsData ? { ...this.curIcmsData } : null,
      ipiHeader: this.curIpiHeader ? { ...this.curIpiHeader } : null,
      ipiCST: this.curIpiCST,
      ipiVIPI: this.curIpiVIPI,
      ipiVBC: this.curIpiVBC,
      ipiPIPI: this.curIpiPIPI,
      pisCST: this.curPisCST,
      pisVBC: this.curPisVBC,
      pisPPIS: this.curPisPPIS,
      pisVPIS: this.curPisVPIS,
      cofinsCST: this.curCofinsCST,
      cofinsVBC: this.curCofinsVBC,
      cofinsPCOFINS: this.curCofinsPCOFINS,
      cofinsVCOFINS: this.curCofinsVCOFINS,
    });

    // Clear current product data to prevent double-finalization
    this.curProd = {};
  }

  private buildXml(): string {
    const parts: string[] = [];

    // infNFe open
    parts.push(
      `<NFe xmlns="${NFE_NAMESPACE}"><infNFe Id="${this.infNFeId}" versao="${this.infNFeVersao}">`
    );

    // ide
    parts.push(this.buildIde());

    // emit
    parts.push(this.buildEmit());

    // dest
    parts.push(this.buildDest());

    // det items
    for (let i = 0; i < this.items.length; i++) {
      parts.push(this.buildDet(this.items[i], i + 1));
    }

    // total
    parts.push(this.buildTotal());

    // transp
    parts.push(this.buildTransp());

    // cobr
    if (this.fatFields) {
      parts.push(this.buildCobr());
    }

    // pag
    parts.push(this.buildPag());

    // infAdic
    if (this.infAdicFields.infAdFisco || this.infAdicFields.infCpl) {
      parts.push(this.buildInfAdic());
    }

    // close
    parts.push("</infNFe></NFe>");

    return parts.join("");
  }

  private buildIde(): string {
    const d = this.ideData;
    const c: string[] = [];
    addChild(c, "cUF", d.cUF);
    addChild(c, "cNF", (d.cNF || "").padStart(8, "0"));
    addChild(c, "natOp", d.natOp);
    addChild(c, "mod", d.mod);
    addChild(c, "serie", d.serie);
    addChild(c, "nNF", d.nNF);
    addChild(c, "dhEmi", d.dhEmi);
    if (d.dhSaiEnt) addChild(c, "dhSaiEnt", d.dhSaiEnt);
    addChild(c, "tpNF", d.tpNF);
    addChild(c, "idDest", d.idDest);
    addChild(c, "cMunFG", d.cMunFG);
    addChild(c, "tpImp", d.tpImp);
    addChild(c, "tpEmis", d.tpEmis);
    addChild(c, "cDV", d.cDV || "0");
    addChild(c, "tpAmb", d.tpAmb);
    addChild(c, "finNFe", d.finNFe);
    addChild(c, "indFinal", d.indFinal);
    addChild(c, "indPres", d.indPres);
    if (d.indIntermed) addChild(c, "indIntermed", d.indIntermed);
    addChild(c, "procEmi", d.procEmi);
    addChild(c, "verProc", d.verProc);

    // NFref
    for (const ref of this.nfRef) {
      c.push(xmlTag("NFref", xmlTag("refNFe", ref)));
    }

    if (d.dhCont && d.xJust) {
      addChild(c, "dhCont", d.dhCont);
      addChild(c, "xJust", d.xJust);
    }

    return xmlTag("ide", c.join(""));
  }

  private buildEmit(): string {
    const e = this.emitFields;
    const c: string[] = [];
    if (e.CNPJ) addChild(c, "CNPJ", e.CNPJ);
    if (e.CPF) addChild(c, "CPF", e.CPF);
    addChild(c, "xNome", e.xNome);
    if (e.xFant) addChild(c, "xFant", e.xFant);

    // enderEmit
    const ec: string[] = [];
    const ee = this.enderEmitFields;
    addChild(ec, "xLgr", ee.xLgr);
    addChild(ec, "nro", ee.nro);
    if (ee.xCpl) addChild(ec, "xCpl", ee.xCpl);
    addChild(ec, "xBairro", ee.xBairro);
    addChild(ec, "cMun", ee.cMun);
    addChild(ec, "xMun", ee.xMun);
    addChild(ec, "UF", ee.UF);
    addChild(ec, "CEP", ee.CEP);
    if (ee.cPais) addChild(ec, "cPais", ee.cPais);
    if (ee.xPais) addChild(ec, "xPais", ee.xPais);
    if (ee.fone) addChild(ec, "fone", ee.fone);
    c.push(xmlTag("enderEmit", ec.join("")));

    if (e.IE) addChild(c, "IE", e.IE);
    if (e.IEST) addChild(c, "IEST", e.IEST);
    if (e.IM) addChild(c, "IM", e.IM);
    if (e.CNAE) addChild(c, "CNAE", e.CNAE);
    addChild(c, "CRT", e.CRT);

    return xmlTag("emit", c.join(""));
  }

  private buildDest(): string {
    const d = this.destFields;
    const c: string[] = [];
    if (d.CNPJ) addChild(c, "CNPJ", d.CNPJ);
    if (d.CPF) addChild(c, "CPF", d.CPF);
    if (d.idEstrangeiro !== undefined) addChild(c, "idEstrangeiro", d.idEstrangeiro);
    addChild(c, "xNome", d.xNome);

    // enderDest
    if (this.enderDestFields.xLgr) {
      const ec: string[] = [];
      const ee = this.enderDestFields;
      addChild(ec, "xLgr", ee.xLgr);
      addChild(ec, "nro", ee.nro);
      if (ee.xCpl) addChild(ec, "xCpl", ee.xCpl);
      addChild(ec, "xBairro", ee.xBairro);
      addChild(ec, "cMun", ee.cMun);
      addChild(ec, "xMun", ee.xMun);
      addChild(ec, "UF", ee.UF);
      addChild(ec, "CEP", ee.CEP);
      if (ee.cPais) addChild(ec, "cPais", ee.cPais);
      if (ee.xPais) addChild(ec, "xPais", ee.xPais);
      if (ee.fone) addChild(ec, "fone", ee.fone);
      c.push(xmlTag("enderDest", ec.join("")));
    }

    if (d.indIEDest) addChild(c, "indIEDest", d.indIEDest);
    if (d.IE) addChild(c, "IE", d.IE);
    if (d.ISUF) addChild(c, "ISUF", d.ISUF);
    if (d.IM) addChild(c, "IM", d.IM);
    if (d.email) addChild(c, "email", d.email);

    return xmlTag("dest", c.join(""));
  }

  private buildDet(item: ItemBuild, nItem: number): string {
    const c: string[] = [];

    // prod
    c.push(this.buildProd(item));

    // imposto
    c.push(this.buildImposto(item));

    return `<det nItem="${nItem}">${c.join("")}</det>`;
  }

  private buildProd(item: ItemBuild): string {
    const p = item.prod;
    const c: string[] = [];
    addChild(c, "cProd", p.cProd);
    addChild(c, "cEAN", p.cEAN || "SEM GTIN");
    addChild(c, "xProd", p.xProd);
    addChild(c, "NCM", p.NCM);
    if (item.cest) {
      addChild(c, "CEST", item.cest.CEST);
    }
    if (p.cBenef) addChild(c, "cBenef", p.cBenef);
    if (p.EXTIPI) addChild(c, "EXTIPI", p.EXTIPI);
    addChild(c, "CFOP", p.CFOP);
    addChild(c, "uCom", p.uCom);
    addChild(c, "qCom", p.qCom);
    addChild(c, "vUnCom", p.vUnCom ? formatDecimal(p.vUnCom, 10) : "");
    addChild(c, "vProd", p.vProd);
    addChild(c, "cEANTrib", p.cEANTrib || "SEM GTIN");
    addChild(c, "uTrib", p.uTrib);
    addChild(c, "qTrib", p.qTrib);
    addChild(c, "vUnTrib", p.vUnTrib ? formatDecimal(p.vUnTrib, 10) : "");
    if (p.vFrete) addChild(c, "vFrete", p.vFrete);
    if (p.vSeg) addChild(c, "vSeg", p.vSeg);
    if (p.vDesc) addChild(c, "vDesc", p.vDesc);
    if (p.vOutro) addChild(c, "vOutro", p.vOutro);
    addChild(c, "indTot", p.indTot || "1");
    if (p.xPed) addChild(c, "xPed", p.xPed);
    if (p.nItemPed) addChild(c, "nItemPed", p.nItemPed);

    // gCred
    if (item.gCred) {
      const gc: string[] = [];
      addChild(gc, "cCredPresumido", item.gCred.cCredPresumido);
      addChild(gc, "pCredPresumido", item.gCred.pCredPresumido);
      addChild(gc, "vCredPresumido", item.gCred.vCredPresumido);
      c.push(xmlTag("gCred", gc.join("")));
    }

    return xmlTag("prod", c.join(""));
  }

  private buildImposto(item: ItemBuild): string {
    const c: string[] = [];
    if (item.vTotTrib) {
      addChild(c, "vTotTrib", item.vTotTrib);
    }

    // ICMS
    if (item.icmsData) {
      c.push(this.buildICMS(item));
    }

    // IPI
    if (item.ipiHeader || item.ipiCST) {
      c.push(this.buildIPI(item));
    }

    // PIS
    if (item.pisCST) {
      c.push(this.buildPIS(item));
    }

    // COFINS
    if (item.cofinsCST) {
      c.push(this.buildCOFINS(item));
    }

    return xmlTag("imposto", c.join(""));
  }

  private buildICMS(item: ItemBuild): string {
    if (!item.icmsData) return "";
    const d = item.icmsData;
    const cst = d.CST || d.CSOSN || "";

    // Determine ICMS group tag from CST
    const icmsGroupTag = this.getIcmsGroupTag(cst);
    const ic: string[] = [];
    addChild(ic, "orig", d.orig);
    addChild(ic, "CST", d.CST);
    if (d.CSOSN) addChild(ic, "CSOSN", d.CSOSN);
    if (d.modBC) addChild(ic, "modBC", d.modBC);
    if (d.pRedBC) addChild(ic, "pRedBC", d.pRedBC);
    if (d.vBC) addChild(ic, "vBC", d.vBC);
    if (d.pICMS) addChild(ic, "pICMS", d.pICMS ? formatDecimal(d.pICMS, 4) : undefined);
    if (d.vICMS) addChild(ic, "vICMS", d.vICMS);
    if (d.vBCFCP) addChild(ic, "vBCFCP", d.vBCFCP);
    if (d.pFCP) addChild(ic, "pFCP", d.pFCP);
    if (d.vFCP) addChild(ic, "vFCP", d.vFCP);
    if (d.modBCST) addChild(ic, "modBCST", d.modBCST);
    if (d.pMVAST) addChild(ic, "pMVAST", d.pMVAST);
    if (d.pRedBCST) addChild(ic, "pRedBCST", d.pRedBCST);
    if (d.vBCST) addChild(ic, "vBCST", d.vBCST);
    if (d.pICMSST) addChild(ic, "pICMSST", d.pICMSST ? formatDecimal(d.pICMSST, 4) : undefined);
    if (d.vICMSST) addChild(ic, "vICMSST", d.vICMSST);
    if (d.vICMSDeson) addChild(ic, "vICMSDeson", d.vICMSDeson);
    if (d.motDesICMS) addChild(ic, "motDesICMS", d.motDesICMS);

    return xmlTag("ICMS", xmlTag(icmsGroupTag, ic.join("")));
  }

  private getIcmsGroupTag(cst: string): string {
    const map: Record<string, string> = {
      "00": "ICMS00",
      "10": "ICMS10",
      "20": "ICMS20",
      "30": "ICMS30",
      "40": "ICMS40",
      "41": "ICMS40",
      "50": "ICMS40",
      "51": "ICMS51",
      "60": "ICMS60",
      "70": "ICMS70",
      "90": "ICMS90",
    };
    return map[cst] || `ICMS${cst}`;
  }

  private buildIPI(item: ItemBuild): string {
    const c: string[] = [];
    const h = item.ipiHeader || {};

    if (h.qSelo) addChild(c, "qSelo", h.qSelo);
    if (h.cEnq) addChild(c, "cEnq", h.cEnq);

    // Determine if IPITrib or IPINT
    const cst = item.ipiCST;
    const tribCSTs = ["00", "49", "50", "99"];
    if (tribCSTs.includes(cst)) {
      const tc: string[] = [];
      addChild(tc, "CST", cst);
      if (item.ipiVBC) addChild(tc, "vBC", item.ipiVBC);
      if (item.ipiPIPI) addChild(tc, "pIPI", item.ipiPIPI ? formatDecimal(item.ipiPIPI, 4) : undefined);
      if (item.ipiVIPI) addChild(tc, "vIPI", item.ipiVIPI);
      c.push(xmlTag("IPITrib", tc.join("")));
    } else if (cst) {
      c.push(xmlTag("IPINT", `<CST>${cst}</CST>`));
    }

    return xmlTag("IPI", c.join(""));
  }

  private buildPIS(item: ItemBuild): string {
    const cst = item.pisCST;
    const aliqCSTs = ["01", "02"];
    if (aliqCSTs.includes(cst)) {
      const c: string[] = [];
      addChild(c, "CST", cst);
      if (item.pisVBC) addChild(c, "vBC", item.pisVBC);
      if (item.pisPPIS) addChild(c, "pPIS", item.pisPPIS ? formatDecimal(item.pisPPIS, 4) : undefined);
      if (item.pisVPIS) addChild(c, "vPIS", item.pisVPIS);
      return xmlTag("PIS", xmlTag("PISAliq", c.join("")));
    }
    // Other CSTs
    const c: string[] = [];
    addChild(c, "CST", cst);
    if (item.pisVBC) addChild(c, "vBC", item.pisVBC);
    if (item.pisPPIS) addChild(c, "pPIS", item.pisPPIS ? formatDecimal(item.pisPPIS, 4) : undefined);
    if (item.pisVPIS) addChild(c, "vPIS", item.pisVPIS);
    return xmlTag("PIS", xmlTag("PISOutr", c.join("")));
  }

  private buildCOFINS(item: ItemBuild): string {
    const cst = item.cofinsCST;
    const aliqCSTs = ["01", "02"];
    if (aliqCSTs.includes(cst)) {
      const c: string[] = [];
      addChild(c, "CST", cst);
      if (item.cofinsVBC) addChild(c, "vBC", item.cofinsVBC);
      if (item.cofinsPCOFINS) addChild(c, "pCOFINS", item.cofinsPCOFINS ? formatDecimal(item.cofinsPCOFINS, 4) : undefined);
      if (item.cofinsVCOFINS) addChild(c, "vCOFINS", item.cofinsVCOFINS);
      return xmlTag("COFINS", xmlTag("COFINSAliq", c.join("")));
    }
    const c: string[] = [];
    addChild(c, "CST", cst);
    if (item.cofinsVBC) addChild(c, "vBC", item.cofinsVBC);
    if (item.cofinsPCOFINS) addChild(c, "pCOFINS", item.cofinsPCOFINS ? formatDecimal(item.cofinsPCOFINS, 4) : undefined);
    if (item.cofinsVCOFINS) addChild(c, "vCOFINS", item.cofinsVCOFINS);
    return xmlTag("COFINS", xmlTag("COFINSOutr", c.join("")));
  }

  private buildTotal(): string {
    const t = this.totalsFields;
    const c: string[] = [];
    addChild(c, "vBC", t.vBC);
    addChild(c, "vICMS", t.vICMS);
    addChild(c, "vICMSDeson", t.vICMSDeson);
    addChild(c, "vFCP", t.vFCP);
    addChild(c, "vBCST", t.vBCST);
    addChild(c, "vST", t.vST);
    addChild(c, "vFCPST", t.vFCPST);
    addChild(c, "vFCPSTRet", t.vFCPSTRet);
    addChild(c, "vProd", t.vProd);
    addChild(c, "vFrete", t.vFrete);
    addChild(c, "vSeg", t.vSeg);
    addChild(c, "vDesc", t.vDesc);
    addChild(c, "vII", t.vII);
    addChild(c, "vIPI", t.vIPI);
    addChild(c, "vIPIDevol", t.vIPIDevol);
    addChild(c, "vPIS", t.vPIS);
    addChild(c, "vCOFINS", t.vCOFINS);
    addChild(c, "vOutro", t.vOutro);
    addChild(c, "vNF", t.vNF);
    if (t.vTotTrib) addChild(c, "vTotTrib", t.vTotTrib);

    return xmlTag("total", xmlTag("ICMSTot", c.join("")));
  }

  private buildTransp(): string {
    const c: string[] = [];
    addChild(c, "modFrete", this.transpFields.modFrete);

    if (this.transportaFields) {
      const tc: string[] = [];
      const t = this.transportaFields;
      if (t.CNPJ) addChild(tc, "CNPJ", t.CNPJ);
      if (t.CPF) addChild(tc, "CPF", t.CPF);
      addChild(tc, "xNome", t.xNome);
      if (t.IE) addChild(tc, "IE", t.IE);
      if (t.xEnder) addChild(tc, "xEnder", t.xEnder);
      if (t.xMun) addChild(tc, "xMun", t.xMun);
      if (t.UF) addChild(tc, "UF", t.UF);
      c.push(xmlTag("transporta", tc.join("")));
    }

    for (const vol of this.volumes) {
      const vc: string[] = [];
      if (vol.qVol) addChild(vc, "qVol", vol.qVol);
      if (vol.esp) addChild(vc, "esp", vol.esp);
      if (vol.marca) addChild(vc, "marca", vol.marca);
      if (vol.nVol) addChild(vc, "nVol", vol.nVol);
      if (vol.pesoL) addChild(vc, "pesoL", vol.pesoL);
      if (vol.pesoB) addChild(vc, "pesoB", vol.pesoB);
      c.push(xmlTag("vol", vc.join("")));
    }

    return xmlTag("transp", c.join(""));
  }

  private buildCobr(): string {
    const c: string[] = [];

    if (this.fatFields) {
      const fc: string[] = [];
      addChild(fc, "nFat", this.fatFields.nFat);
      addChild(fc, "vOrig", this.fatFields.vOrig);
      addChild(fc, "vDesc", this.fatFields.vDesc);
      addChild(fc, "vLiq", this.fatFields.vLiq);
      c.push(xmlTag("fat", fc.join("")));
    }

    for (const dup of this.dupItems) {
      const dc: string[] = [];
      addChild(dc, "nDup", dup.nDup);
      addChild(dc, "dVenc", dup.dVenc);
      addChild(dc, "vDup", dup.vDup);
      c.push(xmlTag("dup", dc.join("")));
    }

    return xmlTag("cobr", c.join(""));
  }

  private buildPag(): string {
    const c: string[] = [];
    for (const dp of this.detPagList) {
      const dc: string[] = [];
      if (dp.indPag) addChild(dc, "indPag", dp.indPag);
      addChild(dc, "tPag", dp.tPag);
      addChild(dc, "vPag", dp.vPag);
      c.push(xmlTag("detPag", dc.join("")));
    }
    const vTroco = this.pagFields?.vTroco;
    if (vTroco) addChild(c, "vTroco", vTroco);
    return xmlTag("pag", c.join(""));
  }

  private buildInfAdic(): string {
    const c: string[] = [];
    if (this.infAdicFields.infAdFisco) {
      addChild(c, "infAdFisco", this.infAdicFields.infAdFisco);
    }
    if (this.infAdicFields.infCpl) {
      addChild(c, "infCpl", this.infAdicFields.infCpl);
    }
    return xmlTag("infAdic", c.join(""));
  }
}

interface ItemBuild {
  nItem: number;
  prod: ParsedFields;
  cest: ParsedFields | null;
  gCred: ParsedFields | null;
  vTotTrib: string;
  icmsTag: string;
  icmsData: ParsedFields | null;
  ipiHeader: ParsedFields | null;
  ipiCST: string;
  ipiVIPI: string;
  ipiVBC: string;
  ipiPIPI: string;
  pisCST: string;
  pisVBC: string;
  pisPPIS: string;
  pisVPIS: string;
  cofinsCST: string;
  cofinsVBC: string;
  cofinsPCOFINS: string;
  cofinsVCOFINS: string;
}

function formatDecimal(value: string, decimals: number): string {
  // If it already has the right number of decimals, return as-is
  const parts = value.split(".");
  if (parts.length === 2 && parts[1].length === decimals) return value;
  if (parts.length === 2 && parts[1].length >= decimals) return value;
  // Pad with zeros
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return num.toFixed(decimals);
}

// Re-export the Convert class using NFeParser internally
// Actually, let me fix the Convert class to use NFeParser

// Override the original Convert class's internal parser reference
Object.defineProperty(Convert.prototype, '_createParser', {
  value: function(version: string, baseLayout: string) {
    return new NFeParser(version, baseLayout);
  }
});

// Fix Convert.toXml to use NFeParser
const origToXml = Convert.prototype.toXml;
Convert.prototype.toXml = function(): string[] {
  // Re-implement using NFeParser
  const self = this as any;
  if (!self.isNFe(self.txt)) {
    throw new Error("Wrong document: not a valid NFe TXT");
  }
  self.invoices = self.sliceInvoices(self.data);
  self.checkNfeCount();
  self.validateInvoices();

  const xmls: string[] = [];
  for (let i = 0; i < self.invoices.length; i++) {
    const invoice = self.invoices[i];
    const version = self.layouts[i];
    const parser = new NFeParser(version, self.baseLayout);
    const xml = parser.toXml(invoice);
    if (!xml) {
      const errors = parser.getErrors();
      if (errors.length > 0) {
        throw new ParserError(errors.join(", "));
      }
      throw new Error("Failed to convert TXT to XML");
    }
    const parserErrors = parser.getErrors();
    if (parserErrors.length > 0) {
      throw new ParserError(parserErrors.join(", "));
    }
    xmls.push(xml);
  }
  self.xmls = xmls;
  return xmls;
};

const origDump = Convert.prototype.dump;
Convert.prototype.dump = function(): DumpEntry[][] {
  const self = this as any;
  if (!self.isNFe(self.txt)) {
    throw new Error("Wrong document: not a valid NFe TXT");
  }
  self.invoices = self.sliceInvoices(self.data);
  self.checkNfeCount();
  self.validateInvoices();

  const dumps: DumpEntry[][] = [];
  for (let i = 0; i < self.invoices.length; i++) {
    const invoice = self.invoices[i];
    const version = self.layouts[i];
    const parser = new NFeParser(version, self.baseLayout);
    dumps.push(parser.dump(invoice));
  }
  return dumps;
};
