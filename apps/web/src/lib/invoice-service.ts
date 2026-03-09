import { buildInvoiceXml } from "./fiscal/xml-builder";
import { loadCertificate, signXml } from "./fiscal/certificate";
import { getSefazUrl } from "./fiscal/sefaz-urls";
import {
  sefazRequest,
  buildStatusRequestXml,
  buildAuthorizationRequestXml,
  buildCancellationXml,
  buildVoidingXml,
  parseStatusResponse,
  parseAuthorizationResponse,
  parseCancellationResponse,
} from "./fiscal/sefaz-client";
import { PAYMENT_TYPES } from "./fiscal/constants";
import { SEFAZ_STATUS } from "./fiscal/sefaz-status-codes";
import { loadFiscalSettings, incrementNextNumber } from "./fiscal-settings-repository";
import {
  loadOrderWithItems,
  findInvoice,
  saveInvoice,
  findPendingInvoices,
  updateInvoiceStatus,
  saveVoidedInvoice,
  saveInvoiceEvent,
} from "./invoice-repository";
import type {
  InvoiceModel,
  InvoiceStatus,
  SefazEnvironment,
  EmissionType,
  InvoiceBuildData,
  InvoiceItemData,
  PaymentData,
  FiscalSettings,
  SefazResponse,
  ContingencyType,
} from "./fiscal/types";

/** Load fiscal settings and validate certificate is configured. */
async function loadValidatedSettings(userUid: string): Promise<FiscalSettings> {
  const settings = await loadFiscalSettings(userUid);
  if (!settings || !settings.certificatePfx || !settings.certificatePassword) {
    throw new Error("Fiscal settings or certificate not configured");
  }
  return settings;
}

/**
 * Issue an NFC-e (model 65) or NF-e (model 55) for a given order.
 *
 * Flow: load config → build XML → sign → send to SEFAZ → save result.
 * If SEFAZ is unavailable and model is NFC-e, falls back to offline contingency.
 */
export async function issueInvoice(
  orderId: number,
  model: InvoiceModel,
  userUid: string,
  recipientTaxId?: string,
  recipientName?: string
): Promise<{ invoiceId: number; status: InvoiceStatus; accessKey: string }> {
  // 1. Load fiscal settings
  const settings = await loadFiscalSettings(userUid);
  if (!settings) {
    throw new Error("Fiscal settings not configured");
  }

  if (!settings.certificatePfx || !settings.certificatePassword) {
    throw new Error("Digital certificate not configured");
  }

  if (model === 65 && (!settings.cscId || !settings.cscToken)) {
    throw new Error("CSC not configured for NFC-e");
  }

  // 2. Load order with items
  const order = await loadOrderWithItems(orderId, userUid);

  if (!order) throw new Error("Order not found");

  // 3. Get next number and series
  const series = model === 65 ? settings.nfceSeries : settings.nfeSeries;
  const number = model === 65 ? settings.nextNfceNumber : settings.nextNfeNumber;

  // 4. Build invoice data
  const buildData = buildInvoiceData(
    order,
    settings,
    model,
    series,
    number,
    1, // normal emission
    recipientTaxId,
    recipientName
  );

  // 5. Build and sign XML
  const { xml, accessKey } = buildInvoiceXml(buildData);
  const cert = loadCertificate(settings.certificatePfx, settings.certificatePassword);
  const signedXml = signXml(xml, cert.privateKey, cert.certificate);

  // 6. Try to send to SEFAZ
  let status: InvoiceStatus = "pending";
  let sefazResponse: SefazResponse | null = null;

  try {
    sefazResponse = await sendToSefaz(signedXml, settings, model);

    if (sefazResponse.statusCode === SEFAZ_STATUS.AUTHORIZED) {
      status = "authorized";
    } else if (sefazResponse.statusCode === SEFAZ_STATUS.DENIED) {
      status = "denied";
    } else {
      status = "rejected";
    }
  } catch (err) {
    // SEFAZ unavailable — try contingency for NFC-e
    if (model === 65) {
      status = "contingency";
    } else {
      throw err;
    }
  }

  // 7. Save invoice to database
  const invoiceId = await saveInvoice({
    userUid,
    orderId,
    model,
    series,
    number,
    accessKey,
    buildData,
    signedXml,
    sefazResponse,
    status,
    settings,
    isContingency: status === "contingency",
  });

  // 8. Increment next number
  await incrementNextNumber(userUid, model);

  return { invoiceId, status, accessKey };
}

/**
 * Check SEFAZ service status.
 */
export async function checkSefazStatus(userUid: string): Promise<{
  online: boolean;
  statusCode: number;
  statusMessage: string;
  averageTime?: number;
}> {
  const settings = await loadValidatedSettings(userUid);

  const url = getSefazUrl(
    settings.stateCode,
    "NfeStatusServico",
    settings.environment
  );

  const requestXml = buildStatusRequestXml(settings.stateCode, settings.environment);

  const response = await sefazRequest({
    url,
    service: "NfeStatusServico",
    xmlContent: requestXml,
    pfx: settings.certificatePfx,
    passphrase: settings.certificatePassword,
  });

  const parsed = parseStatusResponse(response.content);

  return {
    online: parsed.statusCode === SEFAZ_STATUS.SERVICE_RUNNING,
    ...parsed,
  };
}

/**
 * Cancel an authorized invoice.
 */
export async function cancelInvoice(
  invoiceId: number,
  reason: string,
  userUid: string
): Promise<{ success: boolean; statusCode: number; statusMessage: string }> {
  if (reason.length < 15) {
    throw new Error("Cancellation reason must have at least 15 characters");
  }

  const invoice = await findInvoice(invoiceId, userUid);

  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status !== "authorized") {
    throw new Error("Only authorized invoices can be cancelled");
  }
  if (!invoice.access_key || !invoice.protocol_number) {
    throw new Error("Invoice missing access key or protocol number");
  }

  const settings = await loadValidatedSettings(userUid);

  const cancellationXml = buildCancellationXml(
    invoice.access_key,
    invoice.protocol_number,
    reason,
    settings.taxId,
    settings.environment
  );

  // Sign the cancellation event
  const cert = loadCertificate(settings.certificatePfx, settings.certificatePassword);
  const signedXml = signXml(cancellationXml, cert.privateKey, cert.certificate);

  const url = getSefazUrl(
    settings.stateCode,
    "RecepcaoEvento",
    settings.environment
  );

  const response = await sefazRequest({
    url,
    service: "RecepcaoEvento",
    xmlContent: signedXml,
    pfx: settings.certificatePfx,
    passphrase: settings.certificatePassword,
  });

  const parsed = parseCancellationResponse(response.content);

  const success =
    parsed.statusCode === SEFAZ_STATUS.EVENT_REGISTERED ||
    parsed.statusCode === SEFAZ_STATUS.ALREADY_CANCELLED;

  if (success) {
    await updateInvoiceStatus(invoiceId, { status: "cancelled" });
  }

  // Save event
  await saveInvoiceEvent({
    invoiceId,
    eventType: "cancellation",
    protocolNumber: parsed.protocolNumber || null,
    statusCode: parsed.statusCode,
    reason,
    requestXml: signedXml,
    responseXml: response.body,
  });

  return { success, ...parsed };
}

/**
 * Void a range of invoice numbers (inutilizacao).
 */
export async function voidNumberRange(
  model: InvoiceModel,
  series: number,
  startNumber: number,
  endNumber: number,
  reason: string,
  userUid: string
): Promise<{ success: boolean; statusCode: number; statusMessage: string }> {
  if (reason.length < 15) {
    throw new Error("Voiding reason must have at least 15 characters");
  }

  const settings = await loadValidatedSettings(userUid);

  const year = new Date().getFullYear();
  const voidingXml = buildVoidingXml(
    settings.stateCode,
    settings.environment,
    settings.taxId,
    model,
    series,
    startNumber,
    endNumber,
    reason,
    year
  );

  const cert = loadCertificate(settings.certificatePfx, settings.certificatePassword);
  const signedXml = signXml(voidingXml, cert.privateKey, cert.certificate);

  const url = getSefazUrl(
    settings.stateCode,
    "NfeInutilizacao",
    settings.environment
  );

  const response = await sefazRequest({
    url,
    service: "NfeInutilizacao",
    xmlContent: signedXml,
    pfx: settings.certificatePfx,
    passphrase: settings.certificatePassword,
  });

  const { parseStatusResponse } = await import("./fiscal/sefaz-client");
  const voidResult = parseStatusResponse(response.content);
  const cStat = voidResult.statusCode;
  const xMotivo = voidResult.statusMessage;

  const success = cStat === SEFAZ_STATUS.VOIDED;

  // Save voided numbers as invoices with "voided" status
  if (success) {
    for (let n = startNumber; n <= endNumber; n++) {
      await saveVoidedInvoice({
        userUid,
        model,
        series,
        number: n,
        environment: settings.environment,
        statusCode: cStat,
        statusMessage: xMotivo,
      });
    }
  }

  return { success, statusCode: cStat, statusMessage: xMotivo };
}

/**
 * Synchronize pending contingency invoices.
 * Resends all invoices with status "contingency" to SEFAZ.
 */
export async function syncPendingInvoices(userUid: string): Promise<{
  total: number;
  authorized: number;
  failed: number;
}> {
  const settings = await loadValidatedSettings(userUid);

  const pending = await findPendingInvoices(userUid);

  let authorized = 0;
  let failed = 0;

  for (const invoice of pending) {
    if (!invoice.request_xml) continue;

    try {
      const response = await sendToSefaz(
        invoice.request_xml,
        settings,
        invoice.model as InvoiceModel
      );

      if (response.statusCode === SEFAZ_STATUS.AUTHORIZED) {
        await updateInvoiceStatus(invoice.id, {
          status: "authorized",
          responseXml: response.responseXml,
          protocolXml: response.protocolXml || null,
          protocolNumber: response.protocolNumber || null,
          statusCode: response.statusCode,
          statusMessage: response.statusMessage,
          authorizedAt: response.authorizedAt || new Date(),
        });
        authorized++;
      } else {
        await updateInvoiceStatus(invoice.id, {
          status: "rejected",
          responseXml: response.responseXml,
          statusCode: response.statusCode,
          statusMessage: response.statusMessage,
        });
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { total: pending.length, authorized, failed };
}

// ── Private helpers ─────────────────────────────────────────────────────────

function buildInvoiceData(
  order: any,
  settings: FiscalSettings,
  model: InvoiceModel,
  series: number,
  number: number,
  emissionType: EmissionType,
  recipientTaxId?: string,
  recipientName?: string
): InvoiceBuildData {
  const items: InvoiceItemData[] = order.orderItems.map(
    (oi: any, index: number) => {
      const product = oi.product;
      return {
        itemNumber: index + 1,
        productCode: String(product?.id || oi.product_id),
        description: product?.name || `Product ${oi.product_id}`,
        ncm: product?.ncm || settings.defaultNcm,
        cfop: product?.cfop || settings.defaultCfop,
        unitOfMeasure: product?.unit_of_measure || "UN",
        quantity: oi.quantity,
        unitPrice: oi.price,
        totalPrice: oi.price * oi.quantity,
        icmsCst: product?.icms_cst || settings.defaultIcmsCst,
        icmsRate: 0,
        icmsAmount: 0,
        pisCst: product?.pis_cst || settings.defaultPisCst,
        cofinsCst: product?.cofins_cst || settings.defaultCofinsCst,
      };
    }
  );

  const payments: PaymentData[] = [
    {
      method: PAYMENT_TYPES.other, // Default; could be derived from payment method
      amount: order.total_amount,
    },
  ];

  const isNfce = model === 65;

  return {
    model,
    series,
    number,
    emissionType,
    environment: settings.environment,
    issuedAt: new Date(),
    operationNature: "VENDA",
    // Domain decisions: NFC-e vs NF-e defaults
    operationType: 1, // outbound
    purposeCode: 1, // normal
    intermediaryIndicator: "0", // no intermediary
    emissionProcess: "0", // own application
    consumerType: isNfce ? "1" : "0", // NFC-e = final consumer
    buyerPresence: isNfce ? "1" : "0", // NFC-e = in-person
    printFormat: isNfce ? "4" : "1", // NFC-e = DANFCE, NF-e = portrait DANFE
    issuer: {
      taxId: settings.taxId,
      stateTaxId: settings.stateTaxId,
      companyName: settings.companyName,
      tradeName: settings.tradeName,
      taxRegime: settings.taxRegime,
      stateCode: settings.stateCode,
      cityCode: settings.cityCode,
      cityName: settings.cityName,
      street: settings.street,
      streetNumber: settings.streetNumber,
      district: settings.district,
      zipCode: settings.zipCode,
      addressComplement: settings.addressComplement,
    },
    recipient: recipientTaxId
      ? { taxId: recipientTaxId, name: recipientName || "" }
      : undefined,
    items,
    payments,
  };
}

async function sendToSefaz(
  signedXml: string,
  settings: FiscalSettings,
  model: InvoiceModel
): Promise<SefazResponse> {
  const url = getSefazUrl(
    settings.stateCode,
    "NfeAutorizacao",
    settings.environment,
    false,
    model
  );

  const requestXml = buildAuthorizationRequestXml(
    signedXml,
    settings.environment,
    settings.stateCode
  );

  const response = await sefazRequest({
    url,
    service: "NfeAutorizacao",
    xmlContent: requestXml,
    pfx: settings.certificatePfx!,
    passphrase: settings.certificatePassword!,
  });

  const parsed = parseAuthorizationResponse(response.content);

  return {
    success: parsed.statusCode === SEFAZ_STATUS.AUTHORIZED,
    statusCode: parsed.statusCode,
    statusMessage: parsed.statusMessage,
    protocolNumber: parsed.protocolNumber,
    protocolXml: parsed.protocolXml,
    responseXml: response.body,
    authorizedAt: parsed.authorizedAt ? new Date(parsed.authorizedAt) : undefined,
  };
}
