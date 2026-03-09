import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  invoices,
  invoiceItems,
  invoiceEvents,
  orders,
} from "@/lib/db/schema";
import type {
  InvoiceModel,
  InvoiceStatus,
  InvoiceBuildData,
  FiscalSettings,
  SefazResponse,
  SefazEnvironment,
} from "@finopenpos/fiscal";

// ── Types for repository inputs ─────────────────────────────────────────────

export interface SaveInvoiceData {
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
}

export interface SaveVoidedInvoiceData {
  userUid: string;
  model: InvoiceModel;
  series: number;
  number: number;
  environment: SefazEnvironment;
  statusCode: number;
  statusMessage: string;
}

export interface SaveInvoiceEventData {
  invoiceId: number;
  eventType: string;
  protocolNumber?: string | null;
  statusCode: number;
  reason: string;
  requestXml: string;
  responseXml: string;
}

export interface UpdateInvoiceStatusData {
  status: InvoiceStatus;
  responseXml?: string;
  protocolXml?: string | null;
  protocolNumber?: string | null;
  statusCode?: number;
  statusMessage?: string;
  authorizedAt?: Date | null;
}

// ── Repository functions ────────────────────────────────────────────────────

/**
 * Load an order with its items and products for invoice building.
 */
export async function loadOrderWithItems(orderId: number, userUid: string) {
  return db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.user_uid, userUid)),
    with: { orderItems: { with: { product: true } } },
  });
}

/**
 * Find an invoice by id and user.
 */
export async function findInvoice(invoiceId: number, userUid: string) {
  return db.query.invoices.findFirst({
    where: and(eq(invoices.id, invoiceId), eq(invoices.user_uid, userUid)),
  });
}

/**
 * Save an invoice and its items, returning the invoice id.
 */
export async function saveInvoice(data: SaveInvoiceData): Promise<number> {
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
      total_amount: data.buildData.items.reduce(
        (sum, i) => sum + i.totalPrice,
        0
      ),
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

/**
 * Find all invoices with "contingency" status for a given user.
 */
export async function findPendingInvoices(userUid: string) {
  return db
    .select()
    .from(invoices)
    .where(
      and(eq(invoices.user_uid, userUid), eq(invoices.status, "contingency"))
    );
}

/**
 * Update an invoice's status and optional extra fields.
 */
export async function updateInvoiceStatus(
  invoiceId: number,
  data: UpdateInvoiceStatusData
): Promise<void> {
  const updateFields: Record<string, unknown> = { status: data.status };
  if (data.responseXml !== undefined) updateFields.response_xml = data.responseXml;
  if (data.protocolXml !== undefined) updateFields.protocol_xml = data.protocolXml;
  if (data.protocolNumber !== undefined) updateFields.protocol_number = data.protocolNumber;
  if (data.statusCode !== undefined) updateFields.status_code = data.statusCode;
  if (data.statusMessage !== undefined) updateFields.status_message = data.statusMessage;
  if (data.authorizedAt !== undefined) updateFields.authorized_at = data.authorizedAt;

  await db
    .update(invoices)
    .set(updateFields)
    .where(eq(invoices.id, invoiceId));
}

/**
 * Save a voided invoice record.
 */
export async function saveVoidedInvoice(
  data: SaveVoidedInvoiceData
): Promise<void> {
  await db.insert(invoices).values({
    user_uid: data.userUid,
    model: data.model,
    series: data.series,
    number: data.number,
    status: "voided",
    environment: data.environment,
    issued_at: new Date(),
    total_amount: 0,
    status_code: data.statusCode,
    status_message: data.statusMessage,
  });
}

/**
 * Save an invoice event (cancellation, etc.).
 */
export async function saveInvoiceEvent(
  data: SaveInvoiceEventData
): Promise<void> {
  await db.insert(invoiceEvents).values({
    invoice_id: data.invoiceId,
    event_type: data.eventType,
    protocol_number: data.protocolNumber || null,
    status_code: data.statusCode,
    reason: data.reason,
    request_xml: data.requestXml,
    response_xml: data.responseXml,
  });
}
