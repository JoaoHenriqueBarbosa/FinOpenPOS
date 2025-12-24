"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import {
  Package2Icon,
  SearchIcon,
  LayoutDashboardIcon,
  ShoppingCartIcon,
  CalendarIcon,
  TrophyIcon,
} from "lucide-react";

const pageNames: { [key: string]: string } = {
  "/admin": "Dashboard",
  "/admin/players": "Clientes",
  "/admin/products": "Productos",
  "/admin/product-categories": "Categorias de Productos",
  "/admin/orders": "Cuentas abiertas",
  "/admin/orders/[id]": "Cuenta",
  "/admin/quick-sale": "Venta rápida",
  "/admin/purchases": "Compras",
  "/admin/suppliers": "Proveedores",
  "/admin/purchases-history": "Historial de compras",
  "/admin/court-slots": "Turnos de canchas",
  "/admin/tournaments": "Torneos",
  "/admin/tournaments/[id]": "Torneo",
};

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // elegir el key más específico que matchee el pathname
  const effectiveKey =
    Object.keys(pageNames)
      .filter((k) => pathname.startsWith(k))
      .sort((a, b) => b.length - a.length)[0] ?? pathname;

  const title = pageNames[effectiveKey] ?? "";

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="flex h-14 items-center gap-4 px-4">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-lg font-semibold"
          >
            <Package2Icon className="h-6 w-6" />
            <span className="sr-only">Admin Panel</span>
          </Link>
          <h1 className="text-xl font-bold">{title}</h1>

          <div className="relative ml-auto flex-1 md:grow-0">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="overflow-hidden rounded-full"
              >
                <Image
                  src="/placeholder-user.jpg"
                  width={36}
                  height={36}
                  alt="Avatar"
                  className="overflow-hidden rounded-full"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Support</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Barra de navegación principal */}
        <nav className="flex h-12 items-center gap-1 border-t bg-muted/40 px-4">
          <Link
            href="/admin"
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              pathname === "/admin"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
            }`}
          >
            <LayoutDashboardIcon className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="/admin/orders"
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              pathname.startsWith("/admin/orders")
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
            }`}
          >
            <ShoppingCartIcon className="h-4 w-4" />
            Ventas
          </Link>
          <Link
            href="/admin/court-slots"
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              pathname.startsWith("/admin/court-slots")
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
            }`}
          >
            <CalendarIcon className="h-4 w-4" />
            Canchas
          </Link>
          <Link
            href="/admin/tournaments"
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              pathname.startsWith("/admin/tournaments")
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
            }`}
          >
            <TrophyIcon className="h-4 w-4" />
            Torneos
          </Link>
        </nav>
      </header>

      {/* Layout sin sidebar - solo contenido */}
      <div className="flex flex-col sm:gap-4 sm:py-4">
        {/* Contenido principal */}
        <main className="flex-1 p-2 sm:px-4 sm:py-0">{children}</main>
      </div>
    </div>
  );
}
