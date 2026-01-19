"use client";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2Icon,
  ShoppingCartIcon,
  CalendarIcon,
  TrophyIcon,
  ArrowRightIcon,
  UsersIcon,
  PackageIcon,
  TruckIcon,
  AlertTriangleIcon,
  DollarSignIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { adminService } from "@/services";
import { formatDate } from "@/lib/date-utils";

export default function Page() {
  const router = useRouter();

  // Queries para datos del dashboard
  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ["dashboard-sales"],
    queryFn: () => adminService.getDashboardSales(),
    staleTime: 30 * 1000, // 30 segundos
  });

  const { data: courtsData, isLoading: loadingCourts } = useQuery({
    queryKey: ["dashboard-courts"],
    queryFn: () => adminService.getDashboardCourts(),
    staleTime: 60 * 1000, // 1 minuto
  });

  const { data: tournamentsData, isLoading: loadingTournaments } = useQuery({
    queryKey: ["dashboard-tournaments"],
    queryFn: () => adminService.getDashboardTournaments(),
    staleTime: 60 * 1000, // 1 minuto
  });

  const loading = loadingSales || loadingCourts || loadingTournaments;

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
            {loadingSales ? (
              <div className="flex items-center justify-center h-20">
                <Loader2Icon className="h-5 w-5 animate-spin" />
              </div>
            ) : salesData ? (
              <>
                <div className="space-y-3">
                  {/* Cuentas abiertas */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Cuentas abiertas</span>
                      <span className="text-2xl font-bold">{salesData.openOrders.count}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Monto total</span>
                      <span className="text-lg font-semibold">${salesData.openOrders.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Ventas del día */}
                  <div className="border-t pt-3 space-y-2">
                    <div className="text-sm font-semibold">Ventas de hoy</div>
                    <div className="space-y-1">
                      {Object.entries(salesData.todaySales.byPaymentMethod).map(([method, amount]) => (
                        <div key={method} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{method}</span>
                          <span className="font-medium">${Number(amount).toFixed(2)}</span>
                        </div>
                      ))}
                      {Object.keys(salesData.todaySales.byPaymentMethod).length === 0 && (
                        <div className="text-xs text-muted-foreground">No hay ventas hoy</div>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm font-semibold">Total del día</span>
                      <span className="text-lg font-bold">${salesData.todaySales.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 pt-2">
                  <Button
                    className="w-full"
                    onClick={() => router.push("/admin/quick-sale")}
                  >
                    Venta rápida
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => router.push("/admin/orders?tab=open-accounts")}
                  >
                    Abrir cuenta
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => router.push("/admin/orders?tab=sales")}
                  >
                    Ver ventas
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : null}
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
            {loadingCourts ? (
              <div className="flex items-center justify-center h-20">
                <Loader2Icon className="h-5 w-5 animate-spin" />
              </div>
            ) : courtsData ? (
              <>
                <div className="space-y-3">
                  {/* Turnos jugados hoy */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Turnos jugados hoy</span>
                      <span className="text-2xl font-bold">{courtsData.totalPlayed}</span>
                    </div>
                    {/* Por cancha */}
                    {Object.keys(courtsData.playedSlotsByCourt).length > 0 && (
                      <div className="space-y-1 pl-2 border-l-2">
                        {Object.entries(courtsData.playedSlotsByCourt).map(([courtName, count]) => (
                          <div key={courtName} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{courtName}</span>
                            <span className="font-medium">{count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Alerta de pagos sin asignar */}
                  {courtsData.hasUnpaidSlots && (
                    <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
                      <AlertTriangleIcon className="h-4 w-4 text-destructive" />
                      <span className="text-xs text-destructive font-medium">
                        Hay turnos con pagos sin asignar
                      </span>
                    </div>
                  )}
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
            ) : null}
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
            {loadingTournaments ? (
              <div className="flex items-center justify-center h-20">
                <Loader2Icon className="h-5 w-5 animate-spin" />
              </div>
            ) : tournamentsData ? (
              <>
                {tournamentsData.activeTournaments.length > 0 ? (
                  <div className="space-y-3">
                    {tournamentsData.activeTournaments.map((tournament) => (
                      <div
                        key={tournament.id}
                        className="p-3 border rounded-md space-y-2 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/admin/tournaments/${tournament.id}`)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-sm">{tournament.name}</div>
                            <Badge variant="outline" className="mt-1 text-xs">
                              {tournament.phase}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <UsersIcon className="h-3 w-3" />
                            <span>{tournament.teamsCount} equipos</span>
                          </div>
                          {tournament.startDate && (
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              <span>Inicio: {formatDate(tournament.startDate)}</span>
                            </div>
                          )}
                          {tournament.endDate && (
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              <span>Fin: {formatDate(tournament.endDate)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No hay torneos activos
                  </div>
                )}
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => router.push("/admin/tournaments")}
                >
                  Ver todos los torneos
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Button>
              </>
            ) : null}
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
                Registrar compras e historial
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => router.push("/admin/balance")}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium">Balance</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs">
                Ajustes de fondos y retiros de socios
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
