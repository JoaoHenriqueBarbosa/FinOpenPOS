"use client";

import { AdminLayout } from "@/components/admin-layout";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // La autenticación ya se maneja en el middleware del servidor
  // No necesitamos validar el usuario aquí para evitar llamadas duplicadas
  return <AdminLayout>{children}</AdminLayout>;
}
