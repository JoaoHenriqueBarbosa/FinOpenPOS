"use client";

import { useState, useMemo } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod/v4";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FilePenIcon, TrashIcon, EyeIcon, ShoppingCartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useCrudMutation } from "@/hooks/use-crud-mutation";
import { DataTable, TableActions, TableActionButton, type Column, type ExportColumn } from "@/components/ui/data-table";
import { SearchFilter, type FilterOption } from "@/components/ui/search-filter";
import type { RouterOutputs } from "@/lib/trpc/router";

type Order = RouterOutputs["orders"]["list"][number];
type OrderStatus = "completed" | "pending" | "cancelled";

const orderEditSchema = z.object({
  total: z.string().min(1, "Total is required"),
  status: z.enum(["completed", "pending", "cancelled"]),
});

const statusFilterOptions: FilterOption[] = [
  { label: "All", value: "all" },
  { label: "Completed", value: "completed", variant: "success" },
  { label: "Pending", value: "pending", variant: "warning" },
  { label: "Cancelled", value: "cancelled", variant: "danger" },
];

const tableColumns: Column<Order>[] = [
  { key: "id", header: "Order ID", sortable: true },
  {
    key: "customer",
    header: "Customer",
    sortable: true,
    accessorFn: (row) => row.customer?.name ?? "",
    render: (row) => row.customer?.name ?? "",
  },
  {
    key: "total_amount",
    header: "Total",
    sortable: true,
    accessorFn: (row) => row.total_amount,
    render: (row) => `$${(row.total_amount / 100).toFixed(2)}`,
  },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (row) => {
      const s = row.status ?? "pending";
      const color = s === "completed" ? "text-green-600" : s === "cancelled" ? "text-red-600" : "text-yellow-600";
      return <span className={color}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>;
    },
  },
  {
    key: "created_at",
    header: "Date",
    sortable: true,
    hideOnMobile: true,
    accessorFn: (row) => row.created_at ? new Date(row.created_at).getTime() : 0,
    render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : "",
  },
];

const exportColumns: ExportColumn<Order>[] = [
  { key: "id", header: "Order ID", getValue: (o) => o.id },
  { key: "customer", header: "Customer", getValue: (o) => o.customer?.name ?? "" },
  { key: "total", header: "Total", getValue: (o) => (o.total_amount / 100).toFixed(2) },
  { key: "status", header: "Status", getValue: (o) => o.status ?? "pending" },
  { key: "date", header: "Date", getValue: (o) => o.created_at ? new Date(o.created_at).toLocaleDateString() : "" },
];

export default function OrdersPage() {
  const trpc = useTRPC();
  const { data: orders = [], isLoading, error } = useQuery(trpc.orders.list.queryOptions());

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editCustomerName, setEditCustomerName] = useState("");

  const invalidateKeys = trpc.orders.list.queryOptions().queryKey;

  const updateMutation = useCrudMutation({
    mutationOptions: trpc.orders.update.mutationOptions(),
    invalidateKeys,
    successMessage: "Order updated",
    errorMessage: "Failed to update order",
    onSuccess: () => setIsDialogOpen(false),
  });

  const deleteMutation = useCrudMutation({
    mutationOptions: trpc.orders.delete.mutationOptions(),
    invalidateKeys,
    successMessage: "Order deleted",
    errorMessage: "Failed to delete order",
  });

  const form = useForm({
    defaultValues: { total: "", status: "pending" as OrderStatus },
    validators: {
      onSubmit: orderEditSchema,
    },
    onSubmit: ({ value }) => {
      if (editingId !== null) {
        updateMutation.mutate({
          id: editingId,
          total_amount: Math.round(parseFloat(value.total) * 100),
          status: value.status,
        });
      }
    },
  });

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      const q = searchTerm.toLowerCase();
      return (o.customer?.name ?? "").toLowerCase().includes(q) || o.id.toString().includes(searchTerm);
    });
  }, [orders, statusFilter, searchTerm]);

  const openEdit = (o: Order) => {
    setEditingId(o.id);
    setEditCustomerName(o.customer?.name ?? "");
    form.reset();
    form.setFieldValue("total", (o.total_amount / 100).toString());
    form.setFieldValue("status", (o.status ?? "pending") as OrderStatus);
    setIsDialogOpen(true);
  };

  const handleDelete = () => {
    if (deleteId !== null) {
      deleteMutation.mutate({ id: deleteId });
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  const actionsColumn: Column<Order> = {
    key: "actions",
    header: "Actions",
    render: (row) => (
      <TableActions>
        <TableActionButton onClick={() => openEdit(row)} icon={<FilePenIcon className="w-4 h-4" />} label="Edit" />
        <TableActionButton variant="danger" onClick={() => { setDeleteId(row.id); setIsDeleteOpen(true); }} icon={<TrashIcon className="w-4 h-4" />} label="Delete" />
        <Link href={`/admin/orders/${row.id}`} prefetch={false} onClick={(e) => e.stopPropagation()}>
          <Button size="icon" variant="ghost"><EyeIcon className="w-4 h-4" /><span className="sr-only">View</span></Button>
        </Link>
      </TableActions>
    ),
  };

  if (isLoading) {
    return (
      <Card className="flex flex-col gap-6 p-6">
        <CardHeader className="p-0"><div className="flex items-center justify-between"><Skeleton className="h-10 w-48" /><Skeleton className="h-9 w-32" /></div></CardHeader>
        <CardContent className="p-0 space-y-3">{Array.from({ length: 5 }).map((_, i) => (<div key={i} className="flex items-center gap-4"><Skeleton className="h-4 w-12" /><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-24" /></div>))}</CardContent>
      </Card>
    );
  }

  if (error) { return <Card><CardContent><p className="text-red-500">{error.message}</p></CardContent></Card>; }

  return (
    <Card className="flex flex-col gap-6 p-6">
      <CardHeader className="p-0">
        <SearchFilter
          search={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search orders..."
          filters={[{ options: statusFilterOptions, value: statusFilter, onChange: setStatusFilter }]}
        />
      </CardHeader>
      <CardContent className="p-0">
        <DataTable
          data={filteredOrders}
          columns={[...tableColumns, actionsColumn]}
          exportColumns={exportColumns}
          exportFilename="orders"
          emptyMessage="No orders found."
          emptyIcon={<ShoppingCartIcon className="w-8 h-8" />}
          defaultSort={[{ id: "created_at", desc: true }]}
        />
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) setIsDialogOpen(false); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Order</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="customerName">Customer</Label>
                <Input id="customerName" value={editCustomerName} disabled className="col-span-3" />
              </div>
              <form.Field name="total">
                {(field) => (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="total">Total</Label>
                    <div className="col-span-3">
                      <Input id="total" type="number" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} error={field.state.meta.errors.length > 0 ? field.state.meta.errors.map(e => e?.message ?? e).join(", ") : undefined} />
                    </div>
                  </div>
                )}
              </form.Field>
              <form.Field name="status">
                {(field) => (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="status">Status</Label>
                    <Select value={field.state.value} onValueChange={(value) => field.handleChange(value as OrderStatus)}>
                      <SelectTrigger id="status" className="col-span-3"><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </form.Field>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending}>Update Order</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} onConfirm={handleDelete} description="Are you sure you want to delete this order? This action cannot be undone." />
    </Card>
  );
}
