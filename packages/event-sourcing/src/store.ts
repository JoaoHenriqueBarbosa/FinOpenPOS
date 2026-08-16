import {
	type AppendInput,
	ConcurrencyError,
	type DomainEvent,
	type ReadOptions,
	type StoredEvent,
} from "./types";

/**
 * Interface mínima de execução SQL — satisfeita pelo PGlite
 * (e por qualquer driver com `query(sql, params)`).
 */
export interface Querier {
	query<T>(query: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

interface EventRow {
	global_seq: number;
	stream_type: string;
	stream_id: number;
	version: number;
	event_type: string;
	payload: string;
	user_uid: string;
	occurred_at: string | Date;
}

function rowToEvent(row: EventRow): StoredEvent {
	return {
		globalSeq: row.global_seq,
		streamType: row.stream_type,
		streamId: row.stream_id,
		version: row.version,
		type: row.event_type,
		data: JSON.parse(row.payload),
		userUid: row.user_uid,
		occurredAt:
			row.occurred_at instanceof Date
				? row.occurred_at
				: new Date(row.occurred_at),
	};
}

export const EVENTS_TABLE_DDL = `
CREATE TABLE IF NOT EXISTS events (
  global_seq serial PRIMARY KEY,
  stream_type varchar(32) NOT NULL,
  stream_id integer NOT NULL,
  version integer NOT NULL,
  event_type varchar(64) NOT NULL,
  payload text NOT NULL,
  user_uid varchar(255) NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stream_type, stream_id, version)
);
CREATE INDEX IF NOT EXISTS events_user_read_idx
  ON events (user_uid, stream_type, global_seq);
CREATE INDEX IF NOT EXISTS events_stream_idx
  ON events (stream_type, global_seq);
`;

/**
 * Event store append-only sobre Postgres/PGlite.
 *
 * Decisões de design (ver bench/store-bench.ts e docs/adr):
 *  - payload como `text` (JSON serializado): fold acontece sempre em JS,
 *    então jsonb só adicionaria custo de parse — text rende ~1.7x no replay.
 *  - append multi-row em um único INSERT: ~8x mais rápido que inserts unitários.
 *  - concorrência otimista via UNIQUE (stream_type, stream_id, version).
 */
export interface EventStoreOptions {
	/**
	 * Observer chamado após cada append bem-sucedido (ex.: dispatcher de
	 * addons). Erros do observer NÃO propagam para o comando — o fato já
	 * foi persistido; efeitos colaterais são responsabilidade do observer.
	 */
	onAppended?: (events: StoredEvent[]) => void | Promise<void>;
}

export class EventStore {
	constructor(
		private readonly sql: Querier,
		private readonly options: EventStoreOptions = {},
	) {}

	/** Cria a tabela/índices se não existirem (útil em testes e bootstrap). */
	async ensureSchema(): Promise<void> {
		for (const stmt of EVENTS_TABLE_DDL.split(";")) {
			if (stmt.trim()) await this.sql.query(stmt);
		}
	}

	/**
	 * Aloca o próximo id de stream para um tipo de agregado.
	 * PGlite é single-writer (comandos serializam na mesma conexão); numa
	 * corrida improvável, o UNIQUE do append rejeita e o comando é repetido.
	 */
	async nextStreamId(streamType: string): Promise<number> {
		const res = await this.sql.query<{ next: number }>(
			"SELECT COALESCE(MAX(stream_id), 0) + 1 AS next FROM events WHERE stream_type = $1",
			[streamType],
		);
		return Number(res.rows[0]?.next ?? 1);
	}

	/** Grava eventos de um comando atomicamente (um INSERT multi-row). */
	async append<TEvent extends DomainEvent>(
		input: AppendInput<TEvent>,
	): Promise<StoredEvent<TEvent>[]> {
		if (input.events.length === 0) return [];

		const values: string[] = [];
		const params: unknown[] = [];
		input.events.forEach((event, i) => {
			const base = params.length;
			const cols = [
				`$${base + 1}`,
				`$${base + 2}`,
				`$${base + 3}`,
				`$${base + 4}`,
				`$${base + 5}`,
				`$${base + 6}`,
			];
			if (input.occurredAt) cols.push(`$${base + 7}`);
			values.push(`(${cols.join(", ")})`);
			params.push(
				input.streamType,
				input.streamId,
				input.expectedVersion + i + 1,
				event.type,
				JSON.stringify(event.data),
				input.userUid,
			);
			if (input.occurredAt) params.push(input.occurredAt.toISOString());
		});

		const columns = input.occurredAt
			? "(stream_type, stream_id, version, event_type, payload, user_uid, occurred_at)"
			: "(stream_type, stream_id, version, event_type, payload, user_uid)";

		try {
			const res = await this.sql.query<EventRow>(
				`INSERT INTO events ${columns} VALUES ${values.join(", ")} RETURNING *`,
				params,
			);
			const stored = res.rows.map(rowToEvent) as StoredEvent<TEvent>[];
			if (this.options.onAppended) {
				try {
					await this.options.onAppended(stored);
				} catch {
					// o fato já foi persistido; falha do observer não desfaz o comando
				}
			}
			return stored;
		} catch (err) {
			if (isUniqueViolation(err)) {
				throw new ConcurrencyError(
					input.streamType,
					input.streamId,
					input.expectedVersion,
				);
			}
			throw err;
		}
	}

	/** Lê um stream específico, em ordem de versão. */
	async readStream<TEvent extends DomainEvent>(
		streamType: string,
		streamId: number,
	): Promise<StoredEvent<TEvent>[]> {
		const res = await this.sql.query<EventRow>(
			"SELECT * FROM events WHERE stream_type = $1 AND stream_id = $2 ORDER BY version",
			[streamType, streamId],
		);
		return res.rows.map(rowToEvent) as StoredEvent<TEvent>[];
	}

	/**
	 * Lê todos os eventos de um ou mais tipos de stream em ordem global —
	 * insumo para reconstruir read models do zero a cada leitura.
	 */
	async readAll<TEvent extends DomainEvent>(
		streamTypes: string[],
		opts: ReadOptions = {},
	): Promise<StoredEvent<TEvent>[]> {
		const conds: string[] = [];
		const params: unknown[] = [];

		params.push(streamTypes);
		conds.push(`stream_type = ANY($${params.length})`);

		if (opts.userUid !== undefined) {
			params.push(opts.userUid);
			conds.push(`user_uid = $${params.length}`);
		}
		if (opts.toGlobalSeq !== undefined) {
			params.push(opts.toGlobalSeq);
			conds.push(`global_seq <= $${params.length}`);
		}

		const res = await this.sql.query<EventRow>(
			`SELECT * FROM events WHERE ${conds.join(" AND ")} ORDER BY global_seq`,
			params,
		);
		return res.rows.map(rowToEvent) as StoredEvent<TEvent>[];
	}
}

function isUniqueViolation(err: unknown): boolean {
	if (typeof err !== "object" || err === null) return false;
	const e = err as { code?: string; message?: string };
	return e.code === "23505" || /unique|duplicate key/i.test(e.message ?? "");
}
