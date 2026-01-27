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
  PercentIcon,
  DollarSignIcon,
  CreditCardIcon,
  TagIcon,
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

interface OrderConsumptionPanelProps {
  items: OrderItem[];
  isLoading?: boolean;
  isEditable?: boolean;
  onUpdateQuantity: (item: OrderItem, newQuantity: number) => void;
  onRemoveItem: (item: OrderItem) => void;
  hasPendingChanges?: boolean;
  onSaveChanges?: () => void;
  savingChanges?: boolean;
  title?: string;
  description?: string;
  emptyMessage?: string;
}

export function OrderConsumptionPanel({
  items,
  isLoading = false,
  isEditable = true,
  onUpdateQuantity,
  onRemoveItem,
  hasPendingChanges = false,
  onSaveChanges,
  savingChanges = false,
  title = "Consumos",
  description = "Agregá productos y ajustá cantidades.",
  emptyMessage = "No hay productos.",
}: OrderConsumptionPanelProps) {
  return (
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
                      <div className="whitespace-normal break-words font-medium">
                        {item.product?.name ?? "Producto"}
                      </div>
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
      </CardFooter>
    </Card>
  );
}

interface OrderProductSelectorPanelProps {
  products: ProductDTO[];
  onProductSelect: (product: ProductDTO, quantity?: number) => void;
  loadingProducts?: boolean;
  isEditable?: boolean;
  showMoreProductsSelect?: boolean;
  moreProductsSelectValue?: string;
  onMoreProductsSelectChange?: (value: string) => void;
}

export function OrderProductSelectorPanel({
  products,
  onProductSelect,
  loadingProducts = false,
  isEditable = true,
  showMoreProductsSelect = true,
  moreProductsSelectValue = "none",
  onMoreProductsSelectChange,
}: OrderProductSelectorPanelProps) {
  const sellableProducts = useMemo(
    () =>
      products.filter((product) => {
        if (!product.is_active) return false;
        if (product.category?.is_sellable === false) {
          return false;
        }
        return true;
      }),
    [products]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Productos por categoría</CardTitle>
        <CardDescription>Buscá y agregá productos rápidamente.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ProductSelector
          products={sellableProducts}
          onProductSelect={(product) => onProductSelect(product)}
          disabled={!isEditable || loadingProducts}
          showSearch={false}
          compact={true}
        />
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
            {sellableProducts.map((p) => (
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
      </CardContent>
    </Card>
  );
}

interface OrderSummaryPanelProps {
  total: number;
  finalTotal: number;
  discountValue: number;
  discountPercentage?: number | null;
  discountAmount?: number | null;
  isEditable?: boolean;
  isLoading?: boolean;
  onDiscountPercentageChange?: (value: number | null) => void;
  onDiscountAmountChange?: (value: number | null) => void;
  paymentMethods: PaymentMethodDTO[];
  selectedPaymentMethodId: number | "none";
  onPaymentMethodSelect: (id: number | "none") => void;
  loadingPaymentMethods?: boolean;
  paymentInfo?: {
    payment_method_id: number | null;
    payment_method: { id: number; name: string } | null;
    amount: number;
  } | null;
  onProcess?: () => void;
  onCancel?: () => void;
  onClear?: () => void;
  processing?: boolean;
  cancelling?: boolean;
  processButtonLabel?: string;
  cancelButtonLabel?: string;
  clearButtonLabel?: string;
  isDiscountSectionEnabled?: boolean;
}

export function OrderSummaryPanel({
  total,
  finalTotal,
  discountValue,
  discountPercentage = null,
  discountAmount = null,
  isEditable = true,
  isLoading = false,
  onDiscountPercentageChange,
  onDiscountAmountChange,
  paymentMethods,
  selectedPaymentMethodId,
  onPaymentMethodSelect,
  loadingPaymentMethods = false,
  paymentInfo = null,
  onProcess,
  onCancel,
  onClear,
  processing = false,
  cancelling = false,
  processButtonLabel = "Procesar venta",
  cancelButtonLabel = "Cancelar cuenta",
  clearButtonLabel = "Limpiar",
  isDiscountSectionEnabled = true,
}: OrderSummaryPanelProps) {
  return (
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

        {isDiscountSectionEnabled && isEditable && !isLoading && (
          <>
            <div className="h-px bg-border my-2" />
            <div className="space-y-3 p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2">
                <TagIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <Label className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  Aplicar Descuento
                </Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <PercentIcon className="w-3.5 h-3.5" />
                    Porcentaje
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="0.00"
                      value={discountPercentage ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "") {
                          onDiscountPercentageChange?.(null);
                        } else {
                          const num = Number(value);
                          if (!Number.isNaN(num) && num >= 0 && num <= 100) {
                            onDiscountPercentageChange?.(num);
                            if (onDiscountAmountChange) {
                              onDiscountAmountChange(null);
                            }
                          }
                        }
                      }}
                      disabled={!isEditable}
                      className="w-full bg-white dark:bg-gray-900 border-amber-300 dark:border-amber-700 focus:border-amber-500 focus:ring-amber-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-600 dark:text-amber-400">
                      %
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <DollarSignIcon className="w-3.5 h-3.5" />
                    Monto Fijo
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={discountAmount ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "") {
                          onDiscountAmountChange?.(null);
                        } else {
                          const num = Number(value);
                          if (!Number.isNaN(num) && num >= 0) {
                            onDiscountAmountChange?.(num);
                            if (onDiscountPercentageChange) {
                              onDiscountPercentageChange(null);
                            }
                          }
                        }
                      }}
                      disabled={!isEditable}
                      className="w-full bg-white dark:bg-gray-900 border-amber-300 dark:border-amber-700 focus:border-amber-500 focus:ring-amber-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-600 dark:text-amber-400">
                      $
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 pt-1">
                💡 Ingresá un descuento porcentual o un monto fijo. Si ingresás ambos, se aplicará el monto fijo.
              </p>
            </div>
          </>
        )}

        {!isEditable && !isLoading && (discountValue > 0 || paymentInfo) && (
          <>
            <div className="h-px bg-border my-2" />
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
              {discountValue > 0 && (
                <div className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2">
                    <TagIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      Descuento Aplicado
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                    -${discountValue.toFixed(2)}
                  </span>
                </div>
              )}
              {paymentInfo?.payment_method && (
                <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <CreditCardIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Método de Pago
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                    {paymentInfo.payment_method.name}
                  </span>
                </div>
              )}
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
              total === 0 ||
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
            disabled={processing || total === 0}
            onClick={onClear}
          >
            {clearButtonLabel}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

interface OrderItemsLayoutProps {
  items: OrderItem[];
  isLoading?: boolean;
  isEditable?: boolean;
  onUpdateQuantity: (item: OrderItem, newQuantity: number) => void;
  onRemoveItem: (item: OrderItem) => void;
  products: ProductDTO[];
  onProductSelect: (product: ProductDTO, quantity?: number) => void;
  loadingProducts?: boolean;
  total: number;
  discountPercentage?: number | null;
  discountAmount?: number | null;
  onDiscountPercentageChange?: (value: number | null) => void;
  onDiscountAmountChange?: (value: number | null) => void;
  paymentMethods: PaymentMethodDTO[];
  selectedPaymentMethodId: number | "none";
  onPaymentMethodSelect: (id: number | "none") => void;
  loadingPaymentMethods?: boolean;
  paymentInfo?: {
    payment_method_id: number | null;
    payment_method: { id: number; name: string } | null;
    amount: number;
  } | null;
  onProcess?: () => void;
  onCancel?: () => void;
  onClear?: () => void;
  processing?: boolean;
  cancelling?: boolean;
  hasPendingChanges?: boolean;
  onSaveChanges?: () => void;
  savingChanges?: boolean;
  showMoreProductsSelect?: boolean;
  moreProductsSelectValue?: string;
  onMoreProductsSelectChange?: (value: string) => void;
  isLoadingSummary?: boolean;
  isDiscountSectionEnabled?: boolean;
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
  paymentInfo = null,
  onProcess,
  onCancel,
  onClear,
  processing = false,
  cancelling = false,
  hasPendingChanges = false,
  onSaveChanges,
  savingChanges = false,
  showMoreProductsSelect = true,
  moreProductsSelectValue = "none",
  onMoreProductsSelectChange,
  isLoadingSummary = false,
  isDiscountSectionEnabled = true,
}: OrderItemsLayoutProps) {
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
      <div className="space-y-4">
        <OrderConsumptionPanel
          items={items}
          isLoading={isLoading}
          isEditable={isEditable}
          onUpdateQuantity={onUpdateQuantity}
          onRemoveItem={onRemoveItem}
          hasPendingChanges={hasPendingChanges}
          onSaveChanges={onSaveChanges}
          savingChanges={savingChanges}
        />
        <OrderProductSelectorPanel
          products={products}
          onProductSelect={onProductSelect}
          loadingProducts={loadingProducts}
          isEditable={isEditable}
          showMoreProductsSelect={showMoreProductsSelect}
          moreProductsSelectValue={moreProductsSelectValue}
          onMoreProductsSelectChange={onMoreProductsSelectChange}
        />
      </div>
      <OrderSummaryPanel
        total={total}
        finalTotal={finalTotal}
        discountValue={discountValue}
        discountPercentage={discountPercentage}
        discountAmount={discountAmount}
        isEditable={isEditable}
        isLoading={isLoadingSummary}
        onDiscountPercentageChange={onDiscountPercentageChange}
        onDiscountAmountChange={onDiscountAmountChange}
        paymentMethods={paymentMethods}
        selectedPaymentMethodId={selectedPaymentMethodId}
        onPaymentMethodSelect={onPaymentMethodSelect}
        loadingPaymentMethods={loadingPaymentMethods}
        paymentInfo={paymentInfo}
        onProcess={onProcess}
        onCancel={onCancel}
        onClear={onClear}
        processing={processing}
        cancelling={cancelling}
        isDiscountSectionEnabled={isDiscountSectionEnabled}
      />
    </div>
  );
}

