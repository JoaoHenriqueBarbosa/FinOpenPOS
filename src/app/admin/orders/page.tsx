"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import {
  Loader2Icon,
  PlusCircle,
  Trash2,
  SearchIcon,
  FilterIcon,
  FilePenIcon,
  EyeIcon,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useCrud } from "@/hooks/use-crud";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";

type Order = {
  id: number;
  customer_id: number;
  total_amount: number;
  status: "completed" | "pending" | "cancelled";
  created_at: string;
  customer: { name: string };
};

type OrderForm = { customerName: string; total: string; status: "completed" | "pending" | "cancelled" };
const emptyForm: OrderForm = { customerName: "", total: "", status: "pending" };

export default function OrdersPage() {
  const { items: orders, loading, error, add, update, remove } = useCrud<Order>({ url: "/api/orders" });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const isEditing = editingId !== null;

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      const q = searchTerm.toLowerCase();
      return o.customer.name.toLowerCase().includes(q) || o.id.toString().includes(searchTerm);
    });
  }, [orders, statusFilter, searchTerm]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsDialogOpen(true);
  };

  const openEdit = (o: Order) => {
    setEditingId(o.id);
    setForm({
      customerName: o.customer.name,
      total: (o.total_amount / 100).toString(),
      status: o.status,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const payload = {
      total_amount: Math.round(parseFloat(form.total) * 100),
      status: form.status,
      created_at: isEditing
        ? orders.find((o) => o.id === editingId)?.created_at
        : new Date().toISOString().split("T")[0],
    };
    if (isEditing) {
      await update(editingId, payload as Partial<Order>);
    } else {
      await add(payload as Partial<Order>);
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deleteId !== null) {
      await remove(deleteId);
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2Icon className="mx-auto h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent>
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="flex flex-col gap-6 p-6">
      <CardHeader className="p-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-8"
              />
              <SearchIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <FilterIcon className="w-4 h-4" />
                  <span>Filters</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {["all", "completed", "pending", "cancelled"].map((s) => (
                  <DropdownMenuCheckboxItem
                    key={s}
                    checked={statusFilter === s}
                    onCheckedChange={() => setStatusFilter(s)}
                  >
                    {s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button size="sm" onClick={openCreate}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Create Order
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{order.id}</TableCell>
                  <TableCell>{order.customer.name}</TableCell>
                  <TableCell>${(order.total_amount / 100).toFixed(2)}</TableCell>
                  <TableCell>{order.status}</TableCell>
                  <TableCell>{order.created_at}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(order)}>
                        <FilePenIcon className="w-4 h-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { setDeleteId(order.id); setIsDeleteOpen(true); }}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                      <Link href={`/admin/orders/${order.id}`} prefetch={false}>
                        <Button size="icon" variant="ghost">
                          <EyeIcon className="w-4 h-4" />
                          <span className="sr-only">View</span>
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center" />

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) setIsDialogOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Order" : "Create New Order"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="total">Total</Label>
              <Input
                id="total"
                type="number"
                value={form.total}
                onChange={(e) => setForm({ ...form, total: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(value: "completed" | "pending" | "cancelled") => setForm({ ...form, status: value })}
              >
                <SelectTrigger id="status" className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{isEditing ? "Update Order" : "Create Order"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDelete}
        description="Are you sure you want to delete this order? This action cannot be undone."
      />
    </Card>
  );
}
