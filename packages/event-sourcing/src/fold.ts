import type { DomainEvent, Reducer, StoredEvent } from "./types";

/**
 * Reconstrói o estado de todos os streams presentes numa lista de eventos.
 * Retorna um Map streamId → estado (streams cujo reducer devolveu
 * `undefined` — ex.: deletados — são removidos do mapa).
 */
export function foldStreams<TState, TEvent extends DomainEvent>(
	events: StoredEvent<TEvent>[],
	reducer: Reducer<TState, TEvent>,
): Map<number, TState> {
	const state = new Map<number, TState>();
	for (const event of events) {
		const next = reducer(state.get(event.streamId), event);
		if (next === undefined) state.delete(event.streamId);
		else state.set(event.streamId, next);
	}
	return state;
}

/** Reconstrói o estado de um único stream a partir dos seus eventos. */
export function foldStream<TState, TEvent extends DomainEvent>(
	events: StoredEvent<TEvent>[],
	reducer: Reducer<TState, TEvent>,
): { state: TState | undefined; version: number } {
	let state: TState | undefined;
	let version = 0;
	for (const event of events) {
		state = reducer(state, event);
		version = event.version;
	}
	return { state, version };
}
