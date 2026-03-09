"use server";

import { cookies } from "next/headers";
import { type Locale, locales, defaultLocale } from "./config";

export async function setLocale(locale: Locale) {
	const cookieStore = await cookies();
	cookieStore.set("locale", locale, {
		path: "/",
		maxAge: 60 * 60 * 24 * 365,
		sameSite: "lax",
	});
}

export async function getLocale(): Promise<Locale> {
	const cookieStore = await cookies();
	const value = cookieStore.get("locale")?.value;
	if (value && locales.includes(value as Locale)) return value as Locale;
	return defaultLocale;
}
