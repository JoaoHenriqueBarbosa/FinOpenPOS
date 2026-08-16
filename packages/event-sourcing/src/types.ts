/**
 * Tipos centrais do event sourcing.
 *
 * Um evento de domínio é um fato imutável: `{ type, data }`.
 * Depois de persistido ele vira um `StoredEvent`, ganhando posição global
 * (`globalSeq`), versão dentro do stream e timestamp.
 */

/** Evento de domínio ainda não persistido. */
export interface DomainEvent<TType extends string = string, TData = unknown> {
	type: TType;
	data: TData;
}

/** Evento persistido no event store (fato imutável). */
export interface StoredEvent<TEvent extends DomainEvent = DomainEvent> {
	/** Posição global no log (ordem total de todos os eventos). */
	globalSeq: number;
	streamType: string;
	streamId: number;
	/** Versão do evento dentro do stream (1, 2, 3, ...). */
	version: number;
	type: TEvent["type"];
	data: TEvent extends DomainEvent<string, infer D> ? D : unknown;
	userUid: string;
	occurredAt: Date;
}

/** Reducer puro: estado anterior + evento → novo estado. */
export type Reducer<TState, TEvent extends DomainEvent = DomainEvent> = (
	state: TState | undefined,
	event: StoredEvent<TEvent>,
) => TState | undefined;

export interface AppendInput<TEvent extends DomainEvent = DomainEvent> {
	streamType: string;
	streamId: number;
	/**
	 * Versão esperada do stream antes do append (0 = stream novo).
	 * Se outro comando tiver gravado nesse meio-tempo, o UNIQUE
	 * (stream_type, stream_id, version) rejeita e lançamos ConcurrencyError.
	 */
	expectedVersion: number;
	events: TEvent[];
	userUid: string;
	/** Timestamp do fato (default: now). Útil para seeds/importação. */
	occurredAt?: Date;
}

export interface ReadOptions {
	/** Filtra por dono dos eventos. */
	userUid?: string;
	/** Lê somente até esta posição global (time-travel). */
	toGlobalSeq?: number;
}

export class ConcurrencyError extends Error {
	constructor(streamType: string, streamId: number, expectedVersion: number) {
		super(
			`Concurrency conflict on ${streamType}:${streamId} (expected version ${expectedVersion})`,
		);
		this.name = "ConcurrencyError";
	}
}
