import { RootProvider } from "fumadocs-ui/provider/next";
import { defineI18nUI } from "fumadocs-ui/i18n";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { i18n } from "@/lib/i18n";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import "../globals.css";

const { provider } = defineI18nUI(i18n, {
  translations: {
    en: {
      displayName: "English",
    },
    "pt-BR": {
      displayName: "Portugues",
      toc: "Nesta pagina",
      search: "Buscar",
      lastUpdate: "Ultima atualizacao",
      searchNoResult: "Nenhum resultado",
      previousPage: "Anterior",
      nextPage: "Proxima",
      chooseLanguage: "Idioma",
      chooseTheme: "Tema",
    },
  },
});

export const metadata: Metadata = {
  title: {
    template: "%s | FinOpenPOS Docs",
    default: "FinOpenPOS Docs",
  },
  description:
    "Documentation for FinOpenPOS — open-source point of sale system",
};

interface LayoutProps {
  params: Promise<{ lang: string }>;
  children: ReactNode;
}

export default async function Layout({ params, children }: LayoutProps) {
  const { lang } = await params;

  setRequestLocale(lang);
  const messages = await getMessages();

  return (
    <html lang={lang} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider locale={lang} messages={messages}>
          <RootProvider i18n={provider(lang)}>{children}</RootProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
