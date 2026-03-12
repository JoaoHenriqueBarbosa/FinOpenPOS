/**
 * Benchmark script for the fiscal TypeScript library.
 *
 * Mirrors the Rust benchmarks in fiscal-rs/benches/fiscal_bench.rs
 * and fiscal-rs/benchmarks/rust/bench_runner.rs.
 *
 * Run with:
 *   bun run packages/fiscal/src/__tests__/benchmark.ts          # human-readable table
 *   bun run packages/fiscal/src/__tests__/benchmark.ts --json   # JSON array output
 */

import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { formatCents, formatRate, formatRate4, formatCentsOrZero } from "../format-utils";
import { escapeXml, tag } from "../xml-utils";
import { serializeTaxElement, type TaxElement, type TaxField } from "../tax-element";
import { createIcmsTotals, mergeIcmsTotals, type IcmsTotals } from "../tax-icms";
import { STATE_IBGE_CODES, IBGE_TO_UF, getStateCode, getStateByCode } from "../state-codes";
import { buildInvoiceXml } from "../xml-builder";
import { signXml } from "../certificate";
import type { InvoiceBuildData, InvoiceItemData, PaymentData } from "../types";

const JSON_MODE = process.argv.includes("--json");

// ── Benchmark harness ───────────────────────────────────────────────────────

interface BenchResult {
  name: string;
  iterations: number;
  totalMs: number;
  opsPerSec: number;
  nsPerOp: number;
}

function bench(name: string, iterations: number, fn: () => void): BenchResult {
  // Warmup: 10% of iterations or at least 1000
  const warmup = Math.max(Math.floor(iterations * 0.1), 1000);
  for (let i = 0; i < warmup; i++) fn();

  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const totalMs = performance.now() - start;

  const opsPerSec = (iterations / totalMs) * 1000;
  const nsPerOp = (totalMs / iterations) * 1_000_000;

  return { name, iterations, totalMs, opsPerSec, nsPerOp };
}

function printResults(results: BenchResult[]): void {
  if (JSON_MODE) return; // suppress table in JSON mode

  // Find max name length for alignment
  const maxName = Math.max(...results.map((r) => r.name.length));

  console.log("");
  console.log(
    "  " +
      "Benchmark".padEnd(maxName + 2) +
      "Iterations".padStart(12) +
      "Total (ms)".padStart(14) +
      "ops/sec".padStart(16) +
      "ns/op".padStart(12)
  );
  console.log("  " + "-".repeat(maxName + 2 + 12 + 14 + 16 + 12));

  for (const r of results) {
    console.log(
      "  " +
        r.name.padEnd(maxName + 2) +
        r.iterations.toLocaleString().padStart(12) +
        r.totalMs.toFixed(2).padStart(14) +
        Math.round(r.opsPerSec).toLocaleString().padStart(16) +
        r.nsPerOp.toFixed(1).padStart(12)
    );
  }

  console.log("");
}

// Collect all results across sections for final JSON output
const allResults: BenchResult[] = [];

// ── Helpers for invoice builder & signing benchmarks ────────────────────────

function makeSampleInvoiceData(): InvoiceBuildData {
  return {
    model: 55,
    series: 1,
    number: 123,
    emissionType: 1,
    environment: 2,
    issuedAt: new Date("2026-03-11T10:30:00-03:00"),
    operationNature: "VENDA",
    issuer: {
      taxId: "04123456000190",
      stateTaxId: "9012345678",
      companyName: "Auto Eletrica Barbosa LTDA",
      tradeName: "Auto Eletrica Barbosa",
      taxRegime: 3,
      stateCode: "PR",
      cityCode: "4106902",
      cityName: "Curitiba",
      street: "Rua XV de Novembro",
      streetNumber: "1000",
      district: "Centro",
      zipCode: "80020310",
      addressComplement: null,
    },
    recipient: {
      taxId: "12345678901234",
      name: "Cliente Teste LTDA",
      stateCode: "PR",
      stateTaxId: "1234567890",
      street: "Rua das Flores",
      streetNumber: "500",
      district: "Batel",
      cityCode: "4106902",
      cityName: "Curitiba",
      zipCode: "80420120",
    },
    items: [makeSampleItem(1)],
    payments: [{ method: "01", amount: 15000 }],
  };
}

function makeSampleItem(n: number): InvoiceItemData {
  return {
    itemNumber: n,
    productCode: String(n).padStart(3, "0"),
    description: "Servico de eletrica automotiva",
    ncm: "00000000",
    cfop: "5102",
    unitOfMeasure: "UN",
    quantity: 1.0,
    unitPrice: 15000,
    totalPrice: 15000,
    orig: "0",
    icmsCst: "00",
    icmsModBC: 0,
    icmsRate: 1800,
    icmsAmount: 2700,
    pisCst: "01",
    pisVBC: 15000,
    pisPPIS: 16500,
    pisVPIS: 248,
    cofinsCst: "01",
    cofinsVBC: 15000,
    cofinsPCOFINS: 76000,
    cofinsVCOFINS: 1140,
  };
}

function makeSampleUnsignedNfeXml(): string {
  return (
    '<NFe xmlns="http://www.portalfiscal.inf.br/nfe">' +
    '<infNFe versao="4.00" Id="NFe41260304123456000190550010000001231123456780">' +
    "<ide><cUF>41</cUF><cNF>12345678</cNF><natOp>VENDA</natOp>" +
    "<mod>55</mod><serie>1</serie><nNF>123</nNF>" +
    "<dhEmi>2026-03-11T10:30:00-03:00</dhEmi>" +
    "<tpNF>1</tpNF><idDest>1</idDest><cMunFG>4106902</cMunFG>" +
    "<tpImp>1</tpImp><tpEmis>1</tpEmis><cDV>0</cDV>" +
    "<tpAmb>2</tpAmb><finNFe>1</finNFe><indFinal>1</indFinal>" +
    "<indPres>1</indPres><procEmi>0</procEmi><verProc>1.0</verProc></ide>" +
    "<emit><CNPJ>04123456000190</CNPJ><xNome>Auto Eletrica Barbosa LTDA</xNome>" +
    "<enderEmit><xLgr>Rua XV</xLgr><nro>1000</nro><xBairro>Centro</xBairro>" +
    "<cMun>4106902</cMun><xMun>Curitiba</xMun><UF>PR</UF><CEP>80020310</CEP>" +
    "<cPais>1058</cPais><xPais>Brasil</xPais></enderEmit>" +
    "<IE>9012345678</IE><CRT>3</CRT></emit>" +
    '<det nItem="1"><prod><cProd>001</cProd><cEAN>SEM GTIN</cEAN>' +
    "<xProd>Servico de eletrica</xProd>" +
    "<NCM>00000000</NCM><CFOP>5102</CFOP><uCom>UN</uCom>" +
    "<qCom>1.0000</qCom><vUnCom>150.0000000000</vUnCom><vProd>150.00</vProd>" +
    "<cEANTrib>SEM GTIN</cEANTrib><uTrib>UN</uTrib>" +
    "<qTrib>1.0000</qTrib><vUnTrib>150.0000000000</vUnTrib>" +
    "<indTot>1</indTot></prod>" +
    "<imposto><ICMS><ICMS00><orig>0</orig><CST>00</CST><modBC>0</modBC>" +
    "<vBC>150.00</vBC><pICMS>18.0000</pICMS><vICMS>27.00</vICMS>" +
    "</ICMS00></ICMS></imposto></det>" +
    "<total><ICMSTot><vBC>150.00</vBC><vICMS>27.00</vICMS>" +
    "<vNF>150.00</vNF></ICMSTot></total>" +
    "<transp><modFrete>9</modFrete></transp>" +
    "<pag><detPag><tPag>01</tPag><vPag>150.00</vPag></detPag></pag>" +
    "</infNFe></NFe>"
  );
}

function makeTestKeypair(): { privateKeyPem: string; certPem: string } {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });

  // Generate a self-signed certificate using openssl CLI
  const keyPem = privateKey.export({ type: "pkcs8", format: "pem" }) as string;
  // Write key to temp file for openssl
  require("node:fs").writeFileSync("/tmp/_bench_key.pem", keyPem);
  execSync(
    'openssl req -new -x509 -key /tmp/_bench_key.pem -out /tmp/_bench_cert.pem -days 365 -subj "/CN=Bench Test" -nodes 2>/dev/null'
  );
  const certPem = require("node:fs").readFileSync("/tmp/_bench_cert.pem", "utf-8");
  // Cleanup
  try {
    require("node:fs").unlinkSync("/tmp/_bench_key.pem");
    require("node:fs").unlinkSync("/tmp/_bench_cert.pem");
  } catch {}

  return { privateKeyPem: keyPem, certPem };
}

// ── Format Utils ────────────────────────────────────────────────────────────

const ITERS_FAST = 1_000_000;
const ITERS_MED = 500_000;
const ITERS_SLOW = 100_000;
const ITERS_VERY_SLOW = 10_000;

const formatResults: BenchResult[] = [];

formatResults.push(
  bench("format_cents_2", ITERS_FAST, () => {
    formatCents(123456, 2);
  })
);

formatResults.push(
  bench("format_cents_10dp", ITERS_FAST, () => {
    formatCents(123456, 10);
  })
);

formatResults.push(
  bench("format_rate_4", ITERS_FAST, () => {
    formatRate(1800, 4);
  })
);

formatResults.push(
  bench("format_rate4_pis", ITERS_FAST, () => {
    formatRate4(16500);
  })
);

formatResults.push(
  bench("format_cents_or_zero_some", ITERS_FAST, () => {
    formatCentsOrZero(9999, 2);
  })
);

formatResults.push(
  bench("format_cents_or_zero_none", ITERS_FAST, () => {
    formatCentsOrZero(undefined, 2);
  })
);

if (!JSON_MODE) console.log("== Format Utils ==");
printResults(formatResults);
allResults.push(...formatResults);

// ── XML Utils ───────────────────────────────────────────────────────────────

const xmlResults: BenchResult[] = [];

xmlResults.push(
  bench("escape_xml_clean", ITERS_FAST, () => {
    escapeXml("Auto Eletrica Barbosa LTDA");
  })
);

xmlResults.push(
  bench("escape_xml_dirty", ITERS_FAST, () => {
    escapeXml("M&M's <special> \"quoted\" & 'apos'");
  })
);

xmlResults.push(
  bench("tag_simple_text", ITERS_MED, () => {
    tag("xNome", {}, "Test Company");
  })
);

xmlResults.push(
  bench("tag_with_attrs", ITERS_MED, () => {
    tag("det", { nItem: "1" }, [
      tag("cProd", {}, "001"),
      tag("xProd", {}, "Widget"),
    ]);
  })
);

xmlResults.push(
  bench("tag_nested_invoice_item", ITERS_SLOW, () => {
    tag("det", { nItem: "1" }, [
      tag("prod", {}, [
        tag("cProd", {}, "001"),
        tag("cEAN", {}, "SEM GTIN"),
        tag("xProd", {}, "Servico de eletrica"),
        tag("NCM", {}, "00000000"),
        tag("CFOP", {}, "5102"),
        tag("uCom", {}, "UN"),
        tag("qCom", {}, "1.0000"),
        tag("vUnCom", {}, "150.0000000000"),
        tag("vProd", {}, "150.00"),
        tag("cEANTrib", {}, "SEM GTIN"),
        tag("uTrib", {}, "UN"),
        tag("qTrib", {}, "1.0000"),
        tag("vUnTrib", {}, "150.0000000000"),
        tag("indTot", {}, "1"),
      ]),
      tag("imposto", {}, [
        tag("ICMS", {}, [
          tag("ICMS00", {}, [
            tag("orig", {}, "0"),
            tag("CST", {}, "00"),
            tag("modBC", {}, "0"),
            tag("vBC", {}, "150.00"),
            tag("pICMS", {}, "18.0000"),
            tag("vICMS", {}, "27.00"),
          ]),
        ]),
      ]),
    ]);
  })
);

xmlResults.push(
  bench("tag_empty", ITERS_FAST, () => {
    tag("Signature", {}, undefined);
  })
);

if (!JSON_MODE) console.log("== XML Utils ==");
printResults(xmlResults);
allResults.push(...xmlResults);

// ── Tax Element ─────────────────────────────────────────────────────────────

const taxElementResults: BenchResult[] = [];

const icms00Element: TaxElement = {
  outerTag: "ICMS",
  outerFields: [],
  variantTag: "ICMS00",
  fields: [
    { name: "orig", value: "0" },
    { name: "CST", value: "00" },
    { name: "modBC", value: "0" },
    { name: "vBC", value: "150.00" },
    { name: "pICMS", value: "18.0000" },
    { name: "vICMS", value: "27.00" },
  ],
};

taxElementResults.push(
  bench("serialize_icms00", ITERS_MED, () => {
    serializeTaxElement(icms00Element);
  })
);

const ipiElement: TaxElement = {
  outerTag: "IPI",
  outerFields: [{ name: "cEnq", value: "999" }],
  variantTag: "IPITrib",
  fields: [
    { name: "CST", value: "50" },
    { name: "vBC", value: "100.00" },
    { name: "pIPI", value: "5.0000" },
    { name: "vIPI", value: "5.00" },
  ],
};

taxElementResults.push(
  bench("serialize_ipi_with_outer_fields", ITERS_MED, () => {
    serializeTaxElement(ipiElement);
  })
);

const iiElement: TaxElement = {
  outerTag: null,
  outerFields: [],
  variantTag: "II",
  fields: [
    { name: "vBC", value: "1000.00" },
    { name: "vDespAdu", value: "50.00" },
    { name: "vII", value: "100.00" },
    { name: "vIOF", value: "10.00" },
  ],
};

taxElementResults.push(
  bench("serialize_no_outer", ITERS_MED, () => {
    serializeTaxElement(iiElement);
  })
);

if (!JSON_MODE) console.log("== Tax Element ==");
printResults(taxElementResults);
allResults.push(...taxElementResults);

// ── ICMS Totals ─────────────────────────────────────────────────────────────

const icmsTotalsResults: BenchResult[] = [];

icmsTotalsResults.push(
  bench("create_icms_totals", ITERS_FAST, () => {
    createIcmsTotals();
  })
);

const mergeSource: IcmsTotals = {
  vBC: 10000,
  vICMS: 1800,
  vICMSDeson: 0,
  vBCST: 5000,
  vST: 900,
  vFCP: 200,
  vFCPST: 100,
  vFCPSTRet: 0,
  vFCPUFDest: 0,
  vICMSUFDest: 0,
  vICMSUFRemet: 0,
  qBCMono: 0,
  vICMSMono: 0,
  qBCMonoReten: 0,
  vICMSMonoReten: 0,
  qBCMonoRet: 0,
  vICMSMonoRet: 0,
};

icmsTotalsResults.push(
  bench("merge_icms_totals", ITERS_FAST, () => {
    const target = createIcmsTotals();
    mergeIcmsTotals(target, mergeSource);
  })
);

const mergeSource10: IcmsTotals = {
  vBC: 10000,
  vICMS: 1800,
  vICMSDeson: 0,
  vBCST: 0,
  vST: 0,
  vFCP: 200,
  vFCPST: 0,
  vFCPSTRet: 0,
  vFCPUFDest: 0,
  vICMSUFDest: 0,
  vICMSUFRemet: 0,
  qBCMono: 0,
  vICMSMono: 0,
  qBCMonoReten: 0,
  vICMSMonoReten: 0,
  qBCMonoRet: 0,
  vICMSMonoRet: 0,
};

icmsTotalsResults.push(
  bench("merge_icms_totals_10_items", ITERS_MED, () => {
    const target = createIcmsTotals();
    for (let i = 0; i < 10; i++) {
      mergeIcmsTotals(target, mergeSource10);
    }
  })
);

if (!JSON_MODE) console.log("== ICMS Totals ==");
printResults(icmsTotalsResults);
allResults.push(...icmsTotalsResults);

// ── State Codes ─────────────────────────────────────────────────────────────

const stateCodeResults: BenchResult[] = [];

stateCodeResults.push(
  bench("get_state_code", ITERS_FAST, () => {
    getStateCode("PR");
  })
);

stateCodeResults.push(
  bench("get_state_by_code", ITERS_FAST, () => {
    getStateByCode("41");
  })
);

const ALL_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

stateCodeResults.push(
  bench("state_code_all_27", ITERS_MED, () => {
    for (const uf of ALL_STATES) {
      getStateCode(uf);
    }
  })
);

if (!JSON_MODE) console.log("== State Codes ==");
printResults(stateCodeResults);
allResults.push(...stateCodeResults);

// ── Invoice Builder (parity with Rust invoice_builder_simple) ───────────────

const invoiceBuilderResults: BenchResult[] = [];

{
  const invoiceData = makeSampleInvoiceData();
  invoiceBuilderResults.push(
    bench("invoice_builder_simple", ITERS_SLOW, () => {
      buildInvoiceXml(invoiceData);
    })
  );
}

if (!JSON_MODE) console.log("== Invoice Builder ==");
printResults(invoiceBuilderResults);
allResults.push(...invoiceBuilderResults);

// ── XML Signing (parity with Rust sign_xml) ─────────────────────────────────

const signXmlResults: BenchResult[] = [];

{
  const { privateKeyPem, certPem } = makeTestKeypair();
  const xml = makeSampleUnsignedNfeXml();
  signXmlResults.push(
    bench("sign_xml", ITERS_VERY_SLOW, () => {
      signXml(xml, privateKeyPem, certPem);
    })
  );
}

if (!JSON_MODE) console.log("== XML Signing ==");
printResults(signXmlResults);
allResults.push(...signXmlResults);

// ── JSON output ─────────────────────────────────────────────────────────────

if (JSON_MODE) {
  const jsonArray = allResults.map((r) => ({
    name: r.name,
    ns_per_op: parseFloat(r.nsPerOp.toFixed(1)),
    ops_per_sec: Math.round(r.opsPerSec),
  }));
  console.log(JSON.stringify(jsonArray));
}
