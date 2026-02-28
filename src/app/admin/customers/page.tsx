"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { PlusCircle, Trash2, SearchIcon, FilterIcon, FilePenIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { RouterInputs } from "@/lib/trpc/router";

type CustomerCreate = RouterInputs["customers"]["create"];
type CustomerForm = Pick<CustomerCreate, "name" | "email"> & { phone: string; status: NonNullable<CustomerCreate["status"]> };
const emptyForm: CustomerForm = { name: "", email: "", phone: "", status: "active" };

export default function CustomersPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: customers = [], isLoading, error } = useQuery(trpc.customers.list.queryOptions());

  const createMutation = useMutation(trpc.customers.create.mutationOptions({
    onSuccess: () => { queryClient.invalidateQueries(trpc.customers.list.queryOptions()); toast.success("Customer created"); setIsDialogOpen(false); },
    onError: () => toast.error("Failed to create customer"),
  }));
  const updateMutation = useMutation(trpc.customers.update.mutationOptions({
    onSuccess: () => { queryClient.invalidateQueries(trpc.customers.list.queryOptions()); toast.success("Customer updated"); setIsDialogOpen(false); },
    onError: () => toast.error("Failed to update customer"),
  }));
  const deleteMutation = useMutation(trpc.customers.delete.mutationOptions({
    onSuccess: () => { queryClient.invalidateQueries(trpc.customers.list.queryOptions()); toast.success("Customer deleted"); },
    onError: () => toast.error("Failed to delete customer"),
  }));

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const isEditing = editingId !== null;

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      const q = searchTerm.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.phone ?? "").includes(searchTerm);
    });
  }, [customers, statusFilter, searchTerm]);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setIsDialogOpen(true); };
  const openEdit = (c: typeof customers[0]) => {
    setEditingId(c.id);
    setForm({ name: c.name, email: c.email, phone: c.phone ?? "", status: (c.status ?? "active") as CustomerForm["status"] });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (isEditing) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = () => {
    if (deleteId !== null) { deleteMutation.mutate({ id: deleteId }); setIsDeleteOpen(false); setDeleteId(null); }
  };

  if (isLoading) {
    return (
      <Card className="flex flex-col gap-6 p-6">
        <CardHeader className="p-0"><div className="flex items-center justify-between"><Skeleton className="h-10 w-48" /><Skeleton className="h-9 w-32" /></div></CardHeader>
        <CardContent className="p-0 space-y-3">{Array.from({ length: 5 }).map((_, i) => (<div key={i} className="flex items-center gap-4"><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-16" /><Skeleton className="h-8 w-20" /></div>))}</CardContent>
      </Card>
    );
  }

  if (error) { return <Card><CardContent><p className="text-red-500">{error.message}</p></CardContent></Card>; }

  return (
    <Card className="flex flex-col gap-6 p-6">
      <CardHeader className="p-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative"><Input type="text" placeholder="Search customers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-8" /><SearchIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /></div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="gap-1"><FilterIcon className="w-4 h-4" /><span>Filters</span></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48"><DropdownMenuLabel>Filter by Status</DropdownMenuLabel><DropdownMenuSeparator />{["all", "active", "inactive"].map((s) => (<DropdownMenuCheckboxItem key={s} checked={statusFilter === s} onCheckedChange={() => setStatusFilter(s)}>{s === "all" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}</DropdownMenuCheckboxItem>))}</DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button size="sm" onClick={openCreate}><PlusCircle className="w-4 h-4 mr-2" />Add Customer</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>{customer.name}</TableCell><TableCell>{customer.email}</TableCell><TableCell>{customer.phone}</TableCell><TableCell>{customer.status}</TableCell>
                  <TableCell><div className="flex items-center gap-2"><Button size="icon" variant="ghost" onClick={() => openEdit(customer)}><FilePenIcon className="w-4 h-4" /><span className="sr-only">Edit</span></Button><Button size="icon" variant="ghost" onClick={() => { setDeleteId(customer.id); setIsDeleteOpen(true); }}><Trash2 className="w-4 h-4" /><span className="sr-only">Delete</span></Button></div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center" />

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) setIsDialogOpen(false); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isEditing ? "Edit Customer" : "Create New Customer"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="name">Name</Label><Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="col-span-3" /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="email">Email</Label><Input id="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="col-span-3" /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="phone">Phone</Label><Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="col-span-3" /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="status">Status</Label><Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as CustomerForm["status"] })}><SelectTrigger id="status" className="col-span-3"><SelectValue placeholder="Select status" /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>{isEditing ? "Update Customer" : "Create Customer"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} onConfirm={handleDelete} description="Are you sure you want to delete this customer? This action cannot be undone." />
    </Card>
  );
}
