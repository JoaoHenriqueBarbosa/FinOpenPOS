"use client";

/**
 * Lado cliente do sistema de addons.
 *
 * Contribution points de UI:
 *  - `nav`: itens no menu do admin (label vem das mensagens i18n do addon,
 *    mescladas pelo host — namespace "nav").
 *  - `pages`: páginas montadas pelo host numa rota catch-all sob /admin.
 *    Padrões suportados: segmentos literais e parâmetros ":nome"
 *    (ex.: "fiscal", "fiscal/settings", "fiscal/:id").
 *
 * Serviços do host chegam via <AddonServicesProvider> (injeção de
 * dependência): o addon usa `useAddonTRPC<MeuRouter>()` para acessar o
 * cliente tRPC do host tipado com o próprio recorte.
 */
import {
	type ComponentType,
	createContext,
	type ReactNode,
	useContext,
} from "react";

// ── Definição de UI ─────────────────────────────────────────────────────────
export interface AddonNavItem {
	href: string;
	/** Chave dentro do namespace "nav" das mensagens mescladas. */
	labelKey: string;
	icon: ComponentType<{ className?: string }>;
}

export interface AddonPageProps {
	params: Record<string, string>;
}

export interface AddonPage {
	/** Caminho relativo a /admin — ex.: "fiscal", "fiscal/:id". */
	pattern: string;
	component: ComponentType<AddonPageProps>;
}

export interface AddonUIDefinition {
	addonId: string;
	nav?: AddonNavItem[];
	pages?: AddonPage[];
}

export function defineAddonUI(ui: AddonUIDefinition): AddonUIDefinition {
	return ui;
}

// ── Roteamento de páginas contribuídas ──────────────────────────────────────
export interface MatchedAddonPage {
	addonId: string;
	page: AddonPage;
	params: Record<string, string>;
}

export function matchAddonPage(
	uis: readonly AddonUIDefinition[],
	segments: string[],
): MatchedAddonPage | null {
	for (const ui of uis) {
		for (const page of ui.pages ?? []) {
			const parts = page.pattern.split("/").filter(Boolean);
			if (parts.length !== segments.length) continue;

			const params: Record<string, string> = {};
			let ok = true;
			for (let i = 0; i < parts.length; i++) {
				const part = parts[i]!;
				const segment = segments[i]!;
				if (part.startsWith(":")) params[part.slice(1)] = segment;
				else if (part !== segment) {
					ok = false;
					break;
				}
			}
			if (ok) return { addonId: ui.addonId, page, params };
		}
	}
	return null;
}

// ── Injeção de serviços do host ─────────────────────────────────────────────
export interface AddonHostServices {
	/**
	 * Hook `useTRPC` do host (proxy tanstack-react-query sobre o appRouter).
	 * Addons devem tipá-lo com o próprio recorte via `useAddonTRPC<T>()`.
	 */
	useTRPC: () => unknown;
	/** Formata valores monetários em centavos na moeda/locale do host. */
	formatCurrency: (cents: number, locale?: string) => string;
}

const AddonServicesContext = createContext<AddonHostServices | null>(null);

export function AddonServicesProvider({
	services,
	children,
}: {
	services: AddonHostServices;
	children: ReactNode;
}) {
	return (
		<AddonServicesContext.Provider value={services}>
			{children}
		</AddonServicesContext.Provider>
	);
}

export function useAddonServices(): AddonHostServices {
	const services = useContext(AddonServicesContext);
	if (!services) {
		throw new Error(
			"useAddonServices deve ser usado dentro de <AddonServicesProvider> (host)",
		);
	}
	return services;
}

/** Cliente tRPC do host tipado com o recorte do addon. */
export function useAddonTRPC<T>(): T {
	return useAddonServices().useTRPC() as T;
}
