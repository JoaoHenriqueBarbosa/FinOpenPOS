"use client";

import { useEffect, useState, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2Icon,
  ArrowLeftIcon,
  SaveIcon,
  XCircleIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import type { PurchaseDTO, PurchaseStatus } from "@/models/dto/purchase";
import type { PaymentMethodDTO } from "@/models/dto/payment-method";
import type { ProductDTO } from "@/models/dto/product";
import type { SupplierDTO } from "@/models/dto/supplier";
import { purchasesService, paymentMethodsService, productsService, suppliersService } from "@/services";
import { PaymentMethodSelector } from "@/components/payment-method-selector/PaymentMethodSelector";
import { formatDateTime } from "@/lib/date-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

async function fetchPurchase(purchaseId: number): Promise<PurchaseDTO> {
  return purchasesService.getById(purchaseId);
}

async function fetchPaymentMethods(): Promise<PaymentMethodDTO[]> {
  return paymentMethodsService.getAll(true, "BAR");
}

async function fetchProducts(): Promise<ProductDTO[]> {
  return productsService.getAll();
}

async function fetchSuppliers(): Promise<SupplierDTO[]> {
  return suppliersService.getAll();
}

type PurchaseLine = {
  id: number | string;
  productId: number | "none";
  quantity: number | "";
  unitCost: number | "";
};

export default function PurchaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const idParam = params?.id;
  const purchaseId = idParam && idParam !== "new" ? Number(idParam) : null;
  const isNewPurchase = purchaseId === null;

  const [purchase, setPurchase] = useState<PurchaseDTO | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | "none">("none");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    number | "none"
  >("none");
  const [notes, setNotes] = useState<string>("");
  const [lines, setLines] = useState<PurchaseLine[]>([
    { id: 1, productId: "none", quantity: "", unitCost: "" },
  ]);
  const [nextTempId, setNextTempId] = useState(2);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  // Queries
  const {
    data: purchaseData,
    isLoading: loadingPurchase,
    isError: purchaseError,
  } = useQuery({
    queryKey: ["purchase", purchaseId],
    queryFn: () => fetchPurchase(purchaseId!),
    enabled: !!purchaseId && !isNewPurchase,
    staleTime: 1000 * 30,
  });

  const {
    data: paymentMethods = [],
    isLoading: loadingPM,
    isError: pmError,
  } = useQuery({
    queryKey: ["payment-methods", "BAR"],
    queryFn: fetchPaymentMethods,
    staleTime: 1000 * 60 * 10,
  });

  const {
    data: products = [],
    isLoading: loadingProducts,
  } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: suppliers = [],
    isLoading: loadingSuppliers,
  } = useQuery({
    queryKey: ["suppliers"],
    queryFn: fetchSuppliers,
    staleTime: 1000 * 60 * 5,
  });

  // Sincronizar estado local cuando llega de la API
  useEffect(() => {
    if (purchaseData && !isNewPurchase) {
      setPurchase(purchaseData);
      setSelectedSupplierId(purchaseData.supplier?.id ?? "none");
      setSelectedPaymentMethodId(
        purchaseData.payment_method?.id ?? "none"
      );
      setNotes(purchaseData.notes ?? "");
      
      // Convert purchase items to lines
      const initialLines: PurchaseLine[] = (purchaseData.items ?? []).map((item, index) => ({
        id: item.id,
        productId: item.product?.id ?? "none",
        quantity: item.quantity,
        unitCost: item.unit_cost,
      }));
      if (initialLines.length === 0) {
        initialLines.push({ id: 1, productId: "none", quantity: "", unitCost: "" });
      }
      setLines(initialLines);
      setNextTempId(initialLines.length + 1);
    }
  }, [purchaseData, isNewPurchase]);

  // Toasts de error
  useEffect(() => {
    if (purchaseError) toast.error("Error al cargar la compra.");
  }, [purchaseError]);

  useEffect(() => {
    if (pmError) toast.error("Error al cargar los métodos de pago.");
  }, [pmError]);

  const isPurchaseCancelled = purchase?.status === "cancelled";

  // Helper functions for lines
  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: nextTempId,
        productId: "none",
        quantity: "",
        unitCost: "",
      },
    ]);
    setNextTempId((prev) => prev + 1);
  };

  const removeLine = (id: number | string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const updateLine = (id: number | string, patch: Partial<PurchaseLine>) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
    );
  };

  const validLines = useMemo(() => {
    return lines.filter(
      (l) =>
        l.productId !== "none" &&
        l.quantity !== "" &&
        l.unitCost !== "" &&
        Number(l.quantity) > 0 &&
        Number(l.unitCost) >= 0
    );
  }, [lines]);

  const total = useMemo(() => {
    return validLines.reduce(
      (sum, l) => sum + Number(l.quantity) * Number(l.unitCost),
      0
    );
  }, [validLines]);

  // Mutations
  const savePurchaseMutation = useMutation({
    mutationFn: async () => {
      if (selectedSupplierId === "none") {
        throw new Error("Debés seleccionar un proveedor");
      }

      if (validLines.length === 0) {
        throw new Error("Debés agregar al menos un producto");
      }

      const items = validLines.map((l) => ({
        productId: Number(l.productId),
        quantity: Number(l.quantity),
        unitCost: Number(l.unitCost),
      }));

      if (isNewPurchase) {
        // Create new purchase
        return await purchasesService.create({
          supplier_id: Number(selectedSupplierId),
          payment_method_id: selectedPaymentMethodId === "none" ? null : Number(selectedPaymentMethodId),
          notes: notes || null,
          items,
        });
      } else {
        // Update existing purchase
        const res = await fetch(`/api/purchases/${purchaseId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplier_id: Number(selectedSupplierId),
            payment_method_id: selectedPaymentMethodId === "none" ? null : Number(selectedPaymentMethodId),
            notes: notes || null,
            items,
          }),
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Error actualizando compra");
        }
        return (await res.json()) as PurchaseDTO;
      }
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Error al guardar la compra."
      );
    },
    onSuccess: (savedPurchase) => {
      if (isNewPurchase) {
        toast.success("Compra creada exitosamente.");
        router.push(`/admin/purchases/${savedPurchase.id}`);
      } else {
        setPurchase(savedPurchase);
        queryClient.setQueryData(["purchase", purchaseId], savedPurchase);
        queryClient.invalidateQueries({ queryKey: ["purchases"] });
        toast.success("Compra actualizada exitosamente.");
      }
    },
  });

  const cancelPurchaseMutation = useMutation({
    mutationFn: async () => {
      if (!purchaseId) throw new Error("No se puede cancelar una compra nueva");
      return await purchasesService.cancel(purchaseId);
    },
    onMutate: () => {
      if (!purchase) return { previousPurchase: null };
      const previousPurchase = purchase;

      setPurchase({
        ...purchase,
        status: "cancelled",
      });

      return { previousPurchase };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previousPurchase) {
        setPurchase(ctx.previousPurchase);
      }
      toast.error(
        err instanceof Error ? err.message : "Error al cancelar la compra."
      );
    },
    onSuccess: (updatedPurchase) => {
      setPurchase(updatedPurchase);
      queryClient.setQueryData(["purchase", purchaseId], updatedPurchase);
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      setIsCancelDialogOpen(false);
      toast.success("Compra cancelada.");
    },
  });

  const handleSave = () => {
    savePurchaseMutation.mutate();
  };

  const handleCancel = () => {
    cancelPurchaseMutation.mutate();
  };

  const getStatusBadge = (status: PurchaseStatus) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pendiente</Badge>;
      case "completed":
        return <Badge variant="default">Completada</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const loading = loadingPurchase || loadingPM || loadingProducts || loadingSuppliers;

  if (loading && !isNewPurchase) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!isNewPurchase && !purchase && !loadingPurchase) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Compra no encontrada.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/purchases")}
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isNewPurchase ? "Nueva compra" : `Compra #${purchase?.id}`}
            </h1>
            {!isNewPurchase && purchase && (
              <p className="text-sm text-muted-foreground">
                {formatDateTime(purchase.created_at)}
              </p>
            )}
          </div>
        </div>
        {!isNewPurchase && purchase && (
          <div className="flex items-center gap-2">
            {getStatusBadge(purchase.status)}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Información de la compra */}
        <Card>
          <CardHeader>
            <CardTitle>Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isNewPurchase && purchase && (
              <div>
                <Label className="text-sm font-semibold">Proveedor</Label>
                <p className="text-sm">{purchase.supplier?.name ?? "N/A"}</p>
              </div>
            )}
            <div>
              <Label className="text-sm font-semibold">Total</Label>
              <p className="text-2xl font-bold">
                ${total.toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Edición (solo si no está cancelada) */}
        {!isPurchaseCancelled && (
          <Card>
            <CardHeader>
              <CardTitle>{isNewPurchase ? "Configuración" : "Editar compra"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Proveedor</Label>
                <Select
                  value={
                    selectedSupplierId === "none"
                      ? "none"
                      : String(selectedSupplierId)
                  }
                  onValueChange={(value) => {
                    if (value === "none") setSelectedSupplierId("none");
                    else setSelectedSupplierId(Number(value));
                  }}
                  disabled={savePurchaseMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seleccionar...</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <PaymentMethodSelector
                  paymentMethods={paymentMethods}
                  selectedPaymentMethodId={
                    selectedPaymentMethodId === "none"
                      ? "none"
                      : selectedPaymentMethodId
                  }
                  onSelect={(id) => setSelectedPaymentMethodId(id)}
                  disabled={savePurchaseMutation.isPending || loadingPM}
                  isLoading={loadingPM}
                  allowDeselect={true}
                />
                <p className="text-xs text-muted-foreground">
                  {selectedPaymentMethodId === "none"
                    ? "La compra quedará como pendiente"
                    : "La compra quedará como completada"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas adicionales"
                  disabled={savePurchaseMutation.isPending}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button
                size="lg"
                className="w-full"
                onClick={handleSave}
                disabled={
                  savePurchaseMutation.isPending ||
                  selectedSupplierId === "none" ||
                  validLines.length === 0
                }
              >
                {savePurchaseMutation.isPending ? (
                  <>
                    <Loader2Icon className="mr-2 h-5 w-5 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <SaveIcon className="mr-2 h-5 w-5" />
                    {isNewPurchase ? "Crear compra" : "Guardar cambios"}
                  </>
                )}
              </Button>
              {!isNewPurchase && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setIsCancelDialogOpen(true)}
                  disabled={cancelPurchaseMutation.isPending}
                >
                  {cancelPurchaseMutation.isPending ? (
                    <>
                      <Loader2Icon className="mr-2 h-5 w-5 animate-spin" />
                      Cancelando...
                    </>
                  ) : (
                    <>
                      <XCircleIcon className="mr-2 h-5 w-5" />
                      Cancelar compra
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        )}
      </div>

      {/* Items de la compra */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Items</CardTitle>
              <CardDescription>
                {lines.length} producto(s) en esta compra
              </CardDescription>
            </div>
            {!isPurchaseCancelled && (
              <Button variant="outline" size="sm" onClick={addLine}>
                <PlusIcon className="w-4 h-4 mr-1" />
                Agregar línea
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Costo unitario</TableHead>
                  <TableHead>Subtotal</TableHead>
                  {!isPurchaseCancelled && <TableHead className="w-[60px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isPurchaseCancelled ? 4 : 5} className="text-center">
                      No hay items en esta compra.
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line) => {
                    const qty =
                      typeof line.quantity === "string"
                        ? Number(line.quantity)
                        : line.quantity;
                    const cost =
                      typeof line.unitCost === "string"
                        ? Number(line.unitCost)
                        : line.unitCost;
                    const subtotal = !qty || !cost ? 0 : Number(qty) * Number(cost);

                    return (
                      <TableRow key={line.id}>
                        <TableCell className="min-w-[200px]">
                          {isPurchaseCancelled ? (
                            <span>
                              {products.find((p) => p.id === line.productId)?.name ?? "Producto"}
                            </span>
                          ) : (
                            <Select
                              value={
                                line.productId === "none"
                                  ? "none"
                                  : String(line.productId)
                              }
                              onValueChange={(value) => {
                                if (value === "none") {
                                  updateLine(line.id, { productId: "none" });
                                } else {
                                  updateLine(line.id, {
                                    productId: Number(value),
                                  });
                                }
                              }}
                              disabled={savePurchaseMutation.isPending}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar producto" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">
                                  Seleccionar...
                                </SelectItem>
                                {products.map((p) => (
                                  <SelectItem key={p.id} value={String(p.id)}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell className="w-[120px]">
                          {isPurchaseCancelled ? (
                            <span>{line.quantity}</span>
                          ) : (
                            <Input
                              type="number"
                              min={0}
                              value={line.quantity}
                              onChange={(e) =>
                                updateLine(line.id, {
                                  quantity:
                                    e.target.value === ""
                                      ? ""
                                      : Number(e.target.value),
                                })
                              }
                              disabled={savePurchaseMutation.isPending}
                            />
                          )}
                        </TableCell>
                        <TableCell className="w-[140px]">
                          {isPurchaseCancelled ? (
                            <span>${typeof line.unitCost === "number" ? line.unitCost.toFixed(2) : line.unitCost}</span>
                          ) : (
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={line.unitCost}
                              onChange={(e) =>
                                updateLine(line.id, {
                                  unitCost:
                                    e.target.value === ""
                                      ? ""
                                      : Number(e.target.value),
                                })
                              }
                              disabled={savePurchaseMutation.isPending}
                            />
                          )}
                        </TableCell>
                        <TableCell className="w-[140px]">
                          ${subtotal.toFixed(2)}
                        </TableCell>
                        {!isPurchaseCancelled && (
                          <TableCell className="w-[60px] text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeLine(line.id)}
                              disabled={savePurchaseMutation.isPending || lines.length === 1}
                            >
                              <TrashIcon className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4">
          <span className="text-lg font-semibold">Total:</span>
          <span className="text-2xl font-bold">${total.toFixed(2)}</span>
        </CardFooter>
      </Card>

      {/* Dialog de confirmación de cancelación */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cancelar compra?</DialogTitle>
            <DialogDescription>
              Esta acción marcará la compra como cancelada. Si hay una transacción asociada, será eliminada.
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsCancelDialogOpen(false)}
            >
              No cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
            >
              Sí, cancelar compra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
