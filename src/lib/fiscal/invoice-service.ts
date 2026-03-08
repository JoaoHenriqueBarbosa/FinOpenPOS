import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  invoices,
  invoiceItems,
  fiscalSettings,
  orders,
  orderItems,
  products,
} from "@/lib/db/schema";
import { buildInvoiceXml } from "./xml-builder";
import { loadCertificate, signXml } from "./certificate";
import { getSefazUrl } from "./sefaz-urls";
import {
  sefazRequest,
  buildStatusRequestXml,
  buildAuthorizationRequestXml,
  buildCancellationXml,
  buildVoidingXml,
  parseStatusResponse,
  parseAuthorizationResponse,
  parseCancellationResponse,
} from "./sefaz-client";
import { PAYMENT_TYPES } from "./constants";
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
} from "./types";

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
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.user_uid, userUid)),
    with: { orderItems: { with: { product: true } } },
  });

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

    if (sefazResponse.statusCode === 100) {
      // 100 = authorized
      status = "authorized";
    } else if (sefazResponse.statusCode === 110) {
      // 110 = denied (use not allowed)
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
  const settings = await loadFiscalSettings(userUid);
  if (!settings || !settings.certificatePfx || !settings.certificatePassword) {
    throw new Error("Fiscal settings or certificate not configured");
  }

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
    online: parsed.statusCode === 107, // 107 = service running
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

  const invoice = await db.query.invoices.findFirst({
    where: and(eq(invoices.id, invoiceId), eq(invoices.user_uid, userUid)),
  });

  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status !== "authorized") {
    throw new Error("Only authorized invoices can be cancelled");
  }
  if (!invoice.access_key || !invoice.protocol_number) {
    throw new Error("Invoice missing access key or protocol number");
  }

  const settings = await loadFiscalSettings(userUid);
  if (!settings || !settings.certificatePfx || !settings.certificatePassword) {
    throw new Error("Fiscal settings not configured");
  }

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

  // 135 = event registered, 155 = already cancelled
  const success = parsed.statusCode === 135 || parsed.statusCode === 155;

  if (success) {
    await db
      .update(invoices)
      .set({ status: "cancelled" })
      .where(eq(invoices.id, invoiceId));
  }

  // Save event
  const { invoiceEvents } = await import("@/lib/db/schema");
  await db.insert(invoiceEvents).values({
    invoice_id: invoiceId,
    event_type: "cancellation",
    protocol_number: parsed.protocolNumber || null,
    status_code: parsed.statusCode,
    reason,
    request_xml: signedXml,
    response_xml: response.body,
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

  const settings = await loadFiscalSettings(userUid);
  if (!settings || !settings.certificatePfx || !settings.certificatePassword) {
    throw new Error("Fiscal settings not configured");
  }

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

  const { parseStatusResponse } = await import("./sefaz-client");
  const voidResult = parseStatusResponse(response.content);
  const cStat = voidResult.statusCode;
  const xMotivo = voidResult.statusMessage;

  // 102 = voided successfully
  const success = cStat === 102;

  // Save voided numbers as invoices with "voided" status
  if (success) {
    for (let n = startNumber; n <= endNumber; n++) {
      await db.insert(invoices).values({
        user_uid: userUid,
        model,
        series,
        number: n,
        status: "voided",
        environment: settings.environment,
        issued_at: new Date(),
        total_amount: 0,
        status_code: cStat,
        status_message: xMotivo,
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
  const settings = await loadFiscalSettings(userUid);
  if (!settings || !settings.certificatePfx || !settings.certificatePassword) {
    throw new Error("Fiscal settings not configured");
  }

  const pending = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.user_uid, userUid),
        eq(invoices.status, "contingency")
      )
    );

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

      if (response.statusCode === 100) {
        await db
          .update(invoices)
          .set({
            status: "authorized",
            response_xml: response.responseXml,
            protocol_xml: response.protocolXml || null,
            protocol_number: response.protocolNumber || null,
            status_code: response.statusCode,
            status_message: response.statusMessage,
            authorized_at: response.authorizedAt || new Date(),
          })
          .where(eq(invoices.id, invoice.id));
        authorized++;
      } else {
        await db
          .update(invoices)
          .set({
            status: "rejected",
            response_xml: response.responseXml,
            status_code: response.statusCode,
            status_message: response.statusMessage,
          })
          .where(eq(invoices.id, invoice.id));
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { total: pending.length, authorized, failed };
}

// ── Private helpers ─────────────────────────────────────────────────────────

async function loadFiscalSettings(
  userUid: string
): Promise<FiscalSettings | null> {
  const result = await db
    .select()
    .from(fiscalSettings)
    .where(eq(fiscalSettings.user_uid, userUid))
    .limit(1);

  if (result.length === 0) return null;

  const row = result[0];
  return {
    id: row.id,
    userUid: row.user_uid,
    companyName: row.company_name,
    tradeName: row.trade_name,
    taxId: row.tax_id,
    stateTaxId: row.state_tax_id,
    taxRegime: row.tax_regime as 1 | 2 | 3,
    stateCode: row.state_code,
    cityCode: row.city_code,
    cityName: row.city_name,
    street: row.street,
    streetNumber: row.street_number,
    district: row.district,
    zipCode: row.zip_code,
    addressComplement: row.address_complement,
    environment: row.environment as SefazEnvironment,
    nfeSeries: row.nfe_series ?? 1,
    nfceSeries: row.nfce_series ?? 1,
    nextNfeNumber: row.next_nfe_number ?? 1,
    nextNfceNumber: row.next_nfce_number ?? 1,
    cscId: row.csc_id,
    cscToken: row.csc_token,
    certificatePfx: row.certificate_pfx,
    certificatePassword: row.certificate_password,
    certificateValidUntil: row.certificate_valid_until,
    defaultNcm: row.default_ncm ?? "00000000",
    defaultCfop: row.default_cfop ?? "5102",
    defaultIcmsCst: row.default_icms_cst ?? "00",
    defaultPisCst: row.default_pis_cst ?? "99",
    defaultCofinsCst: row.default_cofins_cst ?? "99",
  };
}

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

  return {
    model,
    series,
    number,
    emissionType,
    environment: settings.environment,
    issuedAt: new Date(),
    operationNature: "VENDA",
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
    success: parsed.statusCode === 100,
    statusCode: parsed.statusCode,
    statusMessage: parsed.statusMessage,
    protocolNumber: parsed.protocolNumber,
    protocolXml: parsed.protocolXml,
    responseXml: response.body,
    authorizedAt: parsed.authorizedAt ? new Date(parsed.authorizedAt) : undefined,
  };
}

async function saveInvoice(data: {
  userUid: string;
  orderId: number;
  model: InvoiceModel;
  series: number;
  number: number;
  accessKey: string;
  buildData: InvoiceBuildData;
  signedXml: string;
  sefazResponse: SefazResponse | null;
  status: InvoiceStatus;
  settings: FiscalSettings;
  isContingency: boolean;
}): Promise<number> {
  const result = await db
    .insert(invoices)
    .values({
      user_uid: data.userUid,
      order_id: data.orderId,
      model: data.model,
      series: data.series,
      number: data.number,
      access_key: data.accessKey,
      operation_nature: data.buildData.operationNature,
      operation_type: 1,
      status: data.status,
      environment: data.settings.environment,
      request_xml: data.signedXml,
      response_xml: data.sefazResponse?.responseXml || null,
      protocol_xml: data.sefazResponse?.protocolXml || null,
      protocol_number: data.sefazResponse?.protocolNumber || null,
      status_code: data.sefazResponse?.statusCode || null,
      status_message: data.sefazResponse?.statusMessage || null,
      issued_at: data.buildData.issuedAt,
      authorized_at: data.sefazResponse?.authorizedAt || null,
      total_amount: data.buildData.items.reduce((sum, i) => sum + i.totalPrice, 0),
      is_contingency: data.isContingency,
      contingency_type: data.isContingency ? "offline" : null,
      contingency_at: data.isContingency ? new Date() : null,
      contingency_reason: data.isContingency ? "SEFAZ unavailable" : null,
      recipient_tax_id: data.buildData.recipient?.taxId || null,
      recipient_name: data.buildData.recipient?.name || null,
    })
    .returning({ id: invoices.id });

  const invoiceId = result[0].id;

  // Save items
  await db.insert(invoiceItems).values(
    data.buildData.items.map((item) => ({
      invoice_id: invoiceId,
      item_number: item.itemNumber,
      product_code: item.productCode,
      description: item.description,
      ncm: item.ncm,
      cfop: item.cfop,
      unit_of_measure: item.unitOfMeasure,
      quantity: Math.round(item.quantity * 1000),
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      icms_cst: item.icmsCst,
      icms_rate: item.icmsRate,
      icms_amount: item.icmsAmount,
      pis_cst: item.pisCst,
      cofins_cst: item.cofinsCst,
    }))
  );

  return invoiceId;
}

async function incrementNextNumber(
  userUid: string,
  model: InvoiceModel
): Promise<void> {
  const field =
    model === 65
      ? fiscalSettings.next_nfce_number
      : fiscalSettings.next_nfe_number;

  const current = await db
    .select({ val: field })
    .from(fiscalSettings)
    .where(eq(fiscalSettings.user_uid, userUid))
    .limit(1);

  if (current[0]) {
    const nextVal = (current[0].val ?? 1) + 1;
    await db
      .update(fiscalSettings)
      .set(
        model === 65
          ? { next_nfce_number: nextVal }
          : { next_nfe_number: nextVal }
      )
      .where(eq(fiscalSettings.user_uid, userUid));
  }
}
