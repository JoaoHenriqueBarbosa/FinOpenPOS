import { mergeAddonMessages } from "@finopenpos/addon-kit";
import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { installedAddons } from "@/lib/addons/installed";
import { defaultLocale, type Locale, locales } from "./config";

const messageImports = {
	en: () => import("../messages/en"),
	"pt-BR": () => import("../messages/pt-BR"),
} as const;

export default getRequestConfig(async () => {
	const cookieStore = await cookies();
	const cookieLocale = cookieStore.get("locale")?.value;
	const locale: Locale =
		cookieLocale && locales.includes(cookieLocale as Locale)
			? (cookieLocale as Locale)
			: defaultLocale;

	const base = (await messageImports[locale]()).default;
	// Mescla as mensagens contribuídas pelos addons instalados
	const messages = mergeAddonMessages(base, installedAddons, locale);

	return {
		locale,
		messages,
	};
});
