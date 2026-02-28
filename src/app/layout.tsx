import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { TRPCReactProvider } from "@/components/trpc-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FinOpenPOS",
  description: "Open-source point of sale system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TRPCReactProvider>
          <main>{children}</main>
          <Toaster richColors position="bottom-right" />
        </TRPCReactProvider>
      </body>
    </html>
  );
}
