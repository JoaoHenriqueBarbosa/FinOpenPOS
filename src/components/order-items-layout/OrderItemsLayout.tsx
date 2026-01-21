"use client";

import { useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Loader2Icon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  SaveIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ProductSelector } from "@/components/product-selector/ProductSelector";
import { PaymentMethodSelector } from "@/components/payment-method-selector/PaymentMethodSelector";
import type { ProductDTO } from "@/models/dto/product";
import type { PaymentMethodDTO } from "@/models/dto/payment-method";

export interface OrderItem {
  id: number;
  product: { id: number; name: string } | null;
  quantity: number;
  unit_price: number;
}

interface OrderItemsLayoutProps {
  // Items
  items: OrderItem[];
  isLoading?: boolean;
  isEditable?: boolean;
  
  // Callbacks para items
  onUpdateQuantity: (item: OrderItem, newQuantity: number) => void;
  onRemoveItem: (item: OrderItem) => void;
  
  // Productos
  products: ProductDTO[];
  onProductSelect: (product: ProductDTO, quantity?: number) => void;
  loadingProducts?: boolean;
  
  // Resumen
  total: number;
  discountPercentage?: number | null;
  discountAmount?: number | null;
  onDiscountPercentageChange?: (value: number | null) => void;
  onDiscountAmountChange?: (value: number | null) => void;
  paymentMethods: PaymentMethodDTO[];
  selectedPaymentMethodId: number | "none";
  onPaymentMethodSelect: (id: number | "none") => void;
  loadingPaymentMethods?: boolean;
  
  // Acciones
  onProcess?: () => void;
  onCancel?: () => void;
  onClear?: () => void;
  processing?: boolean;
  cancelling?: boolean;
  
  // Estado adicional
  hasPendingChanges?: boolean;
  onSaveChanges?: () => void;
  savingChanges?: boolean;
  
  // Labels personalizables
  title?: string;
  description?: string;
  processButtonLabel?: string;
  cancelButtonLabel?: string;
  clearButtonLabel?: string;
  emptyMessage?: string;
  
  // Más productos select (opcional)
  showMoreProductsSelect?: boolean;
  moreProductsSelectValue?: string;
  onMoreProductsSelectChange?: (value: string) => void;
}

export function OrderItemsLayout({
  items,
  isLoading = false,
  isEditable = true,
  onUpdateQuantity,
  onRemoveItem,
  products,
  onProductSelect,
  loadingProducts = false,
  total,
  discountPercentage = null,
  discountAmount = null,
  onDiscountPercentageChange,
  onDiscountAmountChange,
  paymentMethods,
  selectedPaymentMethodId,
  onPaymentMethodSelect,
  loadingPaymentMethods = false,
  onProcess,
  onCancel,
  onClear,
  processing = false,
  cancelling = false,
  hasPendingChanges = false,
  onSaveChanges,
  savingChanges = false,
  title = "Consumos",
  description = "Agregá productos y ajustá cantidades.",
  processButtonLabel = "Procesar venta",
  cancelButtonLabel = "Cancelar cuenta",
  clearButtonLabel = "Limpiar",
  emptyMessage = "No hay productos.",
  showMoreProductsSelect = true,
  moreProductsSelectValue = "none",
  onMoreProductsSelectChange,
}: OrderItemsLayoutProps) {
  // Calcular descuento y total final
  const discountValue = useMemo(() => {
    if (discountAmount !== null && discountAmount !== undefined && discountAmount > 0) {
      return discountAmount;
    }
    if (discountPercentage !== null && discountPercentage !== undefined && discountPercentage > 0) {
      return (total * discountPercentage) / 100;
    }
    return 0;
  }, [total, discountPercentage, discountAmount]);

  const finalTotal = Math.max(0, total - discountValue);
  return (
    <div className="grid gap-4 md:grid-cols-[4fr_1fr] lg:grid-cols-[5fr_1fr] items-start">
      {/* Items de la cuenta */}
      <Card className={!isEditable ? "opacity-75" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            {hasPendingChanges && isEditable && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                Cambios pendientes
              </Badge>
            )}
            {!isEditable && (
              <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">
                Cerrado
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
                {isLoading ? (
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
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6">
                      {emptyMessage}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
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
                            disabled={!isEditable}
                            onClick={() => onUpdateQuantity(item, item.quantity - 1)}
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
                            disabled={!isEditable}
                            onClick={() => onUpdateQuantity(item, item.quantity + 1)}
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
                          disabled={!isEditable}
                          onClick={() => onRemoveItem(item)}
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
          {hasPendingChanges && onSaveChanges && (
            <Button
              size="lg"
              className="w-full h-12 text-base font-semibold"
              onClick={onSaveChanges}
              disabled={savingChanges || !isEditable}
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
          <div className="space-y-6 w-full">
            {/* Productos por categoría */}
            <div>
              <Label className="text-sm font-semibold mb-3 block">
                Productos por categoría
              </Label>
              <ProductSelector
                products={products}
                onProductSelect={(product) => onProductSelect(product)}
                disabled={!isEditable || loadingProducts}
                showSearch={false}
                compact={true}
              />
            </div>

            {/* Más productos - Select dropdown */}
            {showMoreProductsSelect && (
              <div className="border-t pt-4">
                <Label className="text-sm font-semibold mb-2 block">
                  Más productos
                </Label>
                <Select
                  value={moreProductsSelectValue}
                  onValueChange={(value) => {
                    if (onMoreProductsSelectChange) {
                      onMoreProductsSelectChange(value);
                    }
                    if (value !== "none") {
                      const product = products.find((p) => p.id === Number(value));
                      if (product) {
                        onProductSelect(product, 1);
                        if (onMoreProductsSelectChange) {
                          onMoreProductsSelectChange("none");
                        }
                      }
                    }
                  }}
                  disabled={!isEditable || loadingProducts}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar producto adicional..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seleccionar producto...</SelectItem>
                    {products
                      .filter((p) => p.is_active)
                      .map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name} - ${p.price.toFixed(2)}
                          {p.category && ` (${p.category.name})`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">
                  Los productos seleccionados aquí se agregan con cantidad 1. Podés ajustar la cantidad desde la lista de consumos.
                </p>
              </div>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Resumen y pago */}
      <Card className={!isEditable ? "opacity-75" : ""}>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
          <CardDescription>
            {isEditable
              ? "Revisá el total y registrá el pago para cerrar la cuenta."
              : "Esta cuenta está cerrada. No se pueden realizar modificaciones."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <>
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex justify-between text-sm">
                <span>Descuento</span>
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
                <span>${total.toFixed(2)}</span>
              </div>
              {discountValue > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Descuento</span>
                  <span>-${discountValue.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>${finalTotal.toFixed(2)}</span>
              </div>
            </>
          )}

          {/* Campos de descuento - solo si la orden es editable */}
          {isEditable && !isLoading && (
            <>
              <div className="h-px bg-border my-2" />
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Descuento</Label>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Porcentaje (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="0.00"
                      value={discountPercentage !== null && discountPercentage !== undefined ? discountPercentage : ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "") {
                          onDiscountPercentageChange?.(null);
                        } else {
                          const num = Number(value);
                          if (!Number.isNaN(num) && num >= 0 && num <= 100) {
                            onDiscountPercentageChange?.(num);
                            // Si se ingresa porcentaje, limpiar descuento por monto
                            if (onDiscountAmountChange) {
                              onDiscountAmountChange(null);
                            }
                          }
                        }
                      }}
                      disabled={!isEditable}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Monto fijo ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={discountAmount !== null && discountAmount !== undefined ? discountAmount : ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "") {
                          onDiscountAmountChange?.(null);
                        } else {
                          const num = Number(value);
                          if (!Number.isNaN(num) && num >= 0) {
                            onDiscountAmountChange?.(num);
                            // Si se ingresa monto fijo, limpiar descuento porcentual
                            if (onDiscountPercentageChange) {
                              onDiscountPercentageChange(null);
                            }
                          }
                        }
                      }}
                      disabled={!isEditable}
                      className="w-full"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ingresá un descuento porcentual o un monto fijo. Si ingresás ambos, se aplicará el monto fijo.
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="h-px bg-border my-2" />

          <PaymentMethodSelector
            paymentMethods={paymentMethods}
            selectedPaymentMethodId={selectedPaymentMethodId === "none" ? "none" : selectedPaymentMethodId}
            onSelect={onPaymentMethodSelect}
            disabled={!isEditable}
            isLoading={loadingPaymentMethods}
          />
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          {onProcess && (
            <Button
              className="w-full"
              disabled={
                processing ||
                !isEditable ||
                items.length === 0 ||
                selectedPaymentMethodId === "none"
              }
              onClick={onProcess}
            >
              {processing && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              {processButtonLabel}
            </Button>
          )}

          {onCancel && (
            <Button
              className="w-full"
              variant="outline"
              disabled={cancelling || processing || !isEditable}
              onClick={onCancel}
            >
              {cancelling && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              {cancelButtonLabel}
            </Button>
          )}

          {onClear && (
            <Button
              className="w-full"
              variant="outline"
              disabled={processing || items.length === 0}
              onClick={onClear}
            >
              {clearButtonLabel}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

