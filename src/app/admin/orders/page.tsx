"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
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
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2Icon, PlusIcon, SearchIcon, FilePenIcon } from "lucide-react";
import Link from "next/link";

type OrderStatus = "open" | "closed" | "cancelled";

type Order = {
  id: number;
  customer_id: number | null;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  customer?: {
    name: string;
  } | null;
};

type Customer = {
  id: number;
  name: string;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("open");

  const [isNewOrderDialogOpen, setIsNewOrderDialogOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | "none">(
    "none"
  );
  const [creatingOrder, setCreatingOrder] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, customersRes] = await Promise.all([
          fetch("/api/orders"),
          fetch("/api/customers?onlyActive=true"),
        ]);

        if (!ordersRes.ok) throw new Error("Failed to fetch orders");
        const ordersData = await ordersRes.json();

        let customersData: Customer[] = [];
        if (customersRes.ok) {
          customersData = await customersRes.json();
        }

        setOrders(ordersData);
        setCustomers(customersData);
      } catch (err) {
        console.error("Error fetching orders/customers:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredOrders = orders.filter((order) => {
    if (statusFilter !== "all" && order.status !== statusFilter) return false;

    const term = searchTerm.toLowerCase();
    const customerName = order.customer?.name ?? "";
    const idString = String(order.id);

    return (
      customerName.toLowerCase().includes(term) ||
      idString.includes(term)
    );
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "open":
        return <Badge variant="outline">Open</Badge>;
      case "closed":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Paid</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/30">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCreateOrder = useCallback(async () => {
    try {
      setCreatingOrder(true);

      const payload: { customerId: number | null } = {
        customerId: selectedCustomerId === "none" ? null : Number(selectedCustomerId),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("Failed to create order");
        return;
      }

      const newOrder: Order = await res.json();
      setOrders((prev) => [newOrder, ...prev]);
      setIsNewOrderDialogOpen(false);
      setSelectedCustomerId("none");
    } catch (err) {
      console.error("Error creating order:", err);
    } finally {
      setCreatingOrder(false);
    }
  }, [selectedCustomerId]);

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2Icon className="mx-auto h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Card className="flex flex-col gap-6 p-6">
        <CardHeader className="p-0 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-xl font-semibold">
              Cuentas del buffet
            </CardTitle>
            <Button size="sm" onClick={() => setIsNewOrderDialogOpen(true)}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Abrir cuenta
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="relative max-w-xs w-full">
              <Input
                placeholder="Buscar por cliente o #cuenta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-8"
              />
              <SearchIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value: "all" | OrderStatus) =>
                setStatusFilter(value)
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="open">Abiertas</SelectItem>
                <SelectItem value="closed">Pagadas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">
                      #{order.id}
                    </TableCell>
                    <TableCell>
                      {order.customer?.name ?? "Sin nombre"}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>${order.total_amount.toFixed(2)}</TableCell>
                    <TableCell>
                      {new Date(order.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        asChild
                        size="icon"
                        variant="ghost"
                        title="Abrir cuenta"
                      >
                        <Link href={`/admin/orders/${order.id}`}>
                          <FilePenIcon className="w-4 h-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      No hay cuentas para mostrar.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between text-sm text-muted-foreground">
          <span>Total cuentas: {filteredOrders.length}</span>
        </CardFooter>
      </Card>

      {/* Nueva cuenta */}
      <Dialog
        open={isNewOrderDialogOpen}
        onOpenChange={(open) => {
          setIsNewOrderDialogOpen(open);
          if (!open) {
            setSelectedCustomerId("none");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir nueva cuenta</DialogTitle>
            <DialogDescription>
              Seleccioná el cliente para asociar la cuenta del buffet. Podés
              dejarla sin cliente si es algo rápido.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <span className="text-right text-sm font-medium">Cliente</span>
              <Select
                value={
                  selectedCustomerId === "none"
                    ? "none"
                    : String(selectedCustomerId)
                }
                onValueChange={(value) => {
                  if (value === "none") setSelectedCustomerId("none");
                  else setSelectedCustomerId(Number(value));
                }}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin cliente</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsNewOrderDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateOrder} disabled={creatingOrder}>
              {creatingOrder && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Abrir cuenta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
