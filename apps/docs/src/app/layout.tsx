import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: "%s | FinOpenPOS Docs",
    default: "FinOpenPOS Docs",
  },
  description: "Documentation for FinOpenPOS — open-source point of sale system",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
