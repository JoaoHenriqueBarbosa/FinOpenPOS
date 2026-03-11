import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  customType,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Re-export Better Auth tables so drizzle-kit picks them up
export {
  user,
  session,
  account,
  verification,
  userRelations,
  sessionRelations,
  accountRelations,
} from "./auth-schema";

// Custom bytea type for PGLite compatibility
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

// ── Products ────────────────────────────────────────────────────────────────
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  in_stock: integer("in_stock").notNull(),
  user_uid: varchar("user_uid", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }),
  // Fiscal fields (optional, fallback to fiscal_settings defaults)
  ncm: varchar("ncm", { length: 8 }),
  cfop: varchar("cfop", { length: 4 }),
  icms_cst: varchar("icms_cst", { length: 3 }),
  pis_cst: varchar("pis_cst", { length: 2 }),
  cofins_cst: varchar("cofins_cst", { length: 2 }),
  unit_of_measure: varchar("unit_of_measure", { length: 6 }).default("UN"),
  barcode: varchar("barcode", { length: 50 }),
  created_at: timestamp("created_at").defaultNow(),
});

// ── Customers ───────────────────────────────────────────────────────────────
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  user_uid: varchar("user_uid", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }),
  created_at: timestamp("created_at").defaultNow(),
});

// ── Orders ──────────────────────────────────────────────────────────────────
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customer_id: integer("customer_id").references(() => customers.id),
  total_amount: integer("total_amount").notNull(),
  user_uid: varchar("user_uid", { length: 255 }).notNull(),
  status: varchar("status", { length: 20 }),
  created_at: timestamp("created_at").defaultNow(),
});

// ── Order Items ─────────────────────────────────────────────────────────────
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  order_id: integer("order_id").references(() => orders.id),
  product_id: integer("product_id").references(() => products.id),
  quantity: integer("quantity").notNull(),
  price: integer("price").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

// ── Payment Methods ─────────────────────────────────────────────────────────
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  created_at: timestamp("created_at").defaultNow(),
});

// ── Transactions ────────────────────────────────────────────────────────────
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  description: text("description"),
  order_id: integer("order_id").references(() => orders.id),
  payment_method_id: integer("payment_method_id").references(() => paymentMethods.id),
  amount: integer("amount").notNull(),
  user_uid: varchar("user_uid", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }),
  category: varchar("category", { length: 100 }),
  status: varchar("status", { length: 20 }),
  created_at: timestamp("created_at").defaultNow(),
});

// ── Cities (IBGE) ──────────────────────────────────────────────────────────
export const cities = pgTable("cities", {
  id: integer("id").primaryKey(), // IBGE code (7 digits)
  name: varchar("name", { length: 120 }).notNull(),
  state_code: varchar("state_code", { length: 2 }).notNull(),
});

// ── Fiscal Settings ────────────────────────────────────────────────────────
export const fiscalSettings = pgTable("fiscal_settings", {
  id: serial("id").primaryKey(),
  user_uid: varchar("user_uid", { length: 255 }).notNull().unique(),
  // Company identity
  company_name: varchar("company_name", { length: 255 }).notNull(),
  trade_name: varchar("trade_name", { length: 255 }),
  tax_id: varchar("tax_id", { length: 14 }).notNull(), // CNPJ
  state_tax_id: varchar("state_tax_id", { length: 20 }).notNull(), // IE
  tax_regime: integer("tax_regime").notNull(), // CRT: 1=Simples, 2=Simples excess, 3=Normal
  // Address
  state_code: varchar("state_code", { length: 2 }).notNull(), // UF
  city_code: varchar("city_code", { length: 7 }).notNull(), // IBGE code
  city_name: varchar("city_name", { length: 100 }).notNull(),
  street: varchar("street", { length: 255 }).notNull(),
  street_number: varchar("street_number", { length: 10 }).notNull(),
  district: varchar("district", { length: 100 }).notNull(),
  zip_code: varchar("zip_code", { length: 8 }).notNull(),
  address_complement: varchar("address_complement", { length: 100 }),
  // Environment & numbering
  environment: integer("environment").notNull().default(2), // 1=production, 2=homologation
  nfe_series: integer("nfe_series").default(1),
  nfce_series: integer("nfce_series").default(1),
  next_nfe_number: integer("next_nfe_number").default(1),
  next_nfce_number: integer("next_nfce_number").default(1),
  // NFC-e security code
  csc_id: varchar("csc_id", { length: 10 }),
  csc_token: varchar("csc_token", { length: 50 }),
  // Certificate
  certificate_pfx: bytea("certificate_pfx"),
  certificate_password: text("certificate_password"),
  certificate_valid_until: timestamp("certificate_valid_until"),
  // Default fiscal fields (fallback when product doesn't have them)
  default_ncm: varchar("default_ncm", { length: 8 }).default("00000000"),
  default_cfop: varchar("default_cfop", { length: 4 }).default("5102"),
  default_icms_cst: varchar("default_icms_cst", { length: 3 }).default("00"),
  default_pis_cst: varchar("default_pis_cst", { length: 2 }).default("99"),
  default_cofins_cst: varchar("default_cofins_cst", { length: 2 }).default("99"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// ── Invoices (NF-e / NFC-e) ────────────────────────────────────────────────
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  user_uid: varchar("user_uid", { length: 255 }).notNull(),
  order_id: integer("order_id").references(() => orders.id),
  model: integer("model").notNull(), // 55=NF-e, 65=NFC-e
  series: integer("series").notNull(),
  number: integer("number").notNull(),
  access_key: varchar("access_key", { length: 44 }),
  operation_nature: varchar("operation_nature", { length: 60 }).default("VENDA"),
  operation_type: integer("operation_type").default(1), // 0=inbound, 1=outbound
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  // pending | authorized | rejected | cancelled | denied | contingency | voided
  environment: integer("environment").notNull(), // 1=production, 2=homologation
  // XML payloads
  request_xml: text("request_xml"),
  response_xml: text("response_xml"),
  protocol_xml: text("protocol_xml"), // procNFe = NFe + protNFe
  // SEFAZ response
  protocol_number: varchar("protocol_number", { length: 20 }),
  status_code: integer("status_code"), // cStat
  status_message: text("status_message"), // xMotivo
  // Dates
  issued_at: timestamp("issued_at").notNull(),
  authorized_at: timestamp("authorized_at"),
  // Totals
  total_amount: integer("total_amount").notNull(), // cents
  // Contingency
  is_contingency: boolean("is_contingency").default(false),
  contingency_type: varchar("contingency_type", { length: 20 }),
  contingency_at: timestamp("contingency_at"),
  contingency_reason: text("contingency_reason"),
  // Recipient
  recipient_tax_id: varchar("recipient_tax_id", { length: 14 }),
  recipient_name: varchar("recipient_name", { length: 255 }),
  created_at: timestamp("created_at").defaultNow(),
});

// ── Invoice Items ──────────────────────────────────────────────────────────
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoice_id: integer("invoice_id").references(() => invoices.id).notNull(),
  product_id: integer("product_id").references(() => products.id),
  item_number: integer("item_number").notNull(),
  product_code: varchar("product_code", { length: 60 }).notNull(),
  description: varchar("description", { length: 120 }).notNull(),
  ncm: varchar("ncm", { length: 8 }).notNull(),
  cfop: varchar("cfop", { length: 4 }).notNull(),
  unit_of_measure: varchar("unit_of_measure", { length: 6 }).default("UN"),
  quantity: integer("quantity").notNull(), // x1000 (3 decimal places)
  unit_price: integer("unit_price").notNull(), // cents
  total_price: integer("total_price").notNull(), // cents
  icms_cst: varchar("icms_cst", { length: 3 }),
  icms_rate: integer("icms_rate").default(0), // x100
  icms_amount: integer("icms_amount").default(0),
  pis_cst: varchar("pis_cst", { length: 2 }),
  cofins_cst: varchar("cofins_cst", { length: 2 }),
  created_at: timestamp("created_at").defaultNow(),
});

// ── Invoice Events (cancellation, voiding, etc.) ───────────────────────────
export const invoiceEvents = pgTable("invoice_events", {
  id: serial("id").primaryKey(),
  invoice_id: integer("invoice_id").references(() => invoices.id).notNull(),
  event_type: varchar("event_type", { length: 30 }).notNull(),
  sequence: integer("sequence").default(1),
  protocol_number: varchar("protocol_number", { length: 20 }),
  status_code: integer("status_code"),
  reason: text("reason"),
  request_xml: text("request_xml"),
  response_xml: text("response_xml"),
  created_at: timestamp("created_at").defaultNow(),
});

// ── Relations ───────────────────────────────────────────────────────────────
export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customer_id],
    references: [customers.id],
  }),
  orderItems: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.order_id],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.product_id],
    references: [products.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  order: one(orders, {
    fields: [transactions.order_id],
    references: [orders.id],
  }),
  paymentMethod: one(paymentMethods, {
    fields: [transactions.payment_method_id],
    references: [paymentMethods.id],
  }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
}));

export const productsRelations = relations(products, ({ many }) => ({
  orderItems: many(orderItems),
}));

export const paymentMethodsRelations = relations(paymentMethods, ({ many }) => ({
  transactions: many(transactions),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  order: one(orders, {
    fields: [invoices.order_id],
    references: [orders.id],
  }),
  items: many(invoiceItems),
  events: many(invoiceEvents),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoice_id],
    references: [invoices.id],
  }),
  product: one(products, {
    fields: [invoiceItems.product_id],
    references: [products.id],
  }),
}));

export const invoiceEventsRelations = relations(invoiceEvents, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceEvents.invoice_id],
    references: [invoices.id],
  }),
}));
