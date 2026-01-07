"use client";

import { useState, useCallback, useEffect } from "react";
import { formatDateTime } from "@/lib/date-utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Loader2Icon, PlusIcon, SearchIcon, FilePenIcon, ShoppingCartIcon, ReceiptIcon, CalendarIcon, BarChart3Icon, ArrowUpDownIcon, ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { PlayerSearchSelect } from "@/components/player-search-select/PlayerSearchSelect";
import Link from "next/link";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import type { OrderDTO, OrderStatus } from "@/models/dto/order";
import type { PlayerDTO } from "@/models/dto/player";
import type { PlayerStatus } from "@/models/db/player";
import { ordersService, playersService, transactionsService, productsService, productCategoriesService } from "@/services";
import type { TransactionDTO } from "@/services/transactions.service";
import type { ProductDTO } from "@/models/dto/product";
import type { ProductCategoryDTO } from "@/models/dto/product-category";
import { useMemo } from "react";

// ---- fetchers ----
async function fetchOrders(): Promise<OrderDTO[]> {
  return ordersService.getAll();
}

async function fetchPlayers(): Promise<PlayerDTO[]> {
  return playersService.getAll(true);
}

async function fetchProducts(): Promise<ProductDTO[]> {
  return productsService.getAll();
}

async function fetchProductCategories(): Promise<ProductCategoryDTO[]> {
  return productCategoriesService.getAll(true);
}

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Leer el tab desde query params
  const tabFromQuery = searchParams.get("tab");
  const initialTab = (tabFromQuery === "sales" ? "sales" : tabFromQuery === "statistics" ? "statistics" : "open-accounts") as "open-accounts" | "sales" | "statistics";
  
  // Obtener fecha de hoy en formato YYYY-MM-DD
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const [activeTab, setActiveTab] = useState<"open-accounts" | "sales" | "statistics">(initialTab);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilterOpenAccounts, setStatusFilterOpenAccounts] = useState<"all" | OrderStatus>("open");
  const [statusFilterSales, setStatusFilterSales] = useState<"all" | OrderStatus>("all");
  // Funciones para fechas con hora (para el tab de ventas)
  const getTodayDateStart = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T00:00`;
  };

  const getTodayDateEnd = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}T23:59`;
  };

  const [fromDate, setFromDate] = useState<string>(initialTab === "sales" ? getTodayDateStart() : "");
  const [toDate, setToDate] = useState<string>(initialTab === "sales" ? getTodayDateEnd() : "");
  
  // Filtros para estadísticas
  const [statsFromDate, setStatsFromDate] = useState<string>(getTodayDate());
  const [statsToDate, setStatsToDate] = useState<string>(getTodayDate());
  const [selectedProductId, setSelectedProductId] = useState<number | "all">("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "all">("all");

  // Cuando cambia el tab a "sales", establecer fechas de hoy si no están configuradas
  useEffect(() => {
    if (activeTab === "sales" && !fromDate && !toDate) {
      setFromDate(getTodayDateStart());
      setToDate(getTodayDateEnd());
    }
  }, [activeTab, fromDate, toDate]);

  // Cuando cambia el tab a "statistics", establecer fechas de hoy si no están configuradas
  useEffect(() => {
    if (activeTab === "statistics" && !statsFromDate && !statsToDate) {
      const today = getTodayDate();
      setStatsFromDate(today);
      setStatsToDate(today);
    }
  }, [activeTab, statsFromDate, statsToDate]);

  const [isNewOrderDialogOpen, setIsNewOrderDialogOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Estado para ordenamiento de la tabla de ventas
  type SortColumn = "id" | "client" | "status" | "payment_method" | "total" | "date";
  type SortDirection = "asc" | "desc";
  const [salesSortColumn, setSalesSortColumn] = useState<SortColumn>("date");
  const [salesSortDirection, setSalesSortDirection] = useState<SortDirection>("desc");

  // Popup rápido para nuevo cliente
  const [isNewPlayerDialogOpen, setIsNewPlayerDialogOpen] = useState(false);
  const [newPlayerFirstName, setNewPlayerFirstName] = useState("");
  const [newPlayerLastName, setNewPlayerLastName] = useState("");
  const [newPlayerPhone, setNewPlayerPhone] = useState("");
  const [newPlayerStatus, setNewPlayerStatus] =
    useState<PlayerStatus>("active");
  const [creatingPlayer, setCreatingPlayer] = useState(false);

  // ---- Queries ----
  const {
    data: orders = [],
    isLoading: loadingOrders,
    isError: ordersError,
  } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const {
    data: players = [],
    isLoading: loadingPlayers,
    isError: playersError,
  } = useQuery({
    queryKey: ["players", "onlyActive"],
    queryFn: fetchPlayers,
    staleTime: 1000 * 60 * 10, // 10 minutos - los players cambian menos frecuentemente
  });

  // Query para productos y categorías (para estadísticas)
  const {
    data: products = [],
    isLoading: loadingProducts,
  } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
    enabled: activeTab === "statistics",
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: categories = [],
    isLoading: loadingCategories,
  } = useQuery({
    queryKey: ["product-categories", "onlyActive"],
    queryFn: fetchProductCategories,
    enabled: activeTab === "statistics",
    staleTime: 1000 * 60 * 10,
  });

  // Query para estadísticas
  const {
    data: statistics = [],
    isLoading: loadingStats,
  } = useQuery({
    queryKey: ["order-statistics", statsFromDate, statsToDate, selectedProductId, selectedCategoryId],
    queryFn: async () => {
      return ordersService.getStatistics({
        fromDate: statsFromDate || undefined,
        toDate: statsToDate || undefined,
        productId: selectedProductId !== "all" ? selectedProductId : undefined,
        categoryId: selectedCategoryId !== "all" ? selectedCategoryId : undefined,
      });
    },
    enabled: activeTab === "statistics",
    staleTime: 1000 * 30, // 30 segundos
  });

  // Query para transacciones (solo cuando estamos en el tab de ventas)
  const {
    data: transactions = [],
    isLoading: loadingTransactions,
  } = useQuery({
    queryKey: ["transactions", fromDate, toDate],
    queryFn: async () => {
      if (!fromDate || !toDate) return [];
      
      // Convertir fechas con hora del navegador (zona horaria local) a ISO strings
      // para compararlas correctamente con los timestamps UTC de la DB
      const getLocalDateTimeISO = (dateTimeStr: string): string => {
        // dateTimeStr viene como "2025-12-25T14:30" (datetime-local format)
        // Crear fecha en zona horaria local
        const localDate = new Date(dateTimeStr);
        // Convertir a ISO string (UTC) para comparar con la DB
        return localDate.toISOString();
      };
      
      const fromISO = getLocalDateTimeISO(fromDate);
      const toISO = getLocalDateTimeISO(toDate);
      
      return transactionsService.getAll({
        type: "income",
        status: "completed",
        from: fromISO,
        to: toISO,
      });
    },
    enabled: activeTab === "sales" && !!fromDate && !!toDate,
    staleTime: 1000 * 30, // 30 segundos
  });

  // toasts de error de carga
  useEffect(() => {
    if (ordersError) toast.error("Error al cargar las cuentas.");
  }, [ordersError]);

  useEffect(() => {
    if (playersError) toast.error("Error al cargar los clientes.");
  }, [playersError]);

  // ---- Filtro en memoria ----
  const getFilteredOrders = (statusFilter: "all" | OrderStatus, includeDateFilter: boolean = false) => {
    return orders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) return false;

      // Filtro por fecha y hora (solo en el tab de ventas)
      // Usar closed_at para filtrar por fecha de cierre de la venta
      if (includeDateFilter) {
        // Si la orden no tiene closed_at, no se muestra en el filtro de ventas
        if (!order.closed_at) return false;

        // Comparar timestamps directamente
        const closedAt = new Date(order.closed_at).getTime();
        
        if (fromDate && toDate) {
          const fromTime = new Date(fromDate).getTime();
          const toTime = new Date(toDate).getTime();
          // Solo mostrar órdenes donde el timestamp esté dentro del rango
          if (closedAt < fromTime || closedAt > toTime) return false;
        } else if (fromDate) {
          const fromTime = new Date(fromDate).getTime();
          if (closedAt < fromTime) return false;
        } else if (toDate) {
          const toTime = new Date(toDate).getTime();
          if (closedAt > toTime) return false;
        }
      }

      const term = searchTerm.toLowerCase();
      const playerName = order.player
        ? `${order.player.first_name} ${order.player.last_name}`
        : "";
      const idString = String(order.id);

      return (
        playerName.toLowerCase().includes(term) ||
        idString.includes(term)
      );
    });
  };

  const filteredOrders = activeTab === "open-accounts" 
    ? getFilteredOrders(statusFilterOpenAccounts, false)
    : activeTab === "sales"
    ? getFilteredOrders(statusFilterSales, true)
    : [];

  // Mapa de order_id -> payment_method.name para mostrar en la tabla de ventas
  const orderPaymentMethodMap = useMemo(() => {
    const map = new Map<number, string>();
    transactions.forEach((tx: TransactionDTO) => {
      if (tx.order_id && tx.payment_method?.name) {
        map.set(tx.order_id, tx.payment_method.name);
      }
    });
    return map;
  }, [transactions]);

  // Función para ordenar las órdenes de ventas
  const sortedSalesOrders = useMemo(() => {
    if (activeTab !== "sales") return filteredOrders;
    
    const sorted = [...filteredOrders];
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (salesSortColumn) {
        case "id":
          aValue = a.id;
          bValue = b.id;
          break;
        case "client":
          aValue = `${a.player?.first_name ?? ""} ${a.player?.last_name ?? ""}`.trim().toLowerCase();
          bValue = `${b.player?.first_name ?? ""} ${b.player?.last_name ?? ""}`.trim().toLowerCase();
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        case "payment_method":
          aValue = orderPaymentMethodMap.get(a.id) || "";
          bValue = orderPaymentMethodMap.get(b.id) || "";
          break;
        case "total":
          aValue = a.total_amount;
          bValue = b.total_amount;
          break;
        case "date":
          aValue = a.closed_at ? new Date(a.closed_at).getTime() : new Date(a.created_at).getTime();
          bValue = b.closed_at ? new Date(b.closed_at).getTime() : new Date(b.created_at).getTime();
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return salesSortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return salesSortDirection === "asc" ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [filteredOrders, activeTab, salesSortColumn, salesSortDirection, orderPaymentMethodMap]);

  // Handler para cambiar el ordenamiento
  const handleSort = useCallback((column: SortColumn) => {
    if (salesSortColumn === column) {
      // Si es la misma columna, cambiar la dirección
      setSalesSortDirection(salesSortDirection === "asc" ? "desc" : "asc");
    } else {
      // Si es una columna diferente, establecerla y empezar con asc
      setSalesSortColumn(column);
      setSalesSortDirection("asc");
    }
  }, [salesSortColumn, salesSortDirection]);


  // Calcular resumen para el tab de ventas
  const salesSummary = (() => {
    if (activeTab !== "sales" || !fromDate || !toDate) {
      return null;
    }

    // Comparar timestamps directamente
    const fromTime = new Date(fromDate).getTime();
    const toTime = new Date(toDate).getTime();

    // 1. Cuentas abiertas en el rango (created_at dentro del rango)
    const openedToday = orders.filter((order) => {
      const createdTime = new Date(order.created_at).getTime();
      return createdTime >= fromTime && createdTime <= toTime;
    }).length;

    // 2. Cuentas cerradas en el rango (closed_at dentro del rango)
    const closedToday = orders.filter((order) => {
      if (!order.closed_at) return false;
      const closedTime = new Date(order.closed_at).getTime();
      return closedTime >= fromTime && closedTime <= toTime;
    }).length;

    // 3. Ventas rápidas (cliente "Venta rápida")
    const quickSales = orders.filter((order) => {
      if (!order.closed_at) return false;
      const closedTime = new Date(order.closed_at).getTime();
      if (closedTime < fromTime || closedTime > toTime) return false;
      return (
        order.player?.first_name === "Venta rápida" &&
        order.player?.last_name === "Cliente ocasional"
      );
    }).length;

    // 4. Total por método de pago (de las transacciones)
    const salesByPaymentMethod: Record<string, number> = {};
    transactions.forEach((tx: TransactionDTO) => {
      if (tx.type === "income" && tx.status === "completed" && tx.payment_method) {
        const methodName = tx.payment_method.name;
        if (!salesByPaymentMethod[methodName]) {
          salesByPaymentMethod[methodName] = 0;
        }
        salesByPaymentMethod[methodName] += Number(tx.amount);
      }
    });

    // 5. Total general (suma de todas las transacciones de ingresos completadas)
    const totalSales = transactions
      .filter((tx: TransactionDTO) => tx.type === "income" && tx.status === "completed")
      .reduce((sum, tx: TransactionDTO) => sum + Number(tx.amount), 0);

    return {
      openedToday,
      closedToday,
      quickSales,
      salesByPaymentMethod,
      totalSales,
    };
  })();

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "open":
        return <Badge variant="outline">Abierta</Badge>;
      case "closed":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
            Pagada
          </Badge>
        );
      case "cancelled":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/30">
            Cancelada
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // ---- Mutations ----

  // Crear cuenta con optimistic update completo
  const createOrderMutation = useMutation({
    mutationFn: async (payload: { playerId: number | null }) => {
      try {
        return await ordersService.create({ playerId: payload.playerId! });
      } catch (error: any) {
        // Si hay un orderId o el mensaje indica cuenta abierta, usar mensaje específico
        if (error.orderId || 
            error.message?.includes("already has an open order") || 
            error.message?.includes("ya tiene una cuenta abierta") ||
            error.status === 409) {
          const err = new Error("El cliente ya tiene una cuenta abierta. Cerrala antes de abrir otra.");
          (err as any).orderId = error.orderId;
          throw err;
        }
        // Si el error ya tiene un mensaje descriptivo en español, usarlo
        if (error.message && 
            !error.message.includes("Error creating") && 
            !error.message.includes("Error al crear")) {
          throw error;
        }
        // Mensaje genérico mejorado
        throw new Error("No se pudo crear la cuenta. Verificá que el cliente esté seleccionado e intentá nuevamente.");
      }
    },
    onMutate: async (payload) => {
      // Cancelar queries en progreso para evitar conflictos
      await queryClient.cancelQueries({ queryKey: ["orders"] });

      const previousOrders =
        queryClient.getQueryData<OrderDTO[]>(["orders"]) ?? [];

      // Optimistic update: crear orden temporal con datos del cliente
      const player = players.find((p) => p.id === payload.playerId);
      const tempId = -Math.floor(Math.random() * 1_000_000);
      const optimisticOrder: OrderDTO = {
        id: tempId,
        status: "open",
        total_amount: 0,
        created_at: new Date().toISOString(),
        closed_at: null,
        items: [],
        player: player
          ? {
              id: player.id,
              first_name: player.first_name,
              last_name: player.last_name,
            }
          : null,
      };

      // Actualizar cache inmediatamente
      queryClient.setQueryData<OrderDTO[]>(["orders"], (old) => [
        optimisticOrder,
        ...(old ?? []),
      ]);

      // NO cerrar el dialog aquí - esperar a que la mutación termine exitosamente
      // NO navegar aquí - esperar a que la mutación termine exitosamente
      // Limpiar error previo
      setOrderError(null);

      return { previousOrders, tempId, optimisticOrder };
    },
    onError: (err, _vars, ctx) => {
      // Rollback en caso de error
      if (ctx?.previousOrders) {
        queryClient.setQueryData(["orders"], ctx.previousOrders);
      }
      
      // Mostrar error en el dialog (el dialog permanece abierto)
      const errorMessage = err instanceof Error
        ? err.message
        : "Error al crear la cuenta.";
      
      setOrderError(errorMessage);
      
      // También mostrar toast para feedback inmediato
      toast.error(errorMessage);
    },
    onSuccess: (newOrder, _vars, ctx) => {
      // Limpiar error y cerrar dialog
      setOrderError(null);
      setIsNewOrderDialogOpen(false);
      setSelectedPlayerId(null);
      
      // Reemplazar orden optimista con la real
      queryClient.setQueryData<OrderDTO[]>(["orders"], (old) => {
        if (!old) return [newOrder];
        // Remover la orden optimista y agregar la real
        const filtered = old.filter((o) => o.id !== ctx?.tempId);
        return [newOrder, ...filtered];
      });

      // Navegar a la nueva orden
      router.push(`/admin/orders/${newOrder.id}`);

      toast.success("Cuenta creada.");
    },
  });

  const handleCreateOrder = useCallback(() => {
    if (!selectedPlayerId) {
      toast.error("Debe seleccionar un cliente.");
      return;
    }

    const alreadyOpen = orders.some(
      (o) => o.player?.id === selectedPlayerId && o.status === "open"
    );  
    if (alreadyOpen) {
      toast.error("Este cliente ya tiene una cuenta abierta. Cerrala antes de abrir otra.");
      return;
    }

    createOrderMutation.mutate({
      playerId: selectedPlayerId,
    });
  }, [selectedPlayerId, createOrderMutation]);

  // Crear cliente rápido
  const createPlayerMutation = useMutation({
    mutationFn: async (payload: {
      first_name: string;
      last_name: string;
      phone: string;
      status: PlayerStatus;
    }) => {
      return await playersService.create(payload);
    },
    onMutate: async (payload) => {
      setCreatingPlayer(true);
      await queryClient.cancelQueries({ queryKey: ["players", "onlyActive"] });

      const previousPlayers =
        queryClient.getQueryData<PlayerDTO[]>(["players", "onlyActive"]) ?? [];

      // Optimista: agregamos uno "fake" mientras tanto
      const tempId = -Math.floor(Math.random() * 1_000_000);
      const optimisticPlayer: PlayerDTO = {
        id: tempId,
        first_name: payload.first_name,
        last_name: payload.last_name,
        phone: payload.phone,
        email: null,
        birth_date: null,
        notes: null,
        status: payload.status,
      };

      queryClient.setQueryData<PlayerDTO[]>(
        ["players", "onlyActive"],
        (old) => [optimisticPlayer, ...(old ?? [])]
      );

      // seleccionamos ya al cliente nuevo en el select
      setSelectedPlayerId(tempId);

      return { previousPlayers, tempId };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previousPlayers) {
        queryClient.setQueryData(
          ["players", "onlyActive"],
          ctx.previousPlayers
        );
      }
      toast.error(
        err instanceof Error ? err.message : "Error creando cliente."
      );
      setCreatingPlayer(false);
    },
    onSuccess: (newPlayer, _vars, ctx) => {
      // Reemplazamos el temp por el real
      queryClient.setQueryData<PlayerDTO[]>(
        ["players", "onlyActive"],
        (old) => {
          const list = old ?? [];
          if (!ctx?.tempId) return [newPlayer, ...list];
          return [
            newPlayer,
            ...list.filter((c) => c.id !== ctx.tempId),
          ];
        }
      );

      setSelectedPlayerId(newPlayer.id);
      toast.success("Cliente creado.");

      // Cerrar popup y limpiar form
      setIsNewPlayerDialogOpen(false);
      setNewPlayerFirstName("");
      setNewPlayerLastName("");
      setNewPlayerPhone("");
      setNewPlayerStatus("active");
      setCreatingPlayer(false);
    },
  });

  const handleCreatePlayer = useCallback(() => {
    const firstName = newPlayerFirstName.trim();
    if (!firstName) {
      toast.error("El nombre del cliente es obligatorio.");
      return;
    }
    const lastName = newPlayerLastName.trim();
    if (!lastName) {
      toast.error("El apellido del cliente es obligatorio.");
      return;
    }
    const phone = newPlayerPhone.trim();
    if (!phone) {
      toast.error("El telefono del cliente es obligatorio.");
      return;
    }

    createPlayerMutation.mutate({
      first_name: firstName,
      last_name: lastName,
      phone: newPlayerPhone,
      status: newPlayerStatus,
    });
  }, [
    newPlayerFirstName,
    newPlayerLastName,
    newPlayerPhone,
    newPlayerStatus,
    createPlayerMutation,
  ]);

  const globalLoading = loadingOrders || loadingPlayers || (activeTab === "statistics" && (loadingProducts || loadingCategories));

  if (globalLoading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2Icon className="mx-auto h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "open-accounts" | "sales" | "statistics")}>
        <TabsList className="mb-4">
          <TabsTrigger value="open-accounts">
            <FilePenIcon className="w-4 h-4 mr-2" />
            Cuentas abiertas
          </TabsTrigger>
          <TabsTrigger value="sales">
            <ReceiptIcon className="w-4 h-4 mr-2" />
            Ver ventas
          </TabsTrigger>
          <TabsTrigger value="statistics">
            <BarChart3Icon className="w-4 h-4 mr-2" />
            Estadísticas de ventas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open-accounts">
          <Card className="flex flex-col gap-6 p-6">
            <CardHeader className="p-0 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-xl font-semibold">
                  Cuentas abiertas
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => router.push("/admin/quick-sale")}
                  >
                    <ShoppingCartIcon className="w-4 h-4 mr-2" />
                    Venta rápida
                  </Button>
                  <Button size="sm" onClick={() => setIsNewOrderDialogOpen(true)}>
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Abrir cuenta
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="relative max-w-xs w-full">
                  <Input
                    placeholder="Buscar por cliente o #cuenta..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-8"
                  />
                  <SearchIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>

                <Select
                  value={statusFilterOpenAccounts}
                  onValueChange={(value: "all" | OrderStatus) =>
                    setStatusFilterOpenAccounts(value)
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Abiertas</SelectItem>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="closed">Pagadas</SelectItem>
                    <SelectItem value="cancelled">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow 
                        key={order.id}
                        onClick={() => router.push(`/admin/orders/${order.id}`)}
                        className="cursor-pointer hover:bg-muted/60"
                      >
                        <TableCell className="font-mono text-xs">
                          #{order.id}
                        </TableCell>
                        <TableCell>
                          {(order.player?.first_name ?? "") + " " + (order.player?.last_name ?? "") || "Sin nombre"}
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>${order.total_amount.toFixed(2)}</TableCell>
                        <TableCell>
                          {formatDateTime(order.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredOrders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6">
                          No hay cuentas para mostrar.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>

            <CardFooter className="flex justify-between text-sm text-muted-foreground">
              <span>Total cuentas: {filteredOrders.length}</span>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="sales">
          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            {/* Tabla de ventas */}
            <Card className="flex flex-col gap-6 p-6">
              <CardHeader className="p-0 flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-xl font-semibold">
                    Ver ventas
                  </CardTitle>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => router.push("/admin/quick-sale")}
                  >
                    <ShoppingCartIcon className="w-4 h-4 mr-2" />
                    Venta rápida
                  </Button>
                </div>

                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="relative max-w-xs w-full">
                      <Input
                        placeholder="Buscar por cliente o #cuenta..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pr-8"
                      />
                      <SearchIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>

                    <Select
                      value={statusFilterSales}
                      onValueChange={(value: "all" | OrderStatus) =>
                        setStatusFilterSales(value)
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="closed">Pagadas</SelectItem>
                        <SelectItem value="open">Abiertas</SelectItem>
                        <SelectItem value="cancelled">Canceladas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Rango de fechas y horas */}
                  <div className="flex flex-wrap gap-3 items-end">
                    <div className="space-y-1">
                      <Label className="flex items-center gap-1 text-xs">
                        <CalendarIcon className="w-3 h-3" />
                        Desde
                      </Label>
                      <Input
                        type="datetime-local"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="w-48"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="flex items-center gap-1 text-xs">
                        <CalendarIcon className="w-3 h-3" />
                        Hasta
                      </Label>
                      <Input
                        type="datetime-local"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="w-48"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <button
                            onClick={() => handleSort("id")}
                            className="flex items-center gap-1 hover:text-foreground transition-colors"
                          >
                            #
                            {salesSortColumn === "id" ? (
                              salesSortDirection === "asc" ? (
                                <ArrowUpIcon className="w-3 h-3" />
                              ) : (
                                <ArrowDownIcon className="w-3 h-3" />
                              )
                            ) : (
                              <ArrowUpDownIcon className="w-3 h-3 opacity-50" />
                            )}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            onClick={() => handleSort("client")}
                            className="flex items-center gap-1 hover:text-foreground transition-colors"
                          >
                            Cliente
                            {salesSortColumn === "client" ? (
                              salesSortDirection === "asc" ? (
                                <ArrowUpIcon className="w-3 h-3" />
                              ) : (
                                <ArrowDownIcon className="w-3 h-3" />
                              )
                            ) : (
                              <ArrowUpDownIcon className="w-3 h-3 opacity-50" />
                            )}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            onClick={() => handleSort("status")}
                            className="flex items-center gap-1 hover:text-foreground transition-colors"
                          >
                            Estado
                            {salesSortColumn === "status" ? (
                              salesSortDirection === "asc" ? (
                                <ArrowUpIcon className="w-3 h-3" />
                              ) : (
                                <ArrowDownIcon className="w-3 h-3" />
                              )
                            ) : (
                              <ArrowUpDownIcon className="w-3 h-3 opacity-50" />
                            )}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            onClick={() => handleSort("payment_method")}
                            className="flex items-center gap-1 hover:text-foreground transition-colors"
                          >
                            Método de pago
                            {salesSortColumn === "payment_method" ? (
                              salesSortDirection === "asc" ? (
                                <ArrowUpIcon className="w-3 h-3" />
                              ) : (
                                <ArrowDownIcon className="w-3 h-3" />
                              )
                            ) : (
                              <ArrowUpDownIcon className="w-3 h-3 opacity-50" />
                            )}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            onClick={() => handleSort("total")}
                            className="flex items-center gap-1 hover:text-foreground transition-colors"
                          >
                            Total
                            {salesSortColumn === "total" ? (
                              salesSortDirection === "asc" ? (
                                <ArrowUpIcon className="w-3 h-3" />
                              ) : (
                                <ArrowDownIcon className="w-3 h-3" />
                              )
                            ) : (
                              <ArrowUpDownIcon className="w-3 h-3 opacity-50" />
                            )}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            onClick={() => handleSort("date")}
                            className="flex items-center gap-1 hover:text-foreground transition-colors"
                          >
                            Fecha
                            {salesSortColumn === "date" ? (
                              salesSortDirection === "asc" ? (
                                <ArrowUpIcon className="w-3 h-3" />
                              ) : (
                                <ArrowDownIcon className="w-3 h-3" />
                              )
                            ) : (
                              <ArrowUpDownIcon className="w-3 h-3 opacity-50" />
                            )}
                          </button>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedSalesOrders.map((order) => (
                        <TableRow 
                          key={order.id}
                          onClick={() => router.push(`/admin/orders/${order.id}`)}
                          className="cursor-pointer hover:bg-muted/60"
                        >
                          <TableCell className="font-mono text-xs">
                            #{order.id}
                          </TableCell>
                          <TableCell>
                            {(order.player?.first_name ?? "") + " " + (order.player?.last_name ?? "") || "Sin nombre"}
                          </TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>
                            {orderPaymentMethodMap.get(order.id) || "-"}
                          </TableCell>
                          <TableCell>${order.total_amount.toFixed(2)}</TableCell>
                          <TableCell>
                            {order.closed_at 
                              ? formatDateTime(order.closed_at)
                              : formatDateTime(order.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {sortedSalesOrders.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6">
                            No hay ventas para mostrar.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>

              <CardFooter className="flex justify-between text-sm text-muted-foreground">
                <span>Total ventas: {sortedSalesOrders.length}</span>
              </CardFooter>
            </Card>

            {/* Resumen */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Resumen del día</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingTransactions ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2Icon className="h-5 w-5 animate-spin" />
                  </div>
                ) : salesSummary ? (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Cuentas abiertas</span>
                        <span className="text-lg font-semibold">{salesSummary.openedToday}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Cuentas cerradas</span>
                        <span className="text-lg font-semibold">{salesSummary.closedToday}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Ventas rápidas</span>
                        <span className="text-lg font-semibold">{salesSummary.quickSales}</span>
                      </div>
                    </div>

                    <div className="border-t pt-3 space-y-2">
                      <div className="text-sm font-semibold">Ventas por método de pago</div>
                      {Object.keys(salesSummary.salesByPaymentMethod).length > 0 ? (
                        <div className="space-y-1">
                          {Object.entries(salesSummary.salesByPaymentMethod).map(([method, amount]) => (
                            <div key={method} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{method}</span>
                              <span className="font-medium">${Number(amount).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">No hay ventas</div>
                      )}
                    </div>

                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">Total general</span>
                        <span className="text-xl font-bold">${salesSummary.totalSales.toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    Seleccioná un rango de fechas para ver el resumen
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="statistics">
          <Card className="flex flex-col gap-6 p-6">
            <CardHeader className="p-0 flex flex-col gap-4">
              <CardTitle className="text-xl font-semibold">
                Estadísticas de ventas
              </CardTitle>

              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="flex flex-wrap items-end gap-3">
                  <Select
                    value={selectedCategoryId === "all" ? "all" : String(selectedCategoryId)}
                    onValueChange={(value) =>
                      setSelectedCategoryId(value === "all" ? "all" : Number(value))
                    }
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Todas las categorías" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las categorías</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedProductId === "all" ? "all" : String(selectedProductId)}
                    onValueChange={(value) =>
                      setSelectedProductId(value === "all" ? "all" : Number(value))
                    }
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Todos los productos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los productos</SelectItem>
                      {products
                        .filter(p => 
                          selectedCategoryId === "all" || p.category?.id === selectedCategoryId
                        )
                        .map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Rango de fechas */}
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1 text-xs">
                      <CalendarIcon className="w-3 h-3" />
                      Desde
                    </Label>
                    <Input
                      type="date"
                      value={statsFromDate}
                      onChange={(e) => setStatsFromDate(e.target.value)}
                      className="w-40"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1 text-xs">
                      <CalendarIcon className="w-3 h-3" />
                      Hasta
                    </Label>
                    <Input
                      type="date"
                      value={statsToDate}
                      onChange={(e) => setStatsToDate(e.target.value)}
                      className="w-40"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loadingStats ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2Icon className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead className="text-right">Cantidad vendida</TableHead>
                        <TableHead className="text-right">Monto facturado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statistics.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-6">
                            No hay datos para mostrar con los filtros seleccionados.
                          </TableCell>
                        </TableRow>
                      ) : (
                        statistics.map((stat) => (
                          <TableRow key={stat.productId}>
                            <TableCell className="font-medium">{stat.productName}</TableCell>
                            <TableCell>{stat.categoryName ?? "-"}</TableCell>
                            <TableCell className="text-right">{stat.totalQuantity}</TableCell>
                            <TableCell className="text-right">
                              ${stat.totalAmount.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>

            {statistics.length > 0 && (
              <CardFooter className="flex justify-between text-sm text-muted-foreground">
                <span>{statistics.length} productos encontrados</span>
                <span>
                  Total facturado:{" "}
                  <span className="font-semibold">
                    ${statistics.reduce((sum, stat) => sum + stat.totalAmount, 0).toFixed(2)}
                  </span>
                </span>
              </CardFooter>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Nueva cuenta */}
      <Dialog
        open={isNewOrderDialogOpen}
        onOpenChange={(open) => {
          setIsNewOrderDialogOpen(open);
          if (!open) {
            setSelectedPlayerId(null);
            setOrderError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir nueva cuenta</DialogTitle>
            <DialogDescription>
              Seleccioná el cliente para asociar la cuenta del buffet.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-right text-sm font-medium">Cliente</span>
              <div className="col-span-3 flex items-center gap-2">
                <PlayerSearchSelect
                  players={players}
                  value={selectedPlayerId}
                  onValueChange={(playerId) => {
                    setSelectedPlayerId(playerId);
                    setOrderError(null); // Limpiar error al cambiar cliente
                  }}
                  placeholder="Seleccionar cliente"
                  searchPlaceholder="Buscar por nombre o apellido..."
                  disabled={loadingPlayers}
                />

                {/* Botón para crear cliente rápido */}
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  title="Nuevo cliente"
                  onClick={() => setIsNewPlayerDialogOpen(true)}
                >
                  <PlusIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Mostrar error dentro del dialog */}
            {orderError && (
              <div className="col-span-4 rounded-md bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-sm text-destructive font-medium">
                  {orderError}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsNewOrderDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateOrder} 
              disabled={createOrderMutation.isPending || !selectedPlayerId}
            >
              {createOrderMutation.isPending && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Abrir cuenta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Popup rápido de nuevo cliente */}
      <Dialog
        open={isNewPlayerDialogOpen}
        onOpenChange={(open) => {
          setIsNewPlayerDialogOpen(open);
          if (!open) {
            // Limpiar formulario al cerrar
            setNewPlayerFirstName("");
            setNewPlayerLastName("");
            setNewPlayerPhone("");
            setNewPlayerStatus("active");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
            <DialogDescription>
              Cargá rápidamente un cliente para asociarlo a la cuenta.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newPlayerName">Nombre</Label>
              <Input
                id="newPlayerFirstName"
                className="col-span-3"
                placeholder="Nombre del cliente"
                value={newPlayerFirstName}
                onChange={(e) => setNewPlayerFirstName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newPlayerEmail">Apellido</Label>
              <Input
                id="newPlayerLastName"
                className="col-span-3"
                placeholder="Apellido del cliente"
                value={newPlayerLastName}
                onChange={(e) => setNewPlayerLastName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newPlayerPhone">Teléfono</Label>
              <Input
                id="newPlayerPhone"
                className="col-span-3"
                placeholder="Teléfono"
                value={newPlayerPhone}
                onChange={(e) => setNewPlayerPhone(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newPlayerStatus">Estado</Label>
              <Select
                value={newPlayerStatus}
                onValueChange={(value: PlayerStatus) =>
                  setNewPlayerStatus(value)
                }
              >
                <SelectTrigger id="newPlayerStatus" className="col-span-3">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsNewPlayerDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreatePlayer}
              disabled={creatingPlayer || !newPlayerFirstName.trim() || !newPlayerLastName.trim() || !newPlayerPhone.trim()}
            >
              {creatingPlayer && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Guardar cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
