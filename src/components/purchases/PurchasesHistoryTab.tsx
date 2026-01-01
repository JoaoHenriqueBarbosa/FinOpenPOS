"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
import { formatDateTime } from "@/lib/date-utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Loader2Icon,
  SearchIcon,
  FilterIcon,
  CalendarIcon,
  FilePenIcon,
  XCircleIcon,
} from "lucide-react";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import type { PurchaseDTO, PurchaseStatus } from "@/models/dto/purchase";
import type { SupplierNestedDTO } from "@/models/dto/supplier";
import type { PaymentMethodNestedDTO } from "@/models/dto/payment-method";
import { purchasesService, suppliersService, paymentMethodsService } from "@/services";
import { PaymentMethodSelector } from "@/components/payment-method-selector/PaymentMethodSelector";

export function PurchasesHistoryTab() {
  const queryClient = useQueryClient();
  const [purchases, setPurchases] = useState<PurchaseDTO[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierNestedDTO[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodNestedDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | "all">(
    "all"
  );
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    number | "all"
  >("all");
  const [statusFilter, setStatusFilter] = useState<"all" | PurchaseStatus>(
    "all"
  );
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // Estado para edición
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<PurchaseDTO | null>(null);
  const [editPaymentMethodId, setEditPaymentMethodId] = useState<number | "none">("none");
  const [editNotes, setEditNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Estado para cancelación
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [purchaseToCancel, setPurchaseToCancel] = useState<PurchaseDTO | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [purchasesData, suppliersData, paymentMethodsData] = await Promise.all([
          purchasesService.getAll(),
          suppliersService.getAll(),
          paymentMethodsService.getAll(true, "BAR"),
        ]);

        setPurchases(purchasesData);
        setSuppliers(suppliersData);
        setPaymentMethods(paymentMethodsData);
      } catch (err) {
        console.error("Error fetching purchases history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Debounce search term para evitar filtros costosos en cada keystroke
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      if (
        selectedSupplierId !== "all" &&
        p.supplier?.id !== selectedSupplierId
      ) {
        return false;
      }

      if (
        selectedPaymentMethodId !== "all" &&
        p.payment_method?.id !== selectedPaymentMethodId
      ) {
        return false;
      }

      if (statusFilter !== "all" && p.status !== statusFilter) {
        return false;
      }

      if (fromDate) {
        const from = new Date(fromDate);
        const created = new Date(p.created_at);
        if (created < from) return false;
      }

      if (toDate) {
        const to = new Date(toDate);
        const created = new Date(p.created_at);
        // sumar un día para inclusive
        to.setDate(to.getDate() + 1);
        if (created >= to) return false;
      }

      if (debouncedSearchTerm.trim()) {
        const term = debouncedSearchTerm.toLowerCase();
        const supplierName = p.supplier?.name.toLowerCase() ?? "";
        const pmName = p.payment_method?.name.toLowerCase() ?? "";
        const notes = p.notes?.toLowerCase() ?? "";
        const idStr = String(p.id);

        if (
          !supplierName.includes(term) &&
          !pmName.includes(term) &&
          !notes.includes(term) &&
          !idStr.includes(term)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    purchases,
    selectedSupplierId,
    selectedPaymentMethodId,
    statusFilter,
    fromDate,
    toDate,
    debouncedSearchTerm,
  ]);

  const totalFiltered = filteredPurchases.reduce(
    (sum, p) => sum + Number(p.total_amount),
    0
  );

  const openEditDialog = (purchase: PurchaseDTO) => {
    setEditingPurchase(purchase);
    setEditPaymentMethodId(purchase.payment_method?.id ?? "none");
    setEditNotes(purchase.notes ?? "");
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPurchase) return;

    try {
      setSaving(true);
      await purchasesService.update(editingPurchase.id, {
        payment_method_id: editPaymentMethodId === "none" ? null : editPaymentMethodId,
        notes: editNotes || null,
      });

      // Refrescar datos
      const purchasesData = await purchasesService.getAll();
      setPurchases(purchasesData);
      
      // Invalidar cache de React Query
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      
      setIsEditDialogOpen(false);
      setEditingPurchase(null);
    } catch (err) {
      console.error("Error updating purchase:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelPurchase = async () => {
    if (!purchaseToCancel) return;

    try {
      setCancelling(true);
      await purchasesService.cancel(purchaseToCancel.id);

      // Refrescar datos
      const purchasesData = await purchasesService.getAll();
      setPurchases(purchasesData);
      
      setIsCancelDialogOpen(false);
      setPurchaseToCancel(null);
    } catch (err) {
      console.error("Error cancelling purchase:", err);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2Icon className="mx-auto h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="flex flex-col gap-4 p-6">
      <CardHeader className="p-0 space-y-1">
        <CardTitle>Historial de compras</CardTitle>
        <CardDescription>
          Revisá las compras realizadas a proveedores, con sus montos, fechas y
          métodos de pago.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 p-0">
        {/* Filtros */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative">
              <Input
                type="text"
                placeholder="Buscar por proveedor, notas o #compra..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-8 w-64"
              />
              <SearchIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <FilterIcon className="w-4 h-4" />
                  <span>Filtros</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72">
                <DropdownMenuLabel>Proveedor</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="px-2 pb-2">
                  <Select
                    value={
                      selectedSupplierId === "all"
                        ? "all"
                        : String(selectedSupplierId)
                    }
                    onValueChange={(value) =>
                      setSelectedSupplierId(
                        value === "all" ? "all" : Number(value)
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los proveedores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <DropdownMenuLabel>Método de pago</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="px-2 pb-2">
                  <Select
                    value={
                      selectedPaymentMethodId === "all"
                        ? "all"
                        : String(selectedPaymentMethodId)
                    }
                    onValueChange={(value) =>
                      setSelectedPaymentMethodId(
                        value === "all" ? "all" : Number(value)
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los métodos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {paymentMethods.map((pm) => (
                        <SelectItem key={pm.id} value={String(pm.id)}>
                          {pm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <DropdownMenuLabel>Estado</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "all"}
                  onCheckedChange={() => setStatusFilter("all")}
                >
                  Todos
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "completed"}
                  onCheckedChange={() => setStatusFilter("completed")}
                >
                  Completadas
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "pending"}
                  onCheckedChange={() => setStatusFilter("pending")}
                >
                  Pendientes
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={statusFilter === "cancelled"}
                  onCheckedChange={() => setStatusFilter("cancelled")}
                >
                  Canceladas
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Rango de fechas */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-xs">
                <CalendarIcon className="w-3 h-3" />
                Desde
              </Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-xs">
                <CalendarIcon className="w-3 h-3" />
                Hasta
              </Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Método de pago</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchases.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6">
                    No se encontraron compras con los filtros actuales.
                  </TableCell>
                </TableRow>
              )}
              {filteredPurchases.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.id}</TableCell>
                  <TableCell>
                    {formatDateTime(p.created_at)}
                  </TableCell>
                  <TableCell>{p.supplier?.name ?? "-"}</TableCell>
                  <TableCell>{p.payment_method?.name ?? "-"}</TableCell>
                  <TableCell className="max-w-[240px] truncate">
                    {p.notes ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    ${Number(p.total_amount).toFixed(2)}
                  </TableCell>
                  <TableCell className="capitalize text-sm">
                    {p.status === "completed"
                      ? "Completada"
                      : p.status === "pending"
                      ? "Pendiente"
                      : "Cancelada"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {p.status !== "cancelled" && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditDialog(p)}
                          >
                            <FilePenIcon className="w-4 h-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setPurchaseToCancel(p);
                              setIsCancelDialogOpen(true);
                            }}
                          >
                            <XCircleIcon className="w-4 h-4 text-destructive" />
                            <span className="sr-only">Cancelar</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Resumen */}
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{filteredPurchases.length} compras encontradas</span>
          <span>
            Total filtrado:{" "}
            <span className="font-semibold">
              ${totalFiltered.toFixed(2)}
            </span>
          </span>
        </div>
      </CardContent>

      {/* Dialog de edición */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar compra #{editingPurchase?.id}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <PaymentMethodSelector
                paymentMethods={paymentMethods}
                selectedPaymentMethodId={editPaymentMethodId === "none" ? "none" : editPaymentMethodId}
                onSelect={(id) => setEditPaymentMethodId(id === "none" ? "none" : id)}
                disabled={saving}
                isLoading={false}
              />
              <p className="text-xs text-muted-foreground">
                {editPaymentMethodId === "none" 
                  ? "La compra quedará como pendiente" 
                  : "La compra quedará como completada"}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notas</Label>
              <Input
                id="edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Notas adicionales"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de cancelación */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar compra #{purchaseToCancel?.id}</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            ¿Estás seguro de que querés cancelar esta compra? Esta acción marcará la compra como cancelada.
          </p>
          {purchaseToCancel && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Proveedor:</strong> {purchaseToCancel.supplier?.name}</p>
              <p><strong>Total:</strong> ${Number(purchaseToCancel.total_amount).toFixed(2)}</p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsCancelDialogOpen(false)}
            >
              No cancelar
            </Button>
            <Button variant="destructive" onClick={handleCancelPurchase} disabled={cancelling}>
              {cancelling && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              Sí, cancelar compra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

