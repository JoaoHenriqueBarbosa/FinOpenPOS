/**
 * Benchmark: decide o design do event store sobre PGlite.
 *
 * Eixos medidos:
 *  1. Append: SQL cru (pglite.query) vs batch multi-row; payload jsonb vs text
 *  2. Replay (fold): ler N eventos ordenados e reconstruir estado — o caminho
 *     quente do sistema, já que TODA leitura reconstrói dos eventos (sem snapshot)
 *
 * Uso: bun bench/store-bench.ts [--json out.json]
 */
import { PGlite } from "@electric-sql/pglite";

const REPLAY_SIZES = [1_000, 10_000, 50_000];
const APPEND_N = 2_000;
const BATCH_SIZES = [1, 10, 100];

type Result = {
	name: string;
	ops: number;
	totalMs: number;
	opsPerSec: number;
};

const results: Result[] = [];

function record(name: string, ops: number, totalMs: number) {
	const r = {
		name,
		ops,
		totalMs: +totalMs.toFixed(1),
		opsPerSec: Math.round(ops / (totalMs / 1000)),
	};
	results.push(r);
	console.log(
		`${r.name.padEnd(52)} ${String(r.ops).padStart(7)} ops  ${String(r.totalMs).padStart(9)} ms  ${String(r.opsPerSec).padStart(9)} ops/s`,
	);
}

function samplePayload(i: number) {
	return {
		name: `Product ${i}`,
		description: "A fairly typical event payload with some fields",
		price: 1990 + (i % 500),
		in_stock: i % 100,
		category: i % 2 ? "drinks" : "food",
		ncm: "22021000",
		cfop: "5102",
	};
}

async function makeDb(payloadType: "jsonb" | "text") {
	const pg = new PGlite();
	await pg.exec(`
    CREATE TABLE events (
      global_seq serial PRIMARY KEY,
      stream_type varchar(32) NOT NULL,
      stream_id integer NOT NULL,
      version integer NOT NULL,
      event_type varchar(64) NOT NULL,
      payload ${payloadType} NOT NULL,
      user_uid varchar(255) NOT NULL,
      occurred_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (stream_type, stream_id, version)
    );
    CREATE INDEX events_user_read_idx ON events (user_uid, stream_type, global_seq);
  `);
	return pg;
}

async function benchAppend(payloadType: "jsonb" | "text") {
	for (const batch of BATCH_SIZES) {
		const pg = await makeDb(payloadType);
		const t0 = performance.now();
		for (let i = 0; i < APPEND_N; i += batch) {
			const rows: string[] = [];
			const params: unknown[] = [];
			for (let j = 0; j < batch && i + j < APPEND_N; j++) {
				const k = i + j;
				const base = params.length;
				rows.push(
					`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`,
				);
				params.push(
					"product",
					k,
					1,
					"ProductCreated",
					JSON.stringify(samplePayload(k)),
					"user-1",
				);
			}
			await pg.query(
				`INSERT INTO events (stream_type, stream_id, version, event_type, payload, user_uid) VALUES ${rows.join(",")}`,
				params,
			);
		}
		record(
			`append ${payloadType} batch=${batch}`,
			APPEND_N,
			performance.now() - t0,
		);
		await pg.close();
	}
}

async function benchReplay(payloadType: "jsonb" | "text") {
	const max = Math.max(...REPLAY_SIZES);
	const pg = await makeDb(payloadType);

	// seed com eventos distribuídos em 500 streams (create + updates)
	const SEED_BATCH = 500;
	const versions = new Map<number, number>();
	for (let i = 0; i < max; i += SEED_BATCH) {
		const rows: string[] = [];
		const params: unknown[] = [];
		for (let j = 0; j < SEED_BATCH && i + j < max; j++) {
			const k = i + j;
			const streamId = k % 500;
			const v = (versions.get(streamId) ?? 0) + 1;
			versions.set(streamId, v);
			const base = params.length;
			rows.push(
				`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`,
			);
			params.push(
				"product",
				streamId,
				v,
				v === 1 ? "ProductCreated" : "ProductUpdated",
				JSON.stringify(samplePayload(k)),
				"user-1",
			);
		}
		await pg.query(
			`INSERT INTO events (stream_type, stream_id, version, event_type, payload, user_uid) VALUES ${rows.join(",")}`,
			params,
		);
	}

	for (const n of REPLAY_SIZES) {
		// warmup + 3 runs, pega a média
		const runs = 3;
		let total = 0;
		for (let r = 0; r <= runs; r++) {
			const t0 = performance.now();
			const res = await pg.query<{
				stream_id: number;
				event_type: string;
				payload: unknown;
			}>(
				`SELECT stream_id, event_type, payload FROM events
         WHERE user_uid = $1 AND stream_type = $2 AND global_seq <= $3
         ORDER BY global_seq`,
				["user-1", "product", n],
			);
			// fold: reconstrói o read model
			const state = new Map<number, Record<string, unknown>>();
			for (const row of res.rows) {
				const data =
					typeof row.payload === "string"
						? JSON.parse(row.payload)
						: (row.payload as Record<string, unknown>);
				const cur = state.get(row.stream_id);
				state.set(row.stream_id, cur ? { ...cur, ...data } : data);
			}
			if (state.size === 0) throw new Error("fold produced no state");
			if (r > 0) total += performance.now() - t0;
		}
		record(`replay+fold ${payloadType} n=${n}`, n, total / runs);
	}
	await pg.close();
}

console.log(
	`PGlite event store bench — append N=${APPEND_N}, replay sizes=${REPLAY_SIZES.join("/")}\n`,
);
for (const t of ["jsonb", "text"] as const) {
	await benchAppend(t);
}
for (const t of ["jsonb", "text"] as const) {
	await benchReplay(t);
}

const jsonFlag = process.argv.indexOf("--json");
const jsonPath = jsonFlag !== -1 ? process.argv[jsonFlag + 1] : undefined;
if (jsonPath) {
	await Bun.write(jsonPath, JSON.stringify(results, null, 2));
	console.log(`\nresultados salvos em ${jsonPath}`);
}
