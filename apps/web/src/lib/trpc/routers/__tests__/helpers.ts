import { PGlite } from "@electric-sql/pglite";
import { EVENTS_TABLE_DDL } from "@finopenpos/event-sourcing";
import { getTableName } from "drizzle-orm";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/pglite";
import { installedAddons } from "@/lib/addons/installed";
import * as schema from "@/lib/db/schema";

// Domínios operacionais (products/customers/orders/transactions/payment
// methods) vivem no event store — tabela `events`, criada via EVENTS_TABLE_DDL.
// Tabelas restantes são contribuídas pelos addons instalados (ordem FK-safe
// garantida por cada addon em `tables`).
const TABLES: PgTable[] = installedAddons.flatMap(
	(addon) => (addon.tables ?? []) as PgTable[],
);

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

export const SCHEMA_DDL = [EVENTS_TABLE_DDL, ...TABLES.map(tableToDDL)].join(
	"\n\n",
);

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
