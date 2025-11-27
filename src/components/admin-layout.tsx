"use client";
import Link from "next/link";
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
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  Package2Icon,
  SearchIcon,
  LayoutDashboardIcon,
  DollarSignIcon,
  PackageIcon,
  LayersIcon,
  ShoppingCartIcon,
  UsersIcon,
  StoreIcon,
  TruckIcon,
  FileTextIcon,
  CalendarIcon,
} from "lucide-react";

const pageNames: { [key: string]: string } = {
  "/admin": "Dashboard",
  "/admin/customers": "Clientes",
  "/admin/products": "Productos",
  "/admin/product-categories": "Categorias de Productos",
  "/admin/orders": "Cuentas",
  "/admin/orders/[id]": "Cuenta",
  "/admin/pos": "Point of Sale",
  "/admin/cashier": "Cashier",
  "/admin/purchases": "Compras",
  "/admin/suppliers": "Suppliers",
  "/admin/purchases-history": "Historial de compras",
  "/admin/court-slots": "Turnos de canchas",
};

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const effectiveTitle = Object.keys(pageNames).find((k) => pathname.startsWith(k)) ?? pathname;

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4">
        <Link
          href="/admin"
          className="flex items-center gap-2 text-lg font-semibold"
        >
          <Package2Icon className="h-6 w-6" />
          <span className="sr-only">Admin Panel</span>
        </Link>
        <h1 className="text-xl font-bold">{pageNames[effectiveTitle]}</h1>
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
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <aside className="fixed mt-[56px] inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
          <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
            <TooltipProvider>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/admin/cashier"
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      pathname === "/admin/cashier"
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    } transition-colors hover:text-foreground md:h-8 md:w-8`}
                  >
                    <DollarSignIcon className="h-5 w-5" />
                    <span className="sr-only">Cashier</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Cashier</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/admin/product-categories"
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      pathname === "/admin/product-categories"
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    } transition-colors hover:text-foreground md:h-8 md:w-8`}
                  >
                    <LayersIcon className="h-5 w-5" />
                    <span className="sr-only">Categorias de Productos</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Categorias de Productos</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/admin/products"
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      pathname === "/admin/products"
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    } transition-colors hover:text-foreground md:h-8 md:w-8`}
                  >
                    <PackageIcon className="h-5 w-5" />
                    <span className="sr-only">Productos</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Productos</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/admin/customers"
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      pathname === "/admin/customers"
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    } transition-colors hover:text-foreground md:h-8 md:w-8`}
                  >
                    <UsersIcon className="h-5 w-5" />
                    <span className="sr-only">Clientes</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Clientes</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/admin/orders"
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      pathname.startsWith("/admin/orders")
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    } transition-colors hover:text-foreground md:h-8 md:w-8`}
                  >
                    <ShoppingCartIcon className="h-5 w-5" />
                    <span className="sr-only">Cuentas abiertas</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Cuentas abiertas</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/admin/purchases"
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      pathname === "/admin/purchases"
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    } transition-colors hover:text-foreground md:h-8 md:w-8`}
                  >
                    <TruckIcon className="h-5 w-5" />
                    <span className="sr-only">Compras</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Compras</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/admin/suppliers"
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      pathname === "/admin/suppliers"
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    } transition-colors hover:text-foreground md:h-8 md:w-8`}
                  >
                    <StoreIcon className="h-5 w-5" />
                    <span className="sr-only">Proveedores</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Proveedores</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/admin/purchases-history"
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      pathname === "/admin/purchases-history"
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    } transition-colors hover:text-foreground md:h-8 md:w-8`}
                  >
                    <FileTextIcon className="h-5 w-5" />
                    <span className="sr-only">Historial de compras</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Historial de compras</TooltipContent>
              </Tooltip>
              <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/admin/court-slots"
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    pathname === "/admin/court-slots"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground"
                  } transition-colors hover:text-foreground md:h-8 md:w-8`}
                >
                  {/* el icono que quieras */}
                  <CalendarIcon className="h-5 w-5" />
                  <span className="sr-only">Turnos de canchas</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Turnos de canchas</TooltipContent>
            </Tooltip>
            </TooltipProvider>
          </nav>
        </aside>
        <main className="flex-1 p-4 sm:px-6 sm:py-0">{children}</main>
      </div>
    </div>
  );
}
