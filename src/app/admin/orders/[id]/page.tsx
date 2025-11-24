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

type OrderStatus = "open" | "closed" | "cancelled";

type OrderItem = {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  product?: {
    name: string;
  } | null;
};

type Order = {
  id: number;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  customer?: {
    name: string;
  } | null;
  items: OrderItem[];
};

type Product = {
  id: number;
  name: string;
  price: number;
};

type PaymentMethod = {
  id: number;
  name: string;
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = Number(params?.id);

  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingItems, setSavingItems] = useState(false);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // UI state para agregar ítem
  const [selectedProductId, setSelectedProductId] = useState<number | "none">(
    "none"
  );
  const [newItemQty, setNewItemQty] = useState<number | "">("");

  // UI pago
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    number | "none"
  >("none");
  
  useEffect(() => {
    if (!orderId || Number.isNaN(orderId)) return;

    const fetchData = async () => {
      try {
        const [orderRes, productsRes, pmRes] = await Promise.all([
          fetch(`/api/orders/${orderId}`),
          fetch("/api/products"),
          fetch("/api/payment-methods?onlyActive=true"),
        ]);

        if (!orderRes.ok) throw new Error("Failed to fetch order");
        const orderData = await orderRes.json();

        let productsData: Product[] = [];
        if (productsRes.ok) {
          productsData = await productsRes.json();
        }

        let pmData: PaymentMethod[] = [];
        if (pmRes.ok) {
          pmData = await pmRes.json();
        }

        setOrder(orderData);
        setProducts(productsData);
        setPaymentMethods(pmData);
      } catch (err) {
        console.error("Error fetching order detail:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orderId]);

  const computedTotal = useMemo(() => {
    if (!order) return 0;
    if (!order.items || order.items.length === 0) return 0;
    return order.items.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0
    );
  }, [order]);

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

  const handleAddItem = useCallback(async () => {
    if (!order || !orderId) return;
    if (selectedProductId === "none") {
      console.error("Elegí un producto");
      return;
    }

    const qty =
      typeof newItemQty === "string" ? Number(newItemQty) : newItemQty;
    if (!qty || qty <= 0) {
      console.error("Cantidad inválida");
      return;
    }

    try {
      setSavingItems(true);

      const payload = {
        productId: Number(selectedProductId),
        quantity: qty,
      };

      const res = await fetch(`/api/orders/${orderId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("Error agregando ítem");
        return;
      }

      const updatedOrder: Order = await res.json();
      setOrder(updatedOrder);
      setSelectedProductId("none");
      setNewItemQty("");
    } catch (err) {
      console.error("Error agregando ítem:", err);
    } finally {
      setSavingItems(false);
    }
  }, [order, orderId, selectedProductId, newItemQty]);

  const updateItemQuantity = useCallback(
    async (item: OrderItem, newQty: number) => {
      if (!order || !orderId) return;
      if (newQty <= 0) {
        // Podríamos borrar el ítem si qty <= 0
        await removeItem(item);
        return;
      }

      try {
        setSavingItems(true);

        const payload = {
          itemId: item.id,
          quantity: newQty,
        };

        const res = await fetch(`/api/orders/${orderId}/items/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          console.error("Error actualizando ítem");
          return;
        }

        const updatedOrder: Order = await res.json();
        setOrder(updatedOrder);
      } catch (err) {
        console.error("Error actualizando ítem:", err);
      } finally {
        setSavingItems(false);
      }
    },
    [order, orderId]
  );

  const removeItem = useCallback(
    async (item: OrderItem) => {
      if (!order || !orderId) return;

      try {
        setSavingItems(true);

        const res = await fetch(
          `/api/orders/${orderId}/items/${item.id}`,
          {
            method: "DELETE",
          }
        );

        if (!res.ok) {
          console.error("Error eliminando ítem");
          return;
        }

        const updatedOrder: Order = await res.json();
        setOrder(updatedOrder);
      } catch (err) {
        console.error("Error eliminando ítem:", err);
      } finally {
        setSavingItems(false);
      }
    },
    [order, orderId]
  );

  const handleCancel = useCallback(async () => {
    if (!order || !orderId) return;
    if (order.status !== "open") {
      console.error("La cuenta no está abierta");
      return;
    }

    try {
      setCancelling(true);

      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
      });

      if (!res.ok) {
        console.error("Error al cancelar la cuenta");
        return;
      }

      const updatedOrder: Order = await res.json();
      setOrder(updatedOrder);
    } catch (err) {
      console.error("Error al cancelar la cuenta:", err);
    } finally {
      setCancelling(false);
    }
  }, [order, orderId]);


  const handlePay = useCallback(async () => {
    if (!order || !orderId) return;
    if (order.status !== "open") {
      console.error("La cuenta no está abierta");
      return;
    }

    if (order.items.length === 0) {
      console.error("No se puede cobrar una cuenta vacía");
      return;
    }

    if (selectedPaymentMethodId === "none") {
      console.error("Elegí un método de pago");
      return;
    }

    try {
      setPaying(true);

      const payload = {
        paymentMethodId: Number(selectedPaymentMethodId),
        amount: computedTotal,
      };

      const res = await fetch(`/api/orders/${orderId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("Error al cobrar la cuenta");
        return;
      }

      const updatedOrder: Order = await res.json();
      setOrder(updatedOrder);
      // podrías redirigir de vuelta a /orders si querés:
      // router.push("/orders");
    } catch (err) {
      console.error("Error al cobrar:", err);
    } finally {
      setPaying(false);
    }
  }, [order, orderId, selectedPaymentMethodId, computedTotal]);

  if (!orderId || Number.isNaN(orderId)) {
    return <div>Invalid order id</div>;
  }

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2Icon className="mx-auto h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (!order) {
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
          <h1 className="text-xl font-semibold">
            Cuenta #{order.id}{" "}
            <span className="text-sm text-muted-foreground">
              {order.customer?.name ?? "Sin nombre"}
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(order.status)}
          <span className="text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleString()}
          </span>
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
                  {order.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6">
                        No hay productos en la cuenta.
                      </TableCell>
                    </TableRow>
                  )}
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product?.name ?? "Producto"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7"
                            disabled={savingItems || order.status !== "open"}
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
                            disabled={savingItems || order.status !== "open"}
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
                          disabled={savingItems || order.status !== "open"}
                          onClick={() => removeItem(item)}
                        >
                          <TrashIcon className="w-4 h-4" />
                          <span className="sr-only">Eliminar</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
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
                  disabled={order.status !== "open"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Elegir producto" />
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
                  disabled={order.status !== "open"}
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
                  savingItems ||
                  order.status !== "open" ||
                  selectedProductId === "none"
                }
              >
                {savingItems && (
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
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>${computedTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>${computedTotal.toFixed(2)}</span>
            </div>

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
                disabled={order.status !== "open"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elegí método de pago" />
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
                order.status !== "open" ||
                order.items.length === 0 ||
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
              disabled={cancelling || paying || order.status !== "open"}
              onClick={handleCancel}
            >
              {cancelling && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Cancelar cuenta
            </Button>

            {order.status !== "open" && (
              <p className="text-xs text-muted-foreground text-center">
                Esta cuenta ya está {order.status === "closed" ? "pagada" : "cancelada"}.
              </p>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
