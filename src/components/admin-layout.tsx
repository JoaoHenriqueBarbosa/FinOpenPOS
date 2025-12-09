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
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

import {
  Package2Icon,
  SearchIcon,
  LayoutDashboardIcon,
  LayersIcon,
  ShoppingCartIcon,
  TruckIcon,
  CalendarIcon,
} from "lucide-react";

const pageNames: { [key: string]: string } = {
  "/admin": "Dashboard",
  "/admin/players": "Clientes",
  "/admin/products": "Productos",
  "/admin/product-categories": "Categorias de Productos",
  "/admin/orders": "Cuentas abiertas",
  "/admin/orders/[id]": "Cuenta",
  "/admin/purchases": "Compras",
  "/admin/suppliers": "Proveedores",
  "/admin/purchases-history": "Historial de compras",
  "/admin/court-slots": "Turnos de canchas",
};

type NavItem = {
  href: string;
  label: string;
};

type NavSection = {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    id: "sales",
    label: "Ventas",
    icon: ShoppingCartIcon,
    items: [
      { href: "/admin/orders", label: "Cuentas abiertas" },
    ],
  },
  {
    id: "courts",
    label: "Canchas",
    icon: CalendarIcon,
    items: [{ href: "/admin/court-slots", label: "Turnos de canchas" }],
  },
  {
    id: "purchases",
    label: "Compras",
    icon: TruckIcon,
    items: [
      { href: "/admin/purchases", label: "Compras" },
      { href: "/admin/purchases-history", label: "Historial de compras" },
      { href: "/admin/suppliers", label: "Proveedores" },
    ],
  },
  {
    id: "admin",
    label: "Administración",
    icon: LayersIcon,
    items: [
      { href: "/admin/products", label: "Productos" },
      {
        href: "/admin/product-categories",
        label: "Categorías de productos",
      },
      { href: "/admin/players", label: "Clientes" },
    ],
  },
];

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
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4">
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
      </header>

      {/* Layout con sidebar + contenido */}
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        {/* Sidebar */}
        <aside className="fixed mt-[56px] inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
          <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
            <TooltipProvider>
              {/* Dashboard suelto */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/admin"
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      pathname === "/admin"
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    } transition-colors hover:text-foreground md:h-8 md:w-8`}
                  >
                    <LayoutDashboardIcon className="h-5 w-5" />
                    <span className="sr-only">Dashboard</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Dashboard</TooltipContent>
              </Tooltip>

              {/* Secciones agrupadas */}
              {navSections.map((section) => {
                const Icon = section.icon;
                const isActive = section.items.some((item) =>
                  pathname.startsWith(item.href)
                );
                const hasMultiple = section.items.length > 1;

                if (hasMultiple) {
                  // Secciones con submenú (Dropdown)
                  return (
                    <DropdownMenu key={section.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <button
                              className={`flex h-9 w-9 items-center justify-center rounded-lg border border-transparent ${
                                isActive
                                  ? "bg-accent text-accent-foreground"
                                  : "text-muted-foreground"
                              } transition-colors hover:text-foreground md:h-8 md:w-8`}
                            >
                              <Icon className="h-5 w-5" />
                              <span className="sr-only">{section.label}</span>
                            </button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {section.label}
                        </TooltipContent>
                      </Tooltip>

                      <DropdownMenuContent side="right" align="start">
                        <DropdownMenuLabel>{section.label}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {section.items.map((item) => (
                          <DropdownMenuItem key={item.href} asChild>
                            <Link href={item.href}>{item.label}</Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                }

                // Secciones de un solo item (link directo)
                const onlyItem = section.items[0];

                return (
                  <Tooltip key={section.id}>
                    <TooltipTrigger asChild>
                      <Link
                        href={onlyItem.href}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                          isActive
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground"
                        } transition-colors hover:text-foreground md:h-8 md:w-8`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="sr-only">{section.label}</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {section.label}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </nav>
        </aside>

        {/* Contenido principal */}
        <main className="flex-1 p-4 sm:px-6 sm:py-0">{children}</main>
      </div>
    </div>
  );
}
