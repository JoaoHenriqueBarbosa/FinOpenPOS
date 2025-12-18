"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Loader2Icon,
  ArrowLeftIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  SaveIcon,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrderDTO, OrderItemDTO, OrderStatus } from "@/models/dto/order";
import type { ProductDTO } from "@/models/dto/product";
import type { PaymentMethodDTO } from "@/models/dto/payment-method";
import { ordersService, productsService, paymentMethodsService } from "@/services";

async function fetchOrder(orderId: number): Promise<OrderDTO> {
  return ordersService.getById(orderId);
}

async function fetchProducts(): Promise<ProductDTO[]> {
  return productsService.getAll();
}

async function fetchPaymentMethods(): Promise<PaymentMethodDTO[]> {
  return paymentMethodsService.getAll(true, "BAR");
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const orderId = Number(params?.id);

  const [order, setOrder] = useState<OrderDTO | null>(null);

  // Sistema de cola de cambios para guardado manual
  type PendingChange = 
    | { type: 'update'; itemId: number; quantity: number }
    | { type: 'delete'; itemId: number }
    | { type: 'add'; productId: number; quantity: number; tempId: number };
  
  const pendingChangesRef = useRef<PendingChange[]>([]);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [savingChanges, setSavingChanges] = useState(false);


  // UI state para agregar ítem
  const [selectedProductId, setSelectedProductId] = useState<number | "none">(
    "none"
  );
  const [newItemQty, setNewItemQty] = useState<number | "">("");

  // UI pago
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    number | "none"
  >("none");

  // Ya no necesitamos estados separados - usamos isPending de las mutations

  // ---- Queries ----
  const {
    data: orderData,
    isLoading: loadingOrder,
    isError: orderError,
  } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetchOrder(orderId),
    enabled: !!orderId,
    staleTime: 1000 * 30, // 30 segundos - las órdenes pueden cambiar frecuentemente
  });

  // sincronizar order local cuando llega de la API
  // Solo actualizar si no hay cambios pendientes, no se está guardando, y el order local no está más actualizado
  // NOTA: Este useEffect se mueve después de las declaraciones de paying y cancelling

  // Determinar si la orden está abierta para habilitar queries condicionales
  // Usamos orderData directamente para evitar dependencias circulares
  const isOrderOpenForQueries = orderData?.status === "open";
  const hasItemsForQueries = (orderData?.items?.length ?? 0) > 0;

  // Solo cargar products cuando la orden esté abierta (se necesitan para agregar items)
  const {
    data: products = [],
    isLoading: loadingProducts,
    isError: productsError,
  } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
    enabled: isOrderOpenForQueries, // Solo cargar si la orden está abierta
    staleTime: 1000 * 60 * 5, // 5 minutos - los productos no cambian frecuentemente
  });

  // Solo cargar payment methods cuando la orden esté abierta y tenga items (se necesitan para pagar)
  const {
    data: paymentMethods = [],
    isLoading: loadingPM,
    isError: pmError,
  } = useQuery({
    queryKey: ["payment-methods", "BAR"],
    queryFn: fetchPaymentMethods,
    enabled: isOrderOpenForQueries && hasItemsForQueries,
    staleTime: 1000 * 60 * 10, // 10 minutos - los métodos de pago cambian raramente
  });

  // toasts de error de carga
  useEffect(() => {
    if (orderError) toast.error("Error al cargar la cuenta.");
  }, [orderError]);

  useEffect(() => {
    if (productsError) toast.error("Error al cargar los productos.");
  }, [productsError]);

  useEffect(() => {
    if (pmError) toast.error("Error al cargar los métodos de pago.");
  }, [pmError]);

  // Order para mostrar en UI: estado local (optimistic) o, si todavía no, lo que vino del server
  const displayOrder = order ?? orderData ?? null;
  const isOrderOpen = displayOrder?.status === "open";

  const computedTotal = useMemo(() => {
    if (!displayOrder) return 0;
    if (!displayOrder.items || (displayOrder.items ?? []).length === 0) return 0;
    return (displayOrder.items ?? []).reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0
    );
  }, [displayOrder]);

  // ---- Mutations con UI-first ----

  // Agregar ítem
  const addItemMutation = useMutation({
    mutationFn: async (params: { productId: number; quantity: number; tempId: number }) => {
      const res = await fetch(`/api/orders/${orderId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: params.productId,
          quantity: params.quantity,
        }),
      });
      if (!res.ok) {
        throw new Error("Error agregando ítem");
      }
      return (await res.json()) as OrderDTO;
    },
    // No hacemos optimistic update aquí porque ya lo hacemos en handleAddItem
    onError: (err, params) => {
      // Si falla, remover el item temporal de la UI
      if (order && order.items) {
        setOrder({
          ...order,
          items: (order.items ?? []).filter((i) => i.id !== params.tempId),
        });
      }
      toast.error(
        err instanceof Error ? err.message : "Error agregando ítem."
      );
    },
    onSuccess: (updatedOrder) => {
      // Sincronizar con la respuesta del servidor
      setOrder(updatedOrder);
    },
  });

  // Actualizar cantidad
  const updateItemMutation = useMutation({
    mutationFn: async (params: { item: OrderItemDTO; newQty: number }) => {
      const { item, newQty } = params;
      const res = await fetch(`/api/orders/${orderId}/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          quantity: newQty,
        }),
      });
      if (!res.ok) {
        throw new Error("Error actualizando ítem");
      }
      return (await res.json()) as OrderDTO;
    },
    onMutate: ({ item, newQty }) => {
      if (!order && !orderData) return { previousOrder: null };
      const previousOrder = order ?? orderData!;

      // Actualizar UI inmediatamente
      setOrder({
        ...previousOrder,
        items: (previousOrder.items ?? []).map((i) =>
          i.id === item.id ? { ...i, quantity: newQty } : i
        ),
      });

      return { previousOrder };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previousOrder) {
        setOrder(ctx.previousOrder);
      }
      toast.error(
        err instanceof Error ? err.message : "Error actualizando ítem."
      );
    },
    onSuccess: (updatedOrder) => {
      setOrder(updatedOrder);
    },
  });

  // Eliminar ítem
  const removeItemMutation = useMutation({
    mutationFn: async (item: OrderItemDTO) => {
      const res = await fetch(`/api/orders/${orderId}/items/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Error eliminando ítem");
      }
      return (await res.json()) as OrderDTO;
    },
    // No hacemos optimistic update aquí porque ya lo hacemos en removeItem
    // antes de llamar a la mutation
    onError: (err, item) => {
      // Si falla, restaurar el item en la UI
      if (order && order.items) {
        // Agregar el item de vuelta a la lista
        const itemExists = (order.items ?? []).some((i) => i.id === item.id);
        if (!itemExists) {
          setOrder({
            ...order,
            items: [...(order.items ?? []), item].sort((a, b) => a.id - b.id),
          });
        }
      }
      toast.error(
        err instanceof Error ? err.message : "Error eliminando ítem."
      );
    },
    onSuccess: (updatedOrder) => {
      // Sincronizar con la respuesta del servidor
      setOrder(updatedOrder);
    },
  });

  // Cancelar cuenta
  const cancelOrderMutation = useMutation({
    mutationFn: async () => {
      return await ordersService.cancel(orderId);
    },
    onMutate: () => {
      if (!order && !orderData) return { previousOrder: null };
      const previousOrder = order ?? orderData!;

      setOrder({
        ...previousOrder,
        status: "cancelled",
      });

      return { previousOrder };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previousOrder) {
        setOrder(ctx.previousOrder);
      }
      toast.error(
        err instanceof Error ? err.message : "Error al cancelar la cuenta."
      );
    },
    onSuccess: (updatedOrder) => {
      // Actualizar estado local inmediatamente
      setOrder(updatedOrder);
      // Actualizar cache de React Query para que se refleje en toda la app
      queryClient.setQueryData(["order", orderId], updatedOrder);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Cuenta cancelada.");
    },
  });

  // Cobrar cuenta
  const payOrderMutation = useMutation({
    mutationFn: async (params: { paymentMethodId: number; amount: number }) => {
      return await ordersService.pay(orderId, params.paymentMethodId);
    },
    onMutate: ({ amount }) => {
      if (!order && !orderData) return { previousOrder: null };
      const previousOrder = order ?? orderData!;

      setOrder({
        ...previousOrder,
        status: "closed",
        total_amount: amount,
      });

      return { previousOrder };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previousOrder) {
        setOrder(ctx.previousOrder);
      }
      toast.error(
        err instanceof Error ? err.message : "Error al cobrar la cuenta."
      );
    },
    onSuccess: (updatedOrder) => {
      // Actualizar estado local inmediatamente
      setOrder(updatedOrder);
      // Actualizar cache de React Query para que se refleje en toda la app
      queryClient.setQueryData(["order", orderId], updatedOrder);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Cuenta cobrada y cerrada.");
      // si querés redirigir:
      // router.push("/admin/orders");
    },
  });

  // flags combinados
  const paying = payOrderMutation.isPending;
  const cancelling = cancelOrderMutation.isPending;

  // sincronizar order local cuando llega de la API (después de declarar paying y cancelling)
  // Solo actualizar si no hay cambios pendientes, no se está guardando, y el order local no está más actualizado
  useEffect(() => {
    if (orderData && !hasPendingChanges && !savingChanges && !paying && !cancelling) {
      // Solo actualizar si no tenemos order local o si el orderData es más reciente
      // (comparar por id para evitar sobrescribir cambios locales)
      // También verificar que no estamos en medio de una actualización optimista
      if (!order || (orderData.id === order.id && orderData !== order)) {
        // Solo actualizar si el orderData tiene items (para evitar sobrescribir con datos incompletos)
        // Y si el status no cambió (para evitar sobrescribir cuando se cierra la cuenta)
        if (orderData.items && orderData.items.length >= 0) {
          // Si tenemos un order local y el status cambió, no sobrescribir (ya se actualizó optimísticamente)
          if (!order || order.status === orderData.status) {
            setOrder(orderData);
          }
        }
      }
    }
  }, [orderData, hasPendingChanges, savingChanges, order, paying, cancelling]);

  // Función para guardar todos los cambios pendientes - envía toda la orden en una sola petición
  // Actualización optimista: actualiza UI inmediatamente y envía PATCH async
  const handleSaveChanges = useCallback(async () => {
    if (!order || !orderId) {
      return;
    }

    // Guardar estado anterior para revertir en caso de error
    const previousOrder = { ...order };
    const previousItems = [...(order.items ?? [])];

    // Preparar items para enviar basándose en el estado actual de order.items
    // Esto incluye TODOS los items que están en el estado local (incluyendo los que se agregaron optimísticamente)
    // y excluye los que se eliminaron optimísticamente (ya no están en el array)
    const itemsToSend = (order.items ?? [])
      .filter((item) => {
        // Solo incluir items que tienen un producto válido (puede venir como product.id o product_id) y cantidad > 0
        const productId = item.product?.id || (item as any).product_id;
        return productId && item.quantity > 0;
      })
      .map((item) => {
        // Obtener product_id de item.product?.id o de item.product_id (por si acaso)
        const productId = item.product?.id || (item as any).product_id;
        if (!productId) {
          console.error("Item sin product_id válido:", item);
          throw new Error(`Item sin product_id válido`);
        }
        
        return {
          // IDs temporales negativos se envían como undefined para que se creen nuevos items
          id: item.id > 0 ? item.id : undefined,
          product_id: productId,
          quantity: item.quantity,
          unit_price: item.unit_price,
        };
      });

    // Actualización optimista: limpiar cambios pendientes y actualizar UI inmediatamente
    pendingChangesRef.current = [];
    setHasPendingChanges(false);
    setSavingChanges(true);

    // Enviar actualización al servidor de forma asíncrona
    ordersService.update(orderId, { items: itemsToSend })
      .then((updatedOrder) => {
        // Sincronizar con la respuesta del servidor
        setOrder(updatedOrder);
        
        // Actualizar el cache directamente con la respuesta del servidor (sin invalidar para evitar refetch)
        queryClient.setQueryData(["order", orderId], updatedOrder);
        
        // Invalidar solo la lista de orders (no la orden individual para evitar refetch que cause "va y viene")
        queryClient.invalidateQueries({ queryKey: ["orders"] });
        
        toast.success("Cambios guardados correctamente");
      })
      .catch((error) => {
        // En caso de error, restaurar orden anterior
        setOrder(previousOrder);
        pendingChangesRef.current = [];
        setHasPendingChanges(true);
        toast.error(
          error instanceof Error ? error.message : "Error al guardar cambios. Intenta nuevamente."
        );
      })
      .finally(() => {
        setSavingChanges(false);
      });
  }, [order, orderId, queryClient]);

  // Detectar Enter para guardar cambios (solo si la orden está abierta)
  useEffect(() => {
    if (!isOrderOpen) return; // No escuchar Enter si la orden está cerrada
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter para guardar (solo si no estamos en un input/textarea)
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && hasPendingChanges) {
          e.preventDefault();
          handleSaveChanges();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasPendingChanges, handleSaveChanges, isOrderOpen]);

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

  const updateItemQuantity = useCallback(
    (item: OrderItemDTO, newQty: number) => {
      if (!displayOrder || !orderId || !isOrderOpen) return;
      if (newQty <= 0) {
        removeItem(item);
        return;
      }

      // Actualizar UI inmediatamente (optimistic update)
      if (order) {
        setOrder({
          ...order,
          items: (order.items ?? []).map((i) =>
            i.id === item.id ? { ...i, quantity: newQty } : i
          ),
        });
      }

      // Agregar a la cola de cambios pendientes
      // Si ya hay un cambio pendiente para este item, reemplazarlo
      const existingIndex = pendingChangesRef.current.findIndex(
        (c) => c.type === 'update' && c.itemId === item.id
      );
      
      if (existingIndex >= 0) {
        pendingChangesRef.current[existingIndex] = { type: 'update', itemId: item.id, quantity: newQty };
      } else {
        pendingChangesRef.current.push({ type: 'update', itemId: item.id, quantity: newQty });
      }

      setHasPendingChanges(true);
    },
    [displayOrder, orderId, order, isOrderOpen]
  );

  const handleAddItem = useCallback(() => {
    if (!displayOrder || !orderId || !order || !isOrderOpen) return;

    if (selectedProductId === "none") {
      toast.error("Elegí un producto.");
      return;
    }

    const qty =
      typeof newItemQty === "string" ? Number(newItemQty) : newItemQty;

    if (!qty || qty <= 0) {
      toast.error("Cantidad inválida.");
      return;
    }

    const productIdNumber = Number(selectedProductId);
    const product = products.find((p) => p.id === productIdNumber);
    if (!product) {
      toast.error("Producto no encontrado.");
      return;
    }

    // Buscar si ya existe un item con ese producto en la orden
    const existingItem = (order.items ?? []).find(
      (i) => i.product?.id === productIdNumber
    );

    if (existingItem) {
      // Si existe, sumamos la cantidad al mismo ítem usando updateItemQuantity
      updateItemQuantity(existingItem, existingItem.quantity + qty);

      // limpiamos UI
      setSelectedProductId("none");
      setNewItemQty("");
      return;
    }

    // Si no existe, crear item optimista y agregar a la cola
    const tempId =
      -Math.floor(Math.random() * 1_000_000) -
      ((order.items ?? []).length);

    const optimisticItem: OrderItemDTO = {
      id: tempId,
      quantity: qty,
      unit_price: product.price,
      total_price: product.price * qty,
      created_at: new Date().toISOString(),
      product: { id: product.id, name: product.name },
    };

    // Actualizar UI inmediatamente
    setOrder({
      ...order,
      items: [...(order.items ?? []), optimisticItem],
    });

    // Limpiar UI inmediatamente
    setSelectedProductId("none");
    setNewItemQty("");

    // Agregar a la cola de cambios pendientes
    pendingChangesRef.current.push({ 
      type: 'add', 
      productId: productIdNumber, 
      quantity: qty, 
      tempId 
    });
    setHasPendingChanges(true);
  }, [
    displayOrder,
    orderId,
    selectedProductId,
    newItemQty,
    addItemMutation,
    updateItemQuantity,
    order,
    products,
    isOrderOpen,
  ]);

  // Limpiar cambios pendientes al desmontar (opcional: podrías guardar antes de desmontar)
  useEffect(() => {
    return () => {
      // Si hay cambios pendientes al desmontar, podrías guardarlos automáticamente
      // o mostrar una advertencia. Por ahora solo limpiamos.
      pendingChangesRef.current = [];
    };
  }, []);

  const removeItem = useCallback(
    (item: OrderItemDTO) => {
      if (!displayOrder || !orderId || !isOrderOpen) return;

      // Actualizar UI inmediatamente (optimistic update)
      if (order) {
        setOrder({
          ...order,
          items: (order.items ?? []).filter((i) => i.id !== item.id),
        });
      }

      // Remover cualquier cambio pendiente de este item (update o delete)
      pendingChangesRef.current = pendingChangesRef.current.filter(
        (c) => !(c.type === 'update' && c.itemId === item.id) && !(c.type === 'delete' && c.itemId === item.id)
      );

      // Agregar eliminación a la cola
      pendingChangesRef.current.push({ type: 'delete', itemId: item.id });
      setHasPendingChanges(true);
    },
    [displayOrder, orderId, order, isOrderOpen]
  );

  const handleCancel = useCallback(() => {
    if (!displayOrder || !orderId) return;
    if (displayOrder.status !== "open") {
      toast.error("La cuenta no está abierta.");
      return;
    }

    cancelOrderMutation.mutate();
  }, [displayOrder, orderId, cancelOrderMutation]);

  const handlePay = useCallback(() => {
    if (!displayOrder || !orderId) return;
    if (displayOrder.status !== "open") {
      toast.error("La cuenta no está abierta.");
      return;
    }

    if (!displayOrder.items || displayOrder.items.length === 0) {
      toast.error("No se puede cobrar una cuenta vacía.");
      return;
    }

    if (selectedPaymentMethodId === "none") {
      toast.error("Elegí un método de pago.");
      return;
    }

    payOrderMutation.mutate({
      paymentMethodId: Number(selectedPaymentMethodId),
      amount: computedTotal,
    });
  }, [
    displayOrder,
    orderId,
    selectedPaymentMethodId,
    computedTotal,
    payOrderMutation,
  ]);

  if (!orderId || Number.isNaN(orderId)) {
    return <div>Invalid order id</div>;
  }

  // Si terminó de cargar y no hay cuenta → mensaje de no encontrado
  if (!displayOrder && !loadingOrder) {
    return (
      <div className="p-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => router.push("/admin/orders")}
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Volver a cuentas
        </Button>
        <p>No se encontró la cuenta.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/orders")}
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            {loadingOrder && !displayOrder ? (
              <Skeleton className="h-6 w-40" />
            ) : (
              <>
                Cuenta #{displayOrder?.id}{" "}
                <span className="text-sm text-muted-foreground">
                  {displayOrder?.player
                    ? `${displayOrder.player.first_name} ${displayOrder.player.last_name}`
                    : "Sin nombre"}
                </span>
              </>
            )}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {loadingOrder && !displayOrder ? (
            <Skeleton className="h-4 w-40" />
          ) : (
            <>
              {displayOrder && getStatusBadge(displayOrder.status)}
              {displayOrder && (
                <span className="text-xs text-muted-foreground">
                  {new Date(displayOrder.created_at).toLocaleString()}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr_1fr] items-start">
        {/* Items de la cuenta */}
        <Card className={!isOrderOpen ? "opacity-75" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Consumos</CardTitle>
                <CardDescription>
                  {isOrderOpen 
                    ? "Agregá productos y ajustá cantidades de esta cuenta."
                    : "Esta cuenta está cerrada. No se pueden realizar modificaciones."}
                </CardDescription>
              </div>
              {hasPendingChanges && isOrderOpen && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                  Cambios pendientes
                </Badge>
              )}
              {!isOrderOpen && (
                <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">
                  {displayOrder?.status === "closed" ? "Pagada" : "Cancelada"}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="w-[120px]">Cantidad</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Subtotal</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingOrder && !displayOrder ? (
                    // Skeleton rows mientras carga la order
                    <>
                      {[1, 2, 3].map((i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Skeleton className="h-4 w-32" />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-7 w-7" />
                              <Skeleton className="h-4 w-8" />
                              <Skeleton className="h-7 w-7" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-16" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-16" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-4" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ) : displayOrder && (!displayOrder.items || displayOrder.items.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6">
                        No hay productos en la cuenta.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (displayOrder?.items ?? []).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.product?.name ?? "Producto"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              disabled={!isOrderOpen}
                              onClick={() =>
                                updateItemQuantity(item, item.quantity - 1)
                              }
                            >
                              <MinusIcon className="w-3 h-3" />
                            </Button>
                            <span className="w-8 text-center">
                              {item.quantity}
                            </span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              disabled={!isOrderOpen}
                              onClick={() =>
                                updateItemQuantity(item, item.quantity + 1)
                              }
                            >
                              <PlusIcon className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>${item.unit_price.toFixed(2)}</TableCell>
                        <TableCell>
                          ${(item.unit_price * item.quantity).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={!isOrderOpen}
                            onClick={() => removeItem(item)}
                          >
                            <TrashIcon className="w-4 h-4" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 border-t pt-4">
            {/* Botón de guardar cambios - grande y visible */}
            {hasPendingChanges && (
              <Button
                size="lg"
                className="w-full h-12 text-base font-semibold"
                onClick={handleSaveChanges}
                disabled={savingChanges || !isOrderOpen}
              >
                {savingChanges ? (
                  <>
                    <Loader2Icon className="mr-2 h-5 w-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <SaveIcon className="mr-2 h-5 w-5" />
                    Guardar cambios (Enter)
                  </>
                )}
              </Button>
            )}
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-2 min-w-[220px]">
                <Label>Producto</Label>
                <Select
                  value={
                    selectedProductId === "none"
                      ? "none"
                      : String(selectedProductId)
                  }
                  onValueChange={(value) => {
                    if (value === "none") setSelectedProductId("none");
                    else setSelectedProductId(Number(value));
                  }}
                  disabled={!isOrderOpen || loadingProducts}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingProducts
                          ? "Cargando productos..."
                          : "Elegir producto"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seleccionar...</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name} (${p.price.toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2 w-24">
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  min={1}
                  value={newItemQty}
                  disabled={!isOrderOpen}
                  onChange={(e) =>
                    setNewItemQty(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                />
              </div>
              <Button
                className="mt-6"
                onClick={handleAddItem}
                disabled={
                  !isOrderOpen ||
                  selectedProductId === "none"
                }
              >
                Agregar
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* Resumen y pago */}
        <Card className={!isOrderOpen ? "opacity-75" : ""}>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
            <CardDescription>
              {isOrderOpen 
                ? "Revisá el total y registrá el pago para cerrar la cuenta."
                : "Esta cuenta está cerrada. No se pueden realizar modificaciones."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingOrder && !displayOrder ? (
              <>
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <Skeleton className="h-5 w-20" />
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${computedTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>${computedTotal.toFixed(2)}</span>
                </div>
              </>
            )}

            <div className="h-px bg-border my-2" />

            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Select
                value={
                  selectedPaymentMethodId === "none"
                    ? "none"
                    : String(selectedPaymentMethodId)
                }
                onValueChange={(value) => {
                  if (value === "none") setSelectedPaymentMethodId("none");
                  else setSelectedPaymentMethodId(Number(value));
                }}
                disabled={!isOrderOpen || loadingPM}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingPM
                        ? "Cargando métodos de pago..."
                        : "Elegí método de pago"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Seleccionar...</SelectItem>
                  {paymentMethods.map((pm) => (
                    <SelectItem key={pm.id} value={String(pm.id)}>
                      {pm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button
              className="w-full"
              disabled={
                paying ||
                !isOrderOpen ||
                !displayOrder ||
                !displayOrder.items || displayOrder.items.length === 0 ||
                selectedPaymentMethodId === "none"
              }
              onClick={handlePay}
            >
              {paying && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Cobrar y cerrar cuenta
            </Button>

            <Button
              className="w-full"
              variant="outline"
              disabled={cancelling || paying || !isOrderOpen}
              onClick={handleCancel}
            >
              {cancelling && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Cancelar cuenta
            </Button>

            {displayOrder && displayOrder.status !== "open" && (
              <p className="text-xs text-muted-foreground text-center">
                Esta cuenta ya está{" "}
                {displayOrder.status === "closed" ? "pagada" : "cancelada"}.
              </p>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
