import type { Metadata } from "next";
import { Inter, Outfit, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

const inter = Inter({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-sans",
});

const outfit = Outfit({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-display",
});

const jetbrains = JetBrains_Mono({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-mono",
});

export const metadata: Metadata = {
	title: "FinOpenPOS — Open-Source Point of Sale",
	description:
		"The open-source POS system Brazil deserves. Built with Next.js, PGLite, and modern web technologies.",
	openGraph: {
		title: "FinOpenPOS — Open-Source Point of Sale",
		description: "The open-source POS system Brazil deserves.",
		type: "website",
	},
};

export default async function RootLayout({
	children,
}: { children: React.ReactNode }) {
	const locale = await getLocale();
	const messages = await getMessages();

	return (
		<html lang={locale} className="dark scroll-smooth">
			<body
				className={`${inter.variable} ${outfit.variable} ${jetbrains.variable} noise font-sans bg-[#0C0D0D] text-white antialiased`}
			>
				<NextIntlClientProvider locale={locale} messages={messages}>
					{children}
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
