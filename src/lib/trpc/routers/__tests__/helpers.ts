import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { getTableName } from "drizzle-orm";
import * as schema from "@/lib/db/schema";

// FK-safe order: referenced tables before referencing tables
const TABLES: PgTable[] = [
  schema.products,
  schema.customers,
  schema.paymentMethods,
  schema.orders,
  schema.orderItems,
  schema.transactions,
];

function tableToDDL(table: PgTable): string {
  const { name, columns, foreignKeys } = getTableConfig(table);

  const colDefs = columns.map((col) => {
    const sqlType = col.getSQLType();
    const isSerial = sqlType === "serial";
    const parts: string[] = [col.name, sqlType];

    if (col.primary) parts.push("PRIMARY KEY");
    if (col.notNull && !isSerial) parts.push("NOT NULL");
    if (col.isUnique) parts.push("UNIQUE");
    if (col.hasDefault && !isSerial && sqlType.startsWith("timestamp")) {
      parts.push("DEFAULT NOW()");
    }

    return parts.join(" ");
  });

  const fkDefs = foreignKeys.map((fk) => {
    const ref = fk.reference();
    const col = ref.columns[0].name;
    const refTable = getTableName(ref.foreignColumns[0].table);
    const refCol = ref.foreignColumns[0].name;
    return `FOREIGN KEY (${col}) REFERENCES ${refTable}(${refCol})`;
  });

  return `CREATE TABLE IF NOT EXISTS ${name} (\n  ${[...colDefs, ...fkDefs].join(",\n  ")}\n);`;
}

export const SCHEMA_DDL = TABLES.map(tableToDDL).join("\n\n");

export function createTestDb() {
  const pg = new PGlite();
  const db = drizzle({ client: pg, schema });
  return { pg, db };
}

export function makeUser(id: string) {
  return {
    id,
    name: "Test",
    email: `${id}@test.com`,
    emailVerified: false,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
