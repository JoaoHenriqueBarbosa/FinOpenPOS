"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2Icon,
  ArrowLeftIcon,
  SaveIcon,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrderDTO, OrderItemDTO, OrderStatus } from "@/models/dto/order";
import type { ProductDTO } from "@/models/dto/product";
import type { PaymentMethodDTO } from "@/models/dto/payment-method";
import { ordersService, productsService, paymentMethodsService } from "@/services";
import {
  OrderProductSelectorPanel,
  OrderConsumptionPanel,
  OrderSummaryPanel,
} from "@/components/order-items-layout/OrderItemsLayout";
import { formatDateTime } from "@/lib/date-utils";

async function fetchOrder(orderId: number): Promise<OrderDTO> {
  return ordersService.getById(orderId);
}

async function fetchProducts(): Promise<ProductDTO[]> {
  return productsService.getAll();
}

async function fetchPaymentMethods(): Promise<PaymentMethodDTO[]> {
  return paymentMethodsService.getAll(true, "BAR");
}

const aggregateOrderItems = (items: OrderItemDTO[] | undefined): OrderItemDTO[] => {
  if (!items) return [];
  const grouped = new Map<number, OrderItemDTO>();
  const withoutProduct: OrderItemDTO[] = [];

  for (const item of items) {
    const productId = item.product?.id ?? (item as any).product_id;
    if (!productId) {
      withoutProduct.push(item);
      continue;
    }

    const existing = grouped.get(productId);
    if (existing) {
      existing.quantity += item.quantity;
      existing.total_price = existing.unit_price * existing.quantity;
    } else {
      grouped.set(productId, { ...item });
    }
  }

  return [...grouped.values(), ...withoutProduct];
};

const normalizeOrder = (order: OrderDTO): OrderDTO => ({
  ...order,
  items: aggregateOrderItems(order.items),
});

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const orderId = Number(params?.id);

  const [order, setOrder] = useState<OrderDTO | null>(null);

  const lastNormalizedOrderRef = useRef<OrderDTO | null>(null);

  const applyNormalizedOrder = useCallback(
    (updatedOrder: OrderDTO) => {
      const normalized = normalizeOrder(updatedOrder);
      lastNormalizedOrderRef.current = normalized;
      setOrder(normalized);
    },
    [setOrder]
  );

  // Sistema de cola de cambios para guardado manual
  type PendingChange = 
    | { type: 'update'; itemId: number; quantity: number }
    | { type: 'delete'; itemId: number }
    | { type: 'add'; productId: number; quantity: number; tempId: number };
  
  const pendingChangesRef = useRef<PendingChange[]>([]);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [savingChanges, setSavingChanges] = useState(false);


  // UI state para agregar ítem (ya no se usa selectedProductId)
  const [newItemQty, setNewItemQty] = useState<number | "">(1);
  const [moreProductsSelectValue, setMoreProductsSelectValue] = useState<string>("none");

  // UI pago
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    number | "none"
  >("none");

  // Descuentos
  const [discountPercentage, setDiscountPercentage] = useState<number | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number | null>(null);

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

  const normalizedOrderData = useMemo(
    () => (orderData ? normalizeOrder(orderData) : null),
    [orderData]
  );

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

  // Cargar descuentos existentes cuando se carga la orden (solo si está abierta)
  useEffect(() => {
    if (orderData && isOrderOpen) {
      setDiscountPercentage(orderData.discount_percentage ?? null);
      setDiscountAmount(orderData.discount_amount ?? null);
    }
  }, [orderData, isOrderOpen]);

  // Extraer información de pago de la orden (si está cerrada)
  const paymentInfo = useMemo(() => {
    if (!displayOrder || isOrderOpen) return null;
    // La información de pago viene en payment_info desde el endpoint
    return (displayOrder as any).payment_info ?? null;
  }, [displayOrder, isOrderOpen]);

  const computedTotal = useMemo(() => {
    if (!displayOrder) return 0;
    if (!displayOrder.items || (displayOrder.items ?? []).length === 0) return 0;
    return (displayOrder.items ?? []).reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0
    );
  }, [displayOrder]);

  // Calcular descuento y total final
  // Para órdenes cerradas, usar los valores guardados en la orden
  // Para órdenes abiertas, usar los valores del estado local
  const discountValue = useMemo(() => {
    if (!displayOrder) return 0;
    
    // Si la orden está cerrada, usar los valores guardados
    if (!isOrderOpen) {
      const savedDiscountAmount = displayOrder.discount_amount;
      const savedDiscountPercentage = displayOrder.discount_percentage;
      
      if (savedDiscountAmount !== null && savedDiscountAmount !== undefined && savedDiscountAmount > 0) {
        return savedDiscountAmount;
      }
      if (savedDiscountPercentage !== null && savedDiscountPercentage !== undefined && savedDiscountPercentage > 0) {
        return (computedTotal * savedDiscountPercentage) / 100;
      }
      return 0;
    }
    
    // Si la orden está abierta, usar los valores del estado local
    if (discountAmount !== null && discountAmount > 0) {
      return discountAmount;
    }
    if (discountPercentage !== null && discountPercentage > 0) {
      return (computedTotal * discountPercentage) / 100;
    }
    return 0;
  }, [computedTotal, discountPercentage, discountAmount, displayOrder, isOrderOpen]);

  const finalTotal = Math.max(0, computedTotal - discountValue);

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
      applyNormalizedOrder(updatedOrder);
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
      applyNormalizedOrder(updatedOrder);
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
      applyNormalizedOrder(updatedOrder);
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
      applyNormalizedOrder(updatedOrder);
      // Actualizar cache de React Query para que se refleje en toda la app
      queryClient.setQueryData(["order", orderId], updatedOrder);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Cuenta cancelada.");
    },
  });

  // Cobrar cuenta
  const payOrderMutation = useMutation({
    mutationFn: async (params: { 
      paymentMethodId: number; 
      amount: number;
      discountPercentage?: number | null;
      discountAmount?: number | null;
    }) => {
      // Llamar al endpoint directamente para pasar los descuentos
      const res = await fetch(`/api/orders/${orderId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethodId: params.paymentMethodId,
          amount: params.amount,
          discount_percentage: params.discountPercentage,
          discount_amount: params.discountAmount,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Error al cobrar la cuenta");
      }
      return (await res.json()) as OrderDTO;
    },
    onMutate: ({ amount: _amount }) => {
      if (!order && !orderData) return { previousOrder: null };
      const previousOrder = order ?? orderData!;

      setOrder({
        ...previousOrder,
        status: "closed",
        total_amount: finalTotal,
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
      applyNormalizedOrder(updatedOrder);
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
    if (!normalizedOrderData || hasPendingChanges || savingChanges || paying || cancelling) {
      return;
    }

    if (lastNormalizedOrderRef.current === normalizedOrderData) {
      return;
    }

    lastNormalizedOrderRef.current = normalizedOrderData;

    setOrder(normalizedOrderData);
  }, [
    normalizedOrderData,
    hasPendingChanges,
    savingChanges,
    paying,
    cancelling,
  ]);

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
        applyNormalizedOrder(updatedOrder);
        
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

  // Nueva función para agregar producto directamente desde el selector
  // Si viene de "Más productos", usa cantidad 1, sino usa newItemQty
  const handleProductSelect = useCallback((product: ProductDTO, quantity?: number) => {
    if (!displayOrder || !orderId || !order || !isOrderOpen) return;

    const qty = quantity !== undefined ? quantity : (typeof newItemQty === "string" ? Number(newItemQty) : newItemQty || 1);

    if (!qty || qty <= 0) {
      toast.error("Cantidad inválida.");
      return;
    }

    const productIdNumber = product.id;

    // Buscar si ya existe un item con ese producto en la orden
    const existingItem = (order.items ?? []).find(
      (i) => i.product?.id === productIdNumber
    );

    if (existingItem) {
      // Si existe, sumamos la cantidad al mismo ítem usando updateItemQuantity
      updateItemQuantity(existingItem, existingItem.quantity + qty);

      // limpiamos UI (mantener cantidad para siguiente producto)
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

    // Mantener cantidad para siguiente producto

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
    newItemQty,
    updateItemQuantity,
    order,
    isOrderOpen,
  ]);

  // Función legacy para compatibilidad (ya no se usa)
  const handleAddItem = useCallback(() => {
    toast.error("Usá el selector de productos para agregar items.");
  }, []);

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
      amount: finalTotal,
      discountPercentage: discountPercentage,
      discountAmount: discountAmount,
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

  const orderItems = (displayOrder?.items ?? []).map((item) => ({
    id: item.id,
    product: item.product ? { id: item.product.id, name: item.product.name } : null,
    quantity: item.quantity,
    unit_price: item.unit_price,
  }));
  const isOrderLoading = loadingOrder && !displayOrder;

  return (
    <div className="flex flex-col gap-4 p-6 w-full">
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
                  {formatDateTime(displayOrder.created_at)}
                </span>
              )}
            </>
          )}
        </div>
        </div>

      <div className="grid gap-4 lg:grid-cols-[2.5fr_2fr_0.8fr] items-start">
        <OrderProductSelectorPanel
          products={products}
          onProductSelect={handleProductSelect}
          loadingProducts={loadingProducts}
          isEditable={isOrderOpen}
          showMoreProductsSelect={true}
          moreProductsSelectValue={moreProductsSelectValue}
          onMoreProductsSelectChange={(value) => {
            setMoreProductsSelectValue(value);
            if (value !== "none") {
              const product = products.find((p) => p.id === Number(value));
              if (product) {
                handleProductSelect(product, 1);
                setMoreProductsSelectValue("none");
              }
            }
          }}
        />

        <OrderConsumptionPanel
          items={orderItems}
          isLoading={isOrderLoading}
          isEditable={isOrderOpen}
          onUpdateQuantity={(item, newQuantity) => {
            const orderItem = displayOrder?.items?.find((i) => i.id === item.id);
            if (orderItem) {
              updateItemQuantity(orderItem, newQuantity);
            }
          }}
          onRemoveItem={(item) => {
            const orderItem = displayOrder?.items?.find((i) => i.id === item.id);
            if (orderItem) {
              removeItem(orderItem);
            }
          }}
          hasPendingChanges={hasPendingChanges}
          onSaveChanges={handleSaveChanges}
          savingChanges={savingChanges}
        />

        <OrderSummaryPanel
          total={computedTotal}
          finalTotal={finalTotal}
          discountValue={discountValue}
          discountPercentage={isOrderOpen ? discountPercentage : displayOrder?.discount_percentage ?? null}
          discountAmount={isOrderOpen ? discountAmount : displayOrder?.discount_amount ?? null}
          isEditable={isOrderOpen}
          isLoading={isOrderLoading}
          onDiscountPercentageChange={setDiscountPercentage}
          onDiscountAmountChange={setDiscountAmount}
          paymentMethods={paymentMethods}
          selectedPaymentMethodId={selectedPaymentMethodId}
          onPaymentMethodSelect={(id) => setSelectedPaymentMethodId(id)}
          loadingPaymentMethods={loadingPM}
          paymentInfo={paymentInfo}
          onProcess={handlePay}
          onCancel={handleCancel}
          processing={paying}
          cancelling={cancelling}
          isDiscountSectionEnabled={isOrderOpen}
        />
      </div>
    </div>
  );
}
