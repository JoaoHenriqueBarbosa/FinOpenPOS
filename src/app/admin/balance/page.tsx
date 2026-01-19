"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { transactionsService } from "@/services/transactions.service";
import { partnersService, type PartnerDTO } from "@/services/partners.service";
import { paymentMethodsService } from "@/services/purchases.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";

type BalanceByPaymentMethod = {
  payment_method_id: number | null;
  payment_method_name: string | null;
  incomes: number;
  expenses: number;
  withdrawals: number;
  adjustments: number;
  balance: number;
};

export default function BalancePage() {
  const queryClient = useQueryClient();
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentDescription, setAdjustmentDescription] = useState("");
  const [adjustmentPaymentMethodId, setAdjustmentPaymentMethodId] = useState<string>("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalDescription, setWithdrawalDescription] = useState("");
  const [withdrawalPlayerId, setWithdrawalPlayerId] = useState<string>("");
  const [withdrawalPaymentMethodId, setWithdrawalPaymentMethodId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense" | "adjustment" | "withdrawal">("all");
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["transactions-balance", dateFrom, dateTo, typeFilter],
    queryFn: () =>
      transactionsService.getBalance({
        fromDate: dateFrom || undefined,
        toDate: dateTo || undefined,
        type: typeFilter === "all" ? undefined : typeFilter,
      }),
    staleTime: 1000 * 30,
  });

  // Cargar socios activos
  const { data: partners = [], isLoading: isLoadingPartners } = useQuery({
    queryKey: ["partners"],
    queryFn: () => partnersService.getAll(true), // solo activos
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Cargar métodos de pago (para scope BAR)
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["payment-methods", "BAR"],
    queryFn: () => paymentMethodsService.getAll(true, "BAR"),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const adjustmentMutation = useMutation({
    mutationFn: () =>
      transactionsService.createAdjustment({
        amount: Number(adjustmentAmount),
        description: adjustmentDescription,
        payment_method_id: adjustmentPaymentMethodId ? Number(adjustmentPaymentMethodId) : null,
      }),
    onSuccess: () => {
      toast.success("Ajuste registrado");
      setAdjustmentAmount("");
      setAdjustmentDescription("");
      setAdjustmentPaymentMethodId("");
      queryClient.invalidateQueries({ queryKey: ["transactions-balance"] });
    },
  });

  const withdrawalMutation = useMutation({
    mutationFn: () =>
      transactionsService.createWithdrawal({
        amount: Number(withdrawalAmount),
        description: withdrawalDescription,
        player_id: Number(withdrawalPlayerId),
        payment_method_id: withdrawalPaymentMethodId ? Number(withdrawalPaymentMethodId) : null,
      }),
    onSuccess: () => {
      toast.success("Retiro registrado");
      setWithdrawalAmount("");
      setWithdrawalDescription("");
      setWithdrawalPlayerId("");
      setWithdrawalPaymentMethodId("");
      queryClient.invalidateQueries({ queryKey: ["transactions-balance"] });
    },
  });

  const summary = data?.summary ?? {};
  const balanceByPaymentMethod = data?.balanceByPaymentMethod ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Balance</CardTitle>
              <CardDescription>Resumen de movimientos de caja</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setIsAdjustmentDialogOpen(true)}>Registrar ajuste</Button>
              <Button variant="outline" onClick={() => setIsWithdrawalDialogOpen(true)}>
                Registrar retiro
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Desde</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Hasta</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Tipo</span>
              <Select
                value={typeFilter}
                onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="income">Ingresos</SelectItem>
                  <SelectItem value="expense">Gastos</SelectItem>
                  <SelectItem value="adjustment">Ajustes</SelectItem>
                  <SelectItem value="withdrawal">Retiros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { key: "income", label: "Ingresos" },
              { key: "expense", label: "Gastos" },
              { key: "adjustment", label: "Ajustes" },
              { key: "withdrawal", label: "Retiros" },
            ].map(({ key, label }) => (
              <div key={key} className="border rounded-lg p-4 shadow-sm">
                <div className="text-xs uppercase text-muted-foreground">{label}</div>
                <div className="text-2xl font-bold">${(summary[key] ?? 0).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {balanceByPaymentMethod.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Balance por Método de Pago</CardTitle>
            <CardDescription>
              Desglose de ingresos, gastos, retiros y ajustes por método de pago
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-semibold">Método de Pago</th>
                    <th className="text-right p-2 font-semibold">Ingresos</th>
                    <th className="text-right p-2 font-semibold">Gastos</th>
                    <th className="text-right p-2 font-semibold">Retiros</th>
                    <th className="text-right p-2 font-semibold">Ajustes</th>
                    <th className="text-right p-2 font-semibold">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {balanceByPaymentMethod.map((method: BalanceByPaymentMethod, index: number) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="p-2">
                        {method.payment_method_name || "Sin método de pago"}
                      </td>
                      <td className="text-right p-2 text-green-600">
                        ${method.incomes.toFixed(2)}
                      </td>
                      <td className="text-right p-2 text-red-600">
                        ${method.expenses.toFixed(2)}
                      </td>
                      <td className="text-right p-2 text-red-600">
                        ${method.withdrawals.toFixed(2)}
                      </td>
                      <td className="text-right p-2 text-blue-600">
                        ${method.adjustments.toFixed(2)}
                      </td>
                      <td className="text-right p-2 font-bold">
                        <span
                          className={
                            method.balance >= 0 ? "text-green-600" : "text-red-600"
                          }
                        >
                          ${method.balance.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold">
                    <td className="p-2">TOTAL</td>
                    <td className="text-right p-2 text-green-600">
                      ${balanceByPaymentMethod.reduce((sum: number, m: BalanceByPaymentMethod) => sum + m.incomes, 0).toFixed(2)}
                    </td>
                    <td className="text-right p-2 text-red-600">
                      ${balanceByPaymentMethod.reduce((sum: number, m: BalanceByPaymentMethod) => sum + m.expenses, 0).toFixed(2)}
                    </td>
                    <td className="text-right p-2 text-red-600">
                      $
                      {balanceByPaymentMethod
                        .reduce((sum: number, m: BalanceByPaymentMethod) => sum + m.withdrawals, 0)
                        .toFixed(2)}
                    </td>
                    <td className="text-right p-2 text-blue-600">
                      $
                      {balanceByPaymentMethod
                        .reduce((sum: number, m: BalanceByPaymentMethod) => sum + m.adjustments, 0)
                        .toFixed(2)}
                    </td>
                    <td className="text-right p-2">
                      <span
                        className={
                          balanceByPaymentMethod.reduce((sum: number, m: BalanceByPaymentMethod) => sum + m.balance, 0) >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        $
                        {balanceByPaymentMethod
                          .reduce((sum: number, m: BalanceByPaymentMethod) => sum + m.balance, 0)
                          .toFixed(2)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Socios</CardTitle>
          <CardDescription>Lista de socios activos del sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPartners ? (
            <div className="text-center py-6 text-muted-foreground">Cargando socios...</div>
          ) : partners.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">No hay socios registrados.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Apellido</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners.map((partner: PartnerDTO) => (
                    <TableRow key={partner.id}>
                      <TableCell className="font-medium">{partner.id}</TableCell>
                      <TableCell>{partner.first_name}</TableCell>
                      <TableCell>{partner.last_name}</TableCell>
                      <TableCell>{partner.phone}</TableCell>
                      <TableCell>{partner.email || "-"}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            partner.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {partner.status === "active" ? "Activo" : "Inactivo"}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAdjustmentDialogOpen} onOpenChange={setIsAdjustmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar ajuste</DialogTitle>
            <DialogDescription>Ingresá el monto, método de pago y detalle del ajuste.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adjustment-amount">Monto</Label>
              <Input
                id="adjustment-amount"
                type="number"
                placeholder="Monto"
                value={adjustmentAmount}
                onChange={(e) => setAdjustmentAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjustment-payment-method">Método de Pago</Label>
              <Select
                value={adjustmentPaymentMethodId || undefined}
                onValueChange={(value) => setAdjustmentPaymentMethodId(value)}
              >
                <SelectTrigger id="adjustment-payment-method">
                  <SelectValue placeholder="Seleccionar método de pago (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id.toString()}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjustment-description">Descripción</Label>
              <Input
                id="adjustment-description"
                placeholder="Descripción del ajuste"
                value={adjustmentDescription}
                onChange={(e) => setAdjustmentDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsAdjustmentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => adjustmentMutation.mutate()}
              disabled={
                adjustmentMutation.isPending || !adjustmentAmount || !adjustmentDescription
              }
            >
              {adjustmentMutation.isPending ? "Guardando..." : "Guardar ajuste"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isWithdrawalDialogOpen} onOpenChange={setIsWithdrawalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar retiro</DialogTitle>
            <DialogDescription>Seleccioná el socio y registrá el retiro con descripción.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="withdrawal-player">Socio</Label>
              <Select
                value={withdrawalPlayerId}
                onValueChange={(value) => setWithdrawalPlayerId(value)}
              >
                <SelectTrigger id="withdrawal-player">
                  <SelectValue placeholder="Seleccionar socio" />
                </SelectTrigger>
                <SelectContent>
                  {partners.map((partner: PartnerDTO) => (
                    <SelectItem key={partner.id} value={partner.id.toString()}>
                      {partner.first_name} {partner.last_name} {partner.phone && `- ${partner.phone}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="withdrawal-amount">Monto</Label>
              <Input
                id="withdrawal-amount"
                type="number"
                placeholder="Monto"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="withdrawal-payment-method">Método de Pago</Label>
              <Select
                value={withdrawalPaymentMethodId || undefined}
                onValueChange={(value) => setWithdrawalPaymentMethodId(value)}
              >
                <SelectTrigger id="withdrawal-payment-method">
                  <SelectValue placeholder="Seleccionar método de pago (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id.toString()}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="withdrawal-description">Descripción</Label>
              <Input
                id="withdrawal-description"
                placeholder="Descripción del retiro"
                value={withdrawalDescription}
                onChange={(e) => setWithdrawalDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsWithdrawalDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => withdrawalMutation.mutate()}
              disabled={
                withdrawalMutation.isPending ||
                !withdrawalAmount ||
                !withdrawalDescription ||
                !withdrawalPlayerId
              }
            >
              {withdrawalMutation.isPending ? "Guardando..." : "Guardar retiro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
