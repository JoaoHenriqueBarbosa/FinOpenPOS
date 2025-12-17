"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2Icon,
  ShoppingCartIcon,
  CalendarIcon,
  TrophyIcon,
  ArrowRightIcon,
  DollarSignIcon,
  UsersIcon,
  PackageIcon,
  TruckIcon,
  LayersIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

// Fetch functions
async function fetchOpenOrdersCount(): Promise<number> {
  const res = await fetch("/api/orders");
  if (!res.ok) throw new Error("Failed to fetch orders");
  const orders = await res.json();
  return orders.filter((o: any) => o.status === "open").length;
}

async function fetchTodayCourtSlots(): Promise<number> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  
  const res = await fetch(`/api/court-slots?date=${dateStr}`);
  if (!res.ok) throw new Error("Failed to fetch court slots");
  const slots = await res.json();
  return slots.length;
}

async function fetchTotalRevenue(): Promise<number> {
  const res = await fetch("/api/admin/revenue/total");
  if (!res.ok) throw new Error("Failed to fetch revenue");
  const data = await res.json();
  return data.totalRevenue || 0;
}

export default function Page() {
  const router = useRouter();

  // Queries para datos principales
  const { data: openOrdersCount = 0, isLoading: loadingOrders } = useQuery({
    queryKey: ["open-orders-count"],
    queryFn: fetchOpenOrdersCount,
    staleTime: 30 * 1000, // 30 segundos
  });

  const { data: todaySlotsCount = 0, isLoading: loadingSlots } = useQuery({
    queryKey: ["today-court-slots"],
    queryFn: fetchTodayCourtSlots,
    staleTime: 60 * 1000, // 1 minuto
  });

  const { data: totalRevenue = 0, isLoading: loadingRevenue } = useQuery({
    queryKey: ["total-revenue"],
    queryFn: fetchTotalRevenue,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const loading = loadingOrders || loadingSlots || loadingRevenue;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>

      {/* Sección Principal: Acciones Rápidas */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Ventas - Más importante */}
        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Ventas</CardTitle>
              <ShoppingCartIcon className="h-5 w-5 text-primary" />
            </div>
            <CardDescription>Gestión de cuentas y pedidos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-20">
                <Loader2Icon className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Cuentas abiertas</span>
                    <span className="text-2xl font-bold">{openOrdersCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Ingresos totales</span>
                    <span className="text-lg font-semibold">${totalRevenue.toFixed(2)}</span>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => router.push("/admin/orders")}
                >
                  Ver cuentas
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Canchas - Segundo */}
        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Canchas</CardTitle>
              <CalendarIcon className="h-5 w-5 text-primary" />
            </div>
            <CardDescription>Gestión de turnos y reservas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center h-20">
                <Loader2Icon className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Turnos hoy</span>
                    <span className="text-2xl font-bold">{todaySlotsCount}</span>
                  </div>
                </div>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => router.push("/admin/court-slots")}
                >
                  Ver turnos
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Torneos - Tercero */}
        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Torneos</CardTitle>
              <TrophyIcon className="h-5 w-5 text-primary" />
            </div>
            <CardDescription>Gestión de competencias</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full"
              variant="outline"
              onClick={() => router.push("/admin/tournaments")}
            >
              Ver torneos
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Sección Secundaria: Funciones Esporádicas */}
      <div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => router.push("/admin/players")}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Clientes</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs">
                Gestionar clientes y jugadores
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => router.push("/admin/products")}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <PackageIcon className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Productos</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs">
                Gestionar productos y categorías
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => router.push("/admin/purchases")}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TruckIcon className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Compras</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs">
                Registrar compras y proveedores
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => router.push("/admin/purchases-history")}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <LayersIcon className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Historial</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs">
                Ver historial de compras
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
