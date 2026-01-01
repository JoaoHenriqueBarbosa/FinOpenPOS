"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Loader2Icon, PlusIcon, TrashIcon, ShoppingCartIcon, LayersIcon, UsersIcon } from "lucide-react";
import type { ProductNestedDTO } from "@/models/dto/product";
import type { SupplierNestedDTO } from "@/models/dto/supplier";
import type { PaymentMethodNestedDTO } from "@/models/dto/payment-method";
import { productsService, suppliersService, paymentMethodsService, purchasesService } from "@/services";
import { PaymentMethodSelector } from "@/components/payment-method-selector/PaymentMethodSelector";
import { PurchasesHistoryTab } from "@/components/purchases/PurchasesHistoryTab";
import { SuppliersTab } from "@/components/purchases/SuppliersTab";

type PurchaseLine = {
  id: number;
  productId: number | "none";
  quantity: number | "";
  unitCost: number | "";
};

export default function PurchasesPage() {
  const [activeTab, setActiveTab] = useState<"purchases" | "history" | "suppliers">("purchases");
  const [products, setProducts] = useState<ProductNestedDTO[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierNestedDTO[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodNestedDTO[]>([]);
  const [saving, setSaving] = useState(false);

  const [selectedSupplierId, setSelectedSupplierId] = useState<number | "none">(
    "none"
  );
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    number | "none"
  >("none");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<PurchaseLine[]>([
    { id: 1, productId: "none", quantity: "", unitCost: "" },
  ]);

  // Fetch functions para React Query
  async function fetchProducts(): Promise<ProductNestedDTO[]> {
    return productsService.getAll();
  }

  async function fetchSuppliers(): Promise<SupplierNestedDTO[]> {
    return suppliersService.getAll();
  }

  async function fetchPaymentMethods(): Promise<PaymentMethodNestedDTO[]> {
    return paymentMethodsService.getAll(true, "BAR");
  }

  // React Query para compartir cache con otros componentes
  const {
    data: productsData = [],
    isLoading: loadingProducts,
  } = useQuery({
    queryKey: ["products"], // Mismo key que ProductsPage y OrderDetailPage
    queryFn: fetchProducts,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const {
    data: suppliersData = [],
    isLoading: loadingSuppliers,
  } = useQuery({
    queryKey: ["suppliers"], // Mismo key que SuppliersPage y PurchasesHistoryPage
    queryFn: fetchSuppliers,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const {
    data: paymentMethodsData = [],
    isLoading: loadingPM,
  } = useQuery({
    queryKey: ["payment-methods", "BAR"], // Mismo key que OrderDetailPage
    queryFn: fetchPaymentMethods,
    staleTime: 1000 * 60 * 10, // 10 minutos
  });

  // Sincronizar con estado local para compatibilidad
  useEffect(() => {
    setProducts(productsData);
    setSuppliers(suppliersData);
    setPaymentMethods(paymentMethodsData);
  }, [productsData, suppliersData, paymentMethodsData]);

  const loading = loadingProducts || loadingSuppliers || loadingPM;

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: prev.length ? prev[prev.length - 1].id + 1 : 1,
        productId: "none",
        quantity: "",
        unitCost: "",
      },
    ]);
  };

  const removeLine = (id: number) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const updateLine = (id: number, patch: Partial<PurchaseLine>) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
    );
  };

  const validLines = lines.filter(
    (l) =>
      l.productId !== "none" &&
      l.quantity !== "" &&
      l.unitCost !== "" &&
      Number(l.quantity) > 0 &&
      Number(l.unitCost) >= 0
  );

  const total = validLines.reduce(
    (sum, l) => sum + Number(l.quantity) * Number(l.unitCost),
    0
  );

  const handleSave = async () => {
    if (selectedSupplierId === "none") {
      console.error("Falta seleccionar proveedor");
      return;
    }

    if (validLines.length === 0) {
      console.error("No hay líneas válidas para guardar");
      return;
    }

    try {
      setSaving(true);

      await purchasesService.create({
        supplier_id: Number(selectedSupplierId),
        payment_method_id: selectedPaymentMethodId === "none" ? null : Number(selectedPaymentMethodId),
        notes: notes || null,
        items: validLines.map((l) => ({
          productId: Number(l.productId),
          quantity: Number(l.quantity),
          unitCost: Number(l.unitCost),
        })),
      });

      // Podrías usar un toast; por ahora reseteamos el formulario
      setSelectedSupplierId("none");
      setSelectedPaymentMethodId("none");
      setNotes("");
      setLines([{ id: 1, productId: "none", quantity: "", unitCost: "" }]);
    } catch (err) {
      console.error("Error al guardar compra:", err);
    } finally {
      setSaving(false);
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
    <>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "purchases" | "history" | "suppliers")}>
        <TabsList className="mb-4">
          <TabsTrigger value="purchases">
            <ShoppingCartIcon className="w-4 h-4 mr-2" />
            Compras
          </TabsTrigger>
          <TabsTrigger value="history">
            <LayersIcon className="w-4 h-4 mr-2" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="suppliers">
            <UsersIcon className="w-4 h-4 mr-2" />
            Proveedores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchases">
          <Card className="flex flex-col gap-4 p-6">
            <CardHeader className="p-0 space-y-1">
              <CardTitle>Compras a proveedores</CardTitle>
              <CardDescription>
                Registrá las compras para actualizar el stock con el costo de cada
                producto y registrar el gasto en caja.
              </CardDescription>
            </CardHeader>

      <CardContent className="space-y-6 p-0">
        {/* Datos generales */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Proveedor</Label>
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
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Factura A 0012-000123"
            />
          </div>
        </div>

        {/* Método de pago - Ocupa todo el ancho */}
        <div className="space-y-2">
          <PaymentMethodSelector
            paymentMethods={paymentMethods}
            selectedPaymentMethodId={selectedPaymentMethodId === "none" ? "none" : selectedPaymentMethodId}
            onSelect={(id) => setSelectedPaymentMethodId(id)}
            disabled={saving}
            isLoading={loadingPM}
          />
        </div>

        {/* Líneas de compra */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Productos comprados</h3>
            <Button variant="outline" size="sm" onClick={addLine}>
              <PlusIcon className="w-4 h-4 mr-1" />
              Agregar línea
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Costo unitario</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => {
                  const qty =
                    typeof line.quantity === "string"
                      ? Number(line.quantity)
                      : line.quantity;
                  const cost =
                    typeof line.unitCost === "string"
                      ? Number(line.unitCost)
                      : line.unitCost;

                  const subtotal =
                    !qty || !cost ? 0 : Number(qty) * Number(cost);

                  return (
                    <TableRow key={line.id}>
                      <TableCell className="min-w-[200px]">
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
                      </TableCell>

                      <TableCell className="w-[120px]">
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
                        />
                      </TableCell>

                      <TableCell className="w-[140px]">
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
                        />
                      </TableCell>

                      <TableCell className="w-[140px]">
                        ${subtotal.toFixed(2)}
                      </TableCell>

                      <TableCell className="w-[60px] text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeLine(line.id)}
                          disabled={lines.length === 1}
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 items-end">
        <div className="text-sm text-muted-foreground">
          Total de la compra:{" "}
          <span className="font-semibold">${total.toFixed(2)}</span>
        </div>
        <Button
          onClick={handleSave}
          disabled={
            saving ||
            validLines.length === 0 ||
            selectedSupplierId === "none"
          }
        >
          {saving && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
          Guardar compra y actualizar stock
        </Button>
      </CardFooter>
    </Card>
        </TabsContent>

        <TabsContent value="history">
          <PurchasesHistoryTab />
        </TabsContent>

        <TabsContent value="suppliers">
          <SuppliersTab />
        </TabsContent>
      </Tabs>
    </>
  );
}
