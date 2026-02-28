import { db } from ".";
import {
  paymentMethods,
  customers,
  products,
  orders,
  orderItems,
  transactions,
} from "./schema";
import { sql } from "drizzle-orm";
import { faker } from "@faker-js/faker";
import { auth } from "../auth";

const DEMO_EMAIL = "test@example.com";
const DEMO_PASSWORD = "test1234";
const DEMO_NAME = "Test User";

const PRODUCT_CATEGORIES = ["electronics", "clothing", "books", "home"] as const;

const EXPENSE_CATEGORIES = [
  "rent",
  "utilities",
  "supplies",
  "marketing",
  "maintenance",
] as const;

export async function seed() {
  const existing = await db
    .select({ count: sql<number>`count(*)` })
    .from(paymentMethods);

  if (existing[0].count > 0) return;

  // ── Payment Methods ──────────────────────────────────────────────────────
  const [pmCredit, pmDebit, pmCash] = await db
    .insert(paymentMethods)
    .values([
      { name: "Credit Card" },
      { name: "Debit Card" },
      { name: "Cash" },
    ])
    .returning();

  const paymentMethodIds = [pmCredit.id, pmDebit.id, pmCash.id];

  // ── Demo User ────────────────────────────────────────────────────────────
  const signUpRes = await auth.api.signUpEmail({
    body: { name: DEMO_NAME, email: DEMO_EMAIL, password: DEMO_PASSWORD },
  });
  const userId = signUpRes.user.id;

  // ── Customers ────────────────────────────────────────────────────────────
  const customerValues = Array.from({ length: 20 }, () => ({
    name: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    phone: faker.phone.number({ style: "national" }),
    user_uid: userId,
    status: faker.helpers.arrayElement(["active", "active", "active", "inactive"]),
    created_at: faker.date.recent({ days: 90 }),
  }));

  const insertedCustomers = await db
    .insert(customers)
    .values(customerValues)
    .returning();

  // ── Products ─────────────────────────────────────────────────────────────
  const productNames: Record<string, string[]> = {
    electronics: [
      "Wireless Mouse", "Mechanical Keyboard", "USB-C Hub", "Webcam HD",
      "Bluetooth Speaker", "LED Monitor 24\"", "Phone Charger", "HDMI Cable",
    ],
    clothing: [
      "Cotton T-Shirt", "Denim Jacket", "Running Shoes", "Baseball Cap",
      "Wool Scarf", "Leather Belt", "Polo Shirt", "Cargo Pants",
    ],
    books: [
      "Clean Code", "Design Patterns", "The Pragmatic Programmer",
      "Refactoring", "Domain-Driven Design", "System Design Interview",
      "JavaScript: The Good Parts", "Learning SQL",
    ],
    home: [
      "Ceramic Mug", "Desk Lamp", "Wall Clock", "Throw Pillow",
      "Kitchen Scale", "Glass Vase", "Bath Towel Set", "Scented Candle",
    ],
  };

  const productValues = Object.entries(productNames).flatMap(
    ([category, names]) =>
      names.map((name) => ({
        name,
        description: faker.commerce.productDescription(),
        price: faker.number.int({ min: 499, max: 29999 }),
        in_stock: faker.number.int({ min: 0, max: 200 }),
        user_uid: userId,
        category,
      }))
  );

  const insertedProducts = await db
    .insert(products)
    .values(productValues)
    .returning();

  // ── Orders + Order Items + Selling Transactions ──────────────────────────
  const orderCount = 40;
  for (let i = 0; i < orderCount; i++) {
    const customer = faker.helpers.arrayElement(insertedCustomers);
    const pmId = faker.helpers.arrayElement(paymentMethodIds);
    const itemCount = faker.number.int({ min: 1, max: 5 });
    const chosenProducts = faker.helpers.arrayElements(
      insertedProducts,
      itemCount
    );

    const items = chosenProducts.map((p) => ({
      product_id: p.id,
      quantity: faker.number.int({ min: 1, max: 4 }),
      price: p.price,
    }));

    const totalAmount = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const createdAt = faker.date.recent({ days: 60 });

    const [order] = await db
      .insert(orders)
      .values({
        customer_id: customer.id,
        total_amount: totalAmount,
        user_uid: userId,
        status: faker.helpers.weightedArrayElement([
          { value: "completed", weight: 8 },
          { value: "pending", weight: 1.5 },
          { value: "cancelled", weight: 0.5 },
        ]),
        created_at: createdAt,
      })
      .returning();

    await db.insert(orderItems).values(
      items.map((item) => ({
        order_id: order.id,
        ...item,
      }))
    );

    // Income transaction for completed orders
    if (order.status === "completed") {
      await db.insert(transactions).values({
        description: `Payment for order #${order.id}`,
        order_id: order.id,
        payment_method_id: pmId,
        amount: totalAmount,
        user_uid: userId,
        type: "income",
        category: "selling",
        status: "completed",
        created_at: createdAt,
      });
    }
  }

  // ── Expense Transactions ─────────────────────────────────────────────────
  const expenseCount = 25;
  for (let i = 0; i < expenseCount; i++) {
    const category = faker.helpers.arrayElement(EXPENSE_CATEGORIES);
    const descriptions: Record<string, () => string> = {
      rent: () => `Monthly rent — ${faker.date.month()}`,
      utilities: () =>
        `${faker.helpers.arrayElement(["Electricity", "Water", "Internet"])} bill`,
      supplies: () =>
        `${faker.helpers.arrayElement(["Office supplies", "Packaging materials", "Cleaning products"])}`,
      marketing: () =>
        `${faker.helpers.arrayElement(["Google Ads", "Facebook campaign", "Flyers printing", "Influencer collab"])}`,
      maintenance: () =>
        `${faker.helpers.arrayElement(["AC repair", "Store painting", "Equipment servicing", "Plumbing fix"])}`,
    };

    await db.insert(transactions).values({
      description: descriptions[category](),
      payment_method_id: faker.helpers.arrayElement(paymentMethodIds),
      amount: faker.number.int({ min: 2000, max: 150000 }),
      user_uid: userId,
      type: "expense",
      category,
      status: faker.helpers.weightedArrayElement([
        { value: "completed", weight: 9 },
        { value: "pending", weight: 1 },
      ]),
      created_at: faker.date.recent({ days: 60 }),
    });
  }

  console.log(
    `Seeded: 3 payment methods, 1 demo user (${DEMO_EMAIL} / ${DEMO_PASSWORD}), ` +
      `${customerValues.length} customers, ${productValues.length} products, ` +
      `${orderCount} orders, ${expenseCount} expense transactions`
  );
}
