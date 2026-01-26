"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Loader2Icon,
  ArrowLeftIcon,
  ShoppingCartIcon,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ProductDTO } from "@/models/dto/product";
import type { PaymentMethodDTO } from "@/models/dto/payment-method";
import { productsService, paymentMethodsService, playersService, ordersService } from "@/services";
import type { PlayerDTO } from "@/models/dto/player";
import { OrderItemsLayout } from "@/components/order-items-layout/OrderItemsLayout";

// Función para obtener o crear el cliente genérico de venta rápida
async function getOrCreateQuickSalePlayer(): Promise<PlayerDTO> {
  // Primero intentar buscar un cliente existente llamado "Venta rápida"
  const players = await playersService.getAll("active");
  const quickSalePlayer = players.find(
    (p) => p.first_name === "Venta rápida" && (p.last_name === "" || p.last_name === "Cliente ocasional")
  );

  if (quickSalePlayer) {
    return quickSalePlayer;
  }

  // Si no existe, crearlo
  // Nota: last_name es obligatorio en el API, así que usamos un valor válido
  return await playersService.create({
    first_name: "Venta rápida",
    last_name: "Cliente ocasional",
    phone: "0000000000",
    status: "active",
  });
}

async function fetchProducts(): Promise<ProductDTO[]> {
  return productsService.getAll();
}

async function fetchPaymentMethods(): Promise<PaymentMethodDTO[]> {
  return paymentMethodsService.getAll(true, "BAR");
}

interface CartItem {
  product: ProductDTO;
  quantity: number;
}

export default function QuickSalePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<number | "none">("none");
  const [isProcessing, setIsProcessing] = useState(false);

  // Cargar cliente genérico
  const { 
    data: quickSalePlayer,
    isLoading: loadingPlayer, 
    isError: playerError,
    error: playerErrorDetails 
  } = useQuery({
    queryKey: ["quick-sale-player"],
    queryFn: getOrCreateQuickSalePlayer,
    staleTime: 1000 * 60 * 60, // 1 hora - el cliente genérico no cambia
  });

  // Manejar errores de carga del cliente genérico
  useEffect(() => {
    if (playerError) {
      console.error("Error loading quick sale player:", playerErrorDetails);
      toast.error("Error al cargar el cliente genérico. Por favor, recargá la página.");
    }
  }, [playerError, playerErrorDetails]);

  // Cargar productos
  const {
    data: products = [],
    isLoading: loadingProducts,
  } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
    staleTime: 1000 * 60 * 5,
  });

  // Cargar métodos de pago
  const {
    data: paymentMethods = [],
    isLoading: loadingPaymentMethods,
  } = useQuery({
    queryKey: ["payment-methods", "BAR"],
    queryFn: fetchPaymentMethods,
    staleTime: 1000 * 60 * 10,
  });

  // Agregar producto al carrito
  const handleAddProduct = useCallback((product: ProductDTO) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  // Actualizar cantidad
  const handleUpdateQuantity = useCallback((productId: number, delta: number) => {
    setCart((prev) => {
      const item = prev.find((i) => i.product.id === productId);
      if (!item) return prev;

      const newQuantity = item.quantity + delta;
      if (newQuantity <= 0) {
        return prev.filter((i) => i.product.id !== productId);
      }

      return prev.map((i) =>
        i.product.id === productId ? { ...i, quantity: newQuantity } : i
      );
    });
  }, []);

  // Eliminar producto del carrito
  const handleRemoveProduct = useCallback((productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  // Calcular total
  const total = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  // Procesar venta
  const processSaleMutation = useMutation({
    mutationFn: async () => {
      // Validaciones más específicas con mensajes claros
      if (!quickSalePlayer) {
        throw new Error("No se pudo cargar el cliente genérico. Por favor, recargá la página.");
      }
      if (cart.length === 0) {
        throw new Error("El carrito está vacío. Agregá productos antes de procesar la venta.");
      }
      if (selectedPaymentMethodId === "none" || !selectedPaymentMethodId) {
        throw new Error("Seleccioná un método de pago antes de procesar la venta.");
      }

      setIsProcessing(true);

      try {
        // Procesar venta rápida en una sola llamada API
        const order = await ordersService.quickSale({
          playerId: quickSalePlayer.id,
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          paymentMethodId: selectedPaymentMethodId as number,
        });

        return order;
      } catch (error) {
        // Re-lanzar el error con más contexto si es necesario
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("Error inesperado al procesar la venta");
      } finally {
        setIsProcessing(false);
      }
    },
    onSuccess: () => {
      // Limpiar carrito y resetear
      setCart([]);
      setSelectedPaymentMethodId("none");
      toast.success("Venta procesada correctamente");
      
      // Invalidar queries para refrescar datos
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      
      // Opcional: volver a la página de órdenes después de un breve delay
      setTimeout(() => {
        router.push("/admin/orders");
      }, 1500);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Error al procesar la venta"
      );
    },
  });

  const handleProcessSale = useCallback(() => {
    if (!quickSalePlayer) {
      toast.error("No se pudo cargar el cliente genérico. Por favor, recargá la página.");
      return;
    }
    if (cart.length === 0) {
      toast.error("Agregá productos al carrito");
      return;
    }
    if (selectedPaymentMethodId === "none" || !selectedPaymentMethodId) {
      toast.error("Seleccioná un método de pago");
      return;
    }
    processSaleMutation.mutate();
  }, [cart, selectedPaymentMethodId, quickSalePlayer, processSaleMutation]);

  const isLoading = loadingPlayer || loadingProducts || loadingPaymentMethods;

  if (isLoading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2Icon className="mx-auto h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (playerError) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error al cargar</CardTitle>
            <CardDescription>
              No se pudo cargar el cliente genérico para ventas rápidas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {playerErrorDetails instanceof Error ? playerErrorDetails.message : "Error desconocido"}
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => window.location.reload()} className="w-full">
              Recargar página
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }


  // Convertir cart a formato OrderItem
  const orderItems = cart.map((item) => ({
    id: item.product.id,
    product: { id: item.product.id, name: item.product.name },
    quantity: item.quantity,
    unit_price: item.product.price,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <ShoppingCartIcon className="h-5 w-5" />
                Venta rápida
              </CardTitle>
              <CardDescription>
                Venta instantánea sin cliente. Agregá productos, seleccioná el método de pago y cerrá la venta.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push("/admin/orders")}
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <OrderItemsLayout
            items={orderItems}
            isLoading={isLoading}
            isEditable={!isProcessing}
            onUpdateQuantity={(item, newQuantity) => {
              if (!item.product) return;
              handleUpdateQuantity(item.product.id, newQuantity - item.quantity);
            }}
            onRemoveItem={(item) => {
              if (!item.product) return;
              handleRemoveProduct(item.product.id);
            }}
            products={products}
            onProductSelect={handleAddProduct}
            loadingProducts={loadingProducts}
            total={total}
            paymentMethods={paymentMethods}
            selectedPaymentMethodId={selectedPaymentMethodId}
            onPaymentMethodSelect={(id) => setSelectedPaymentMethodId(id)}
            loadingPaymentMethods={loadingPaymentMethods}
            onProcess={handleProcessSale}
            processing={isProcessing}
            onClear={() => {
              setCart([]);
              setSelectedPaymentMethodId("none");
            }}
            processButtonLabel={isProcessing ? "Procesando..." : "Procesar venta"}
            clearButtonLabel="Limpiar"
            emptyMessage="El carrito está vacío. Agregá productos para continuar."
            showMoreProductsSelect={true}
          />
        </CardContent>
      </Card>
    </div>
  );
}

