import {
	index,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	unique,
	varchar,
} from "drizzle-orm/pg-core";

// Re-export Better Auth tables so drizzle-kit picks them up
export {
	account,
	accountRelations,
	session,
	sessionRelations,
	user,
	userRelations,
	verification,
} from "./auth-schema";

// ── Event Store ─────────────────────────────────────────────────────────────
// Única fonte de verdade dos domínios operacionais (products, customers,
// orders, transactions, payment methods). Todo estado é reconstruído por
// replay dos eventos — não existem snapshots nem tabelas de estado.
//
// Tabelas de addons (ex.: fiscal) são contribuídas pelos próprios addons
// e compostas pelo host — ver apps/web/src/lib/addons.
//
// Decisões de design (ver packages/event-sourcing/bench e docs/adr):
//  - payload como text (JSON): fold sempre em JS → ~1.7x mais rápido que jsonb
//  - UNIQUE (stream_type, stream_id, version): concorrência otimista
//  - global_seq serial: ordem total do log (base de qualquer replay)
export const events = pgTable(
	"events",
	{
		global_seq: serial("global_seq").primaryKey(),
		stream_type: varchar("stream_type", { length: 32 }).notNull(),
		stream_id: integer("stream_id").notNull(),
		version: integer("version").notNull(),
		event_type: varchar("event_type", { length: 64 }).notNull(),
		payload: text("payload").notNull(),
		user_uid: varchar("user_uid", { length: 255 }).notNull(),
		occurred_at: timestamp("occurred_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		unique("events_stream_version_uq").on(
			t.stream_type,
			t.stream_id,
			t.version,
		),
		index("events_user_read_idx").on(t.user_uid, t.stream_type, t.global_seq),
		index("events_stream_idx").on(t.stream_type, t.global_seq),
	],
);
