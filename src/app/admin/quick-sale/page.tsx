"use client";

import { useState, useCallback } from "react";
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
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Loader2Icon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  ArrowLeftIcon,
  ShoppingCartIcon,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ProductDTO } from "@/models/dto/product";
import type { PaymentMethodDTO } from "@/models/dto/payment-method";
import { productsService, paymentMethodsService, playersService, ordersService } from "@/services";
import type { PlayerDTO } from "@/models/dto/player";
import { ProductSelector } from "@/components/product-selector/ProductSelector";
import { PaymentMethodSelector } from "@/components/payment-method-selector/PaymentMethodSelector";

// Función para obtener o crear el cliente genérico de venta rápida
async function getOrCreateQuickSalePlayer(): Promise<PlayerDTO> {
  // Primero intentar buscar un cliente existente llamado "Venta rápida"
  const players = await playersService.getAll(true);
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
    onError: (error) => {
      console.error("Error loading quick sale player:", error);
      toast.error("Error al cargar el cliente genérico. Por favor, recargá la página.");
    },
  });

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

        <CardContent className="space-y-6">
          {/* Productos disponibles */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Productos disponibles
            </Label>
            <ProductSelector
              products={products}
              onProductSelect={handleAddProduct}
              disabled={isProcessing}
            />
          </div>

          {/* Carrito */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Carrito ({cart.length} {cart.length === 1 ? "producto" : "productos"})
            </Label>
            {cart.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 border rounded-lg">
                El carrito está vacío. Agregá productos para continuar.
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-center">Cantidad</TableHead>
                      <TableHead className="text-right">Precio unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item) => (
                      <TableRow key={item.product.id}>
                        <TableCell className="font-medium">
                          {item.product.name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => handleUpdateQuantity(item.product.id, -1)}
                            >
                              <MinusIcon className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => handleUpdateQuantity(item.product.id, 1)}
                            >
                              <PlusIcon className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          ${item.product.price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${(item.product.price * item.quantity).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleRemoveProduct(item.product.id)}
                          >
                            <TrashIcon className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Método de pago y total */}
          <div className="flex flex-col gap-4">
            <PaymentMethodSelector
              paymentMethods={paymentMethods}
              selectedPaymentMethodId={selectedPaymentMethodId === "none" ? "none" : selectedPaymentMethodId}
              onSelect={(id) => setSelectedPaymentMethodId(id)}
              disabled={isProcessing}
              isLoading={loadingPaymentMethods}
            />
            <div className="text-right border-t pt-4">
              <div className="text-sm text-muted-foreground mb-1">Total</div>
              <div className="text-2xl font-bold">${total.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setCart([]);
              setSelectedPaymentMethodId("none");
            }}
            disabled={isProcessing || cart.length === 0}
          >
            Limpiar
          </Button>
          <Button
            onClick={handleProcessSale}
            disabled={isProcessing || !quickSalePlayer || cart.length === 0 || selectedPaymentMethodId === "none"}
            className="min-w-[150px]"
          >
            {isProcessing ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <ShoppingCartIcon className="mr-2 h-4 w-4" />
                Procesar venta
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

