"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import type { Locale } from "@/i18n/config";
import { setLocale } from "@/i18n/locale";

export function LocaleSwitcher() {
	const router = useRouter();
	const locale = useLocale();
	const t = useTranslations("common");
	const [isPending, startTransition] = useTransition();

	const label = locale === "en" ? "EN" : "PT";
	const nextLocale: Locale = locale === "en" ? "pt-BR" : "en";

	function handleSwitch() {
		startTransition(async () => {
			await setLocale(nextLocale);
			router.refresh();
		});
	}

	return (
		<button
			type="button"
			onClick={handleSwitch}
			disabled={isPending}
			title={t("switchLocale")}
			className="cursor-pointer rounded border border-neon-border px-2 py-1 font-medium text-neon-text-muted text-xs uppercase tracking-wider transition-colors duration-200 hover:text-white disabled:opacity-50"
		>
			{label}
		</button>
	);
}
