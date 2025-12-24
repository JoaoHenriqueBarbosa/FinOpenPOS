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
import { Loader2Icon, PlusIcon, SearchIcon, FilePenIcon, ShoppingCartIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { PlayerSearchSelect } from "@/components/player-search-select/PlayerSearchSelect";
import Link from "next/link";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { OrderDTO, OrderStatus } from "@/models/dto/order";
import type { PlayerDTO } from "@/models/dto/player";
import type { PlayerStatus } from "@/models/db/player";
import { ordersService, playersService } from "@/services";

// ---- fetchers ----
async function fetchOrders(): Promise<OrderDTO[]> {
  return ordersService.getAll();
}

async function fetchPlayers(): Promise<PlayerDTO[]> {
  return playersService.getAll(true);
}

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("open");

  const [isNewOrderDialogOpen, setIsNewOrderDialogOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

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

  // toasts de error de carga
  useEffect(() => {
    if (ordersError) toast.error("Error al cargar las cuentas.");
  }, [ordersError]);

  useEffect(() => {
    if (playersError) toast.error("Error al cargar los clientes.");
  }, [playersError]);

  // ---- Filtro en memoria ----
  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== "all" && order.status !== statusFilter) return false;

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

  const globalLoading = loadingOrders || loadingPlayers;

  if (globalLoading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2Icon className="mx-auto h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Card className="flex flex-col gap-6 p-6">
        <CardHeader className="p-0 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-xl font-semibold">
              Cuentas del buffet
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
              value={statusFilter}
              onValueChange={(value: "all" | OrderStatus) =>
                setStatusFilter(value)
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="open">Abiertas</SelectItem>
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
                      {new Date(order.created_at).toLocaleString()}
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
