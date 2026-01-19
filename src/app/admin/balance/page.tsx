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

export default function BalancePage() {
  const queryClient = useQueryClient();
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentDescription, setAdjustmentDescription] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalDescription, setWithdrawalDescription] = useState("");
  const [withdrawalPlayerId, setWithdrawalPlayerId] = useState("");
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

  const adjustmentMutation = useMutation({
    mutationFn: () =>
      transactionsService.createAdjustment({
        amount: Number(adjustmentAmount),
        description: adjustmentDescription,
      }),
    onSuccess: () => {
      toast.success("Ajuste registrado");
      setAdjustmentAmount("");
      setAdjustmentDescription("");
      queryClient.invalidateQueries({ queryKey: ["transactions-balance"] });
    },
  });

  const withdrawalMutation = useMutation({
    mutationFn: () =>
      transactionsService.createWithdrawal({
        amount: Number(withdrawalAmount),
        description: withdrawalDescription,
        player_id: Number(withdrawalPlayerId),
      }),
    onSuccess: () => {
      toast.success("Retiro registrado");
      setWithdrawalAmount("");
      setWithdrawalDescription("");
      setWithdrawalPlayerId("");
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
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {["income", "expense", "adjustment", "withdrawal"].map((type) => (
              <div key={type} className="border rounded-lg p-4 shadow-sm">
                <div className="text-xs uppercase text-muted-foreground">{type}</div>
                <div className="text-2xl font-bold">${(summary[type] ?? 0).toFixed(2)}</div>
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
                  {balanceByPaymentMethod.map((method, index) => (
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
                      ${balanceByPaymentMethod.reduce((sum, m) => sum + m.incomes, 0).toFixed(2)}
                    </td>
                    <td className="text-right p-2 text-red-600">
                      ${balanceByPaymentMethod.reduce((sum, m) => sum + m.expenses, 0).toFixed(2)}
                    </td>
                    <td className="text-right p-2 text-red-600">
                      $
                      {balanceByPaymentMethod
                        .reduce((sum, m) => sum + m.withdrawals, 0)
                        .toFixed(2)}
                    </td>
                    <td className="text-right p-2 text-blue-600">
                      $
                      {balanceByPaymentMethod
                        .reduce((sum, m) => sum + m.adjustments, 0)
                        .toFixed(2)}
                    </td>
                    <td className="text-right p-2">
                      <span
                        className={
                          balanceByPaymentMethod.reduce((sum, m) => sum + m.balance, 0) >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }
                      >
                        $
                        {balanceByPaymentMethod
                          .reduce((sum, m) => sum + m.balance, 0)
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

      <Dialog open={isAdjustmentDialogOpen} onOpenChange={setIsAdjustmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar ajuste</DialogTitle>
            <DialogDescription>Ingresá el monto y detalle del ajuste.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="number"
              placeholder="Monto"
              value={adjustmentAmount}
              onChange={(e) => setAdjustmentAmount(e.target.value)}
            />
            <Input
              placeholder="Descripción"
              value={adjustmentDescription}
              onChange={(e) => setAdjustmentDescription(e.target.value)}
            />
          </div>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsAdjustmentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => adjustmentMutation.mutate()}
              disabled={
                adjustmentMutation.isLoading || !adjustmentAmount || !adjustmentDescription
              }
            >
              {adjustmentMutation.isLoading ? "Guardando..." : "Guardar ajuste"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isWithdrawalDialogOpen} onOpenChange={setIsWithdrawalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar retiro</DialogTitle>
            <DialogDescription>Registrá el retiro de socio con descripción.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="number"
              placeholder="Monto"
              value={withdrawalAmount}
              onChange={(e) => setWithdrawalAmount(e.target.value)}
            />
            <Input
              placeholder="Descripción"
              value={withdrawalDescription}
              onChange={(e) => setWithdrawalDescription(e.target.value)}
            />
            <Input
              type="number"
              placeholder="ID del socio"
              value={withdrawalPlayerId}
              onChange={(e) => setWithdrawalPlayerId(e.target.value)}
            />
          </div>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsWithdrawalDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => withdrawalMutation.mutate()}
              disabled={
                withdrawalMutation.isLoading ||
                !withdrawalAmount ||
                !withdrawalDescription ||
                !withdrawalPlayerId
              }
            >
              {withdrawalMutation.isLoading ? "Guardando..." : "Guardar retiro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
