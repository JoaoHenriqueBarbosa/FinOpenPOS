"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrderDTO, OrderItemDTO, OrderStatus } from "@/models/dto/order";
import type { ProductDTO } from "@/models/dto/product";
import type { PaymentMethodDTO } from "@/models/dto/payment-method";

async function fetchOrder(orderId: number): Promise<OrderDTO> {
  const res = await fetch(`/api/orders/${orderId}`);
  if (!res.ok) throw new Error("No se pudo cargar la cuenta");
  return res.json();
}

async function fetchProducts(): Promise<ProductDTO[]> {
  const res = await fetch("/api/products");
  if (!res.ok) throw new Error("No se pudieron cargar los productos");
  return res.json();
}

async function fetchPaymentMethods(): Promise<PaymentMethodDTO[]> {
  const res = await fetch("/api/payment-methods?onlyActive=true&scope=BAR");
  if (!res.ok) throw new Error("No se pudieron cargar los métodos de pago");
  return res.json();
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = Number(params?.id);

  const [order, setOrder] = useState<OrderDTO | null>(null);

  // UI state para agregar ítem
  const [selectedProductId, setSelectedProductId] = useState<number | "none">(
    "none"
  );
  const [newItemQty, setNewItemQty] = useState<number | "">("");

  // UI pago
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    number | "none"
  >("none");

  // flags por ítem
  const [updatingItemId, setUpdatingItemId] = useState<number | null>(null);
  const [removingItemId, setRemovingItemId] = useState<number | null>(null);

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
  useEffect(() => {
    if (orderData) {
      setOrder(orderData);
    }
  }, [orderData]);

  // Determinar si la orden está abierta para habilitar queries condicionales
  // Usamos orderData directamente para evitar dependencias circulares
  const isOrderOpenForQueries = (orderData?.status === "open") ?? false;
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
    if (!displayOrder.items || displayOrder.items.length === 0) return 0;
    return displayOrder.items.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0
    );
  }, [displayOrder]);

  // ---- Mutations con UI-first ----

  // Agregar ítem
  const addItemMutation = useMutation({
    mutationFn: async (params: { productId: number; quantity: number }) => {
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
    onMutate: ({ productId, quantity }) => {
      if (!order && !orderData) return { previousOrder: null };

      const previousOrder = order ?? orderData!;
      const product = products.find((p) => p.id === productId);
      if (!product) return { previousOrder };

      // id temporal negativo
      const tempId =
        -Math.floor(Math.random() * 1_000_000) -
        (previousOrder.items.length ? previousOrder.items.length : 0);

      const optimisticItem: OrderItemDTO = {
        id: tempId,
        product_id: product.id,
        quantity,
        unit_price: product.price,
        product: { name: product.name },
      };

      setOrder({
        ...previousOrder,
        items: [...previousOrder.items, optimisticItem],
      });

      setSelectedProductId("none");
      setNewItemQty("");

      return { previousOrder };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previousOrder) {
        setOrder(ctx.previousOrder);
      }
      toast.error(
        err instanceof Error ? err.message : "Error agregando ítem."
      );
    },
    onSuccess: (updatedOrder) => {
      // sincronizamos con lo que diga el backend
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

      setUpdatingItemId(item.id);

      setOrder({
        ...previousOrder,
        items: previousOrder.items.map((i) =>
          i.id === item.id ? { ...i, quantity: newQty } : i
        ),
      });

      return { previousOrder };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previousOrder) {
        setOrder(ctx.previousOrder);
      }
      setUpdatingItemId(null);
      toast.error(
        err instanceof Error ? err.message : "Error actualizando ítem."
      );
    },
    onSuccess: (updatedOrder) => {
      setOrder(updatedOrder);
      setUpdatingItemId(null);
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
    onMutate: (item) => {
      if (!order && !orderData) return { previousOrder: null };
      const previousOrder = order ?? orderData!;

      setRemovingItemId(item.id);

      setOrder({
        ...previousOrder,
        items: previousOrder.items.filter((i) => i.id !== item.id),
      });

      return { previousOrder };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previousOrder) {
        setOrder(ctx.previousOrder);
      }
      setRemovingItemId(null);
      toast.error(
        err instanceof Error ? err.message : "Error eliminando ítem."
      );
    },
    onSuccess: (updatedOrder) => {
      setOrder(updatedOrder);
      setRemovingItemId(null);
    },
  });

  // Cancelar cuenta
  const cancelOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Error al cancelar la cuenta");
      }
      return (await res.json()) as OrderDTO;
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
      setOrder(updatedOrder);
      toast.success("Cuenta cancelada.");
    },
  });

  // Cobrar cuenta
  const payOrderMutation = useMutation({
    mutationFn: async (params: { paymentMethodId: number; amount: number }) => {
      const res = await fetch(`/api/orders/${orderId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethodId: params.paymentMethodId,
          amount: params.amount,
        }),
      });
      if (!res.ok) {
        throw new Error("Error al cobrar la cuenta");
      }
      return (await res.json()) as OrderDTO;
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
      setOrder(updatedOrder);
      toast.success("Cuenta cobrada y cerrada.");
      // si querés redirigir:
      // router.push("/admin/orders");
    },
  });

  // flags combinados
  const savingItemsAdd = addItemMutation.isPending;
  const paying = payOrderMutation.isPending;
  const cancelling = cancelOrderMutation.isPending;

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

  const handleAddItem = useCallback(() => {
    if (!displayOrder || !orderId) return;

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

    // Buscar si ya existe un item con ese producto en la orden
    const existingItem = displayOrder.items.find(
      (i) => i.product_id === productIdNumber
    );

    if (existingItem) {
      // Si existe, sumamos la cantidad al mismo ítem
      updateItemMutation.mutate({
        item: existingItem,
        newQty: existingItem.quantity + qty,
      });

      // limpiamos UI
      setSelectedProductId("none");
      setNewItemQty("");
      return;
    }

    // Si no existe, creamos un nuevo order_item
    addItemMutation.mutate({
      productId: productIdNumber,
      quantity: qty,
    });
  }, [
    displayOrder,
    orderId,
    selectedProductId,
    newItemQty,
    addItemMutation,
    updateItemMutation,
  ]);

  const updateItemQuantity = useCallback(
    (item: OrderItem, newQty: number) => {
      if (!displayOrder || !orderId) return;
      if (newQty <= 0) {
        removeItemMutation.mutate(item);
        return;
      }

      updateItemMutation.mutate({ item, newQty });
    },
    [displayOrder, orderId, updateItemMutation, removeItemMutation]
  );

  const removeItem = useCallback(
    (item: OrderItem) => {
      if (!displayOrder || !orderId) return;
      removeItemMutation.mutate(item);
    },
    [displayOrder, orderId, removeItemMutation]
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

    if (displayOrder.items.length === 0) {
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
        <Card>
          <CardHeader>
            <CardTitle>Consumos</CardTitle>
            <CardDescription>
              Agregá productos y ajustá cantidades de esta cuenta.
            </CardDescription>
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
                  ) : displayOrder && displayOrder.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6">
                        No hay productos en la cuenta.
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayOrder?.items.map((item) => (
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
                              disabled={
                                !isOrderOpen ||
                                updatingItemId === item.id ||
                                removingItemId === item.id
                              }
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
                              disabled={
                                !isOrderOpen ||
                                updatingItemId === item.id ||
                                removingItemId === item.id
                              }
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
                            disabled={!isOrderOpen || removingItemId === item.id}
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
                  savingItemsAdd ||
                  !isOrderOpen ||
                  selectedProductId === "none"
                }
              >
                {savingItemsAdd && (
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                )}
                Agregar
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* Resumen y pago */}
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
            <CardDescription>
              Revisá el total y registrá el pago para cerrar la cuenta.
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
                displayOrder.items.length === 0 ||
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
