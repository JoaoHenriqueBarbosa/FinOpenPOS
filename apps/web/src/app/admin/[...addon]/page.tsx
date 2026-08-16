"use client";

import {
	AddonServicesProvider,
	matchAddonPage,
} from "@finopenpos/addon-kit/ui";
/**
 * Rota catch-all que monta as páginas contribuídas pelos addons instalados
 * sob /admin (ex.: /admin/fiscal, /admin/fiscal/settings, /admin/fiscal/42).
 * Rotas estáticas do core têm precedência — o Next só cai aqui quando
 * nenhuma página física casa com o caminho.
 */
import { notFound, useParams } from "next/navigation";
import { installedAddonUIs } from "@/lib/addons/installed-ui";
import { useTRPC } from "@/lib/trpc/client";
import { formatCurrency } from "@/lib/utils";

const hostServices = { useTRPC, formatCurrency };

export default function AddonPage() {
	const params = useParams<{ addon: string[] }>();
	const segments = Array.isArray(params.addon) ? params.addon : [params.addon];

	const match = matchAddonPage(installedAddonUIs, segments);
	if (!match) notFound();

	const Page = match.page.component;
	return (
		<AddonServicesProvider services={hostServices}>
			<Page params={match.params} />
		</AddonServicesProvider>
	);
}
