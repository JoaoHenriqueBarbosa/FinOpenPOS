import {
  pgTable,
  serial,
  varchar,
  text,
  decimal,
  integer,
  timestamp,
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

// ── Products ────────────────────────────────────────────────────────────────
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull().$type<number>(),
  in_stock: integer("in_stock").notNull(),
  user_uid: varchar("user_uid", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }),
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
  total_amount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().$type<number>(),
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
  price: decimal("price", { precision: 10, scale: 2 }).notNull().$type<number>(),
});

// ── Payment Methods ─────────────────────────────────────────────────────────
export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
});

// ── Transactions ────────────────────────────────────────────────────────────
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  description: text("description"),
  order_id: integer("order_id").references(() => orders.id),
  payment_method_id: integer("payment_method_id").references(() => paymentMethods.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull().$type<number>(),
  user_uid: varchar("user_uid", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }),
  category: varchar("category", { length: 100 }),
  status: varchar("status", { length: 20 }),
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
