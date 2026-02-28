"use client";

import { useState, useMemo } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod/v4";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PlusCircle, FilePenIcon, TrashIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useCrudMutation } from "@/hooks/use-crud-mutation";
import { DataTable, TableActions, TableActionButton, type Column, type ExportColumn } from "@/components/ui/data-table";
import { SearchFilter, type FilterOption } from "@/components/ui/search-filter";
import type { RouterOutputs } from "@/lib/trpc/router";

type Customer = RouterOutputs["customers"]["list"][number];

const customerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string(),
  status: z.enum(["active", "inactive"]),
});

const statusFilterOptions: FilterOption[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active", variant: "success" },
  { label: "Inactive", value: "inactive", variant: "danger" },
];

const tableColumns: Column<Customer>[] = [
  { key: "name", header: "Name", sortable: true, className: "font-medium" },
  { key: "email", header: "Email", sortable: true },
  { key: "phone", header: "Phone", hideOnMobile: true },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (row) => (
      <span className={row.status === "active" ? "text-green-600" : "text-muted-foreground"}>
        {row.status ?? "active"}
      </span>
    ),
  },
];

const exportColumns: ExportColumn<Customer>[] = [
  { key: "name", header: "Name", getValue: (c) => c.name },
  { key: "email", header: "Email", getValue: (c) => c.email },
  { key: "phone", header: "Phone", getValue: (c) => c.phone ?? "" },
  { key: "status", header: "Status", getValue: (c) => c.status ?? "active" },
];

export default function CustomersPage() {
  const trpc = useTRPC();
  const { data: customers = [], isLoading, error } = useQuery(trpc.customers.list.queryOptions());

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const isEditing = editingId !== null;
  const invalidateKeys = trpc.customers.list.queryOptions().queryKey;

  const createMutation = useCrudMutation({
    mutationOptions: trpc.customers.create.mutationOptions(),
    invalidateKeys,
    successMessage: "Customer created",
    errorMessage: "Failed to create customer",
    onSuccess: () => setIsDialogOpen(false),
  });

  const updateMutation = useCrudMutation({
    mutationOptions: trpc.customers.update.mutationOptions(),
    invalidateKeys,
    successMessage: "Customer updated",
    errorMessage: "Failed to update customer",
    onSuccess: () => setIsDialogOpen(false),
  });

  const deleteMutation = useCrudMutation({
    mutationOptions: trpc.customers.delete.mutationOptions(),
    invalidateKeys,
    successMessage: "Customer deleted",
    errorMessage: "Failed to delete customer",
  });

  const form = useForm({
    defaultValues: { name: "", email: "", phone: "", status: "active" as "active" | "inactive" },
    validators: {
      onSubmit: customerFormSchema,
    },
    onSubmit: ({ value }) => {
      const payload = {
        name: value.name,
        email: value.email,
        phone: value.phone || undefined,
        status: value.status,
      };
      if (isEditing) {
        updateMutation.mutate({ id: editingId, ...payload });
      } else {
        createMutation.mutate(payload);
      }
    },
  });

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      const q = searchTerm.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.phone ?? "").includes(searchTerm);
    });
  }, [customers, statusFilter, searchTerm]);

  const openCreate = () => {
    setEditingId(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditingId(c.id);
    form.reset();
    form.setFieldValue("name", c.name);
    form.setFieldValue("email", c.email);
    form.setFieldValue("phone", c.phone ?? "");
    form.setFieldValue("status", (c.status ?? "active") as "active" | "inactive");
    setIsDialogOpen(true);
  };

  const handleDelete = () => {
    if (deleteId !== null) {
      deleteMutation.mutate({ id: deleteId });
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  const actionsColumn: Column<Customer> = {
    key: "actions",
    header: "Actions",
    render: (row) => (
      <TableActions>
        <TableActionButton onClick={() => openEdit(row)} icon={<FilePenIcon className="w-4 h-4" />} label="Edit" />
        <TableActionButton variant="danger" onClick={() => { setDeleteId(row.id); setIsDeleteOpen(true); }} icon={<TrashIcon className="w-4 h-4" />} label="Delete" />
      </TableActions>
    ),
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
        <SearchFilter
          search={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search customers..."
          filters={[{ options: statusFilterOptions, value: statusFilter, onChange: setStatusFilter }]}
        >
          <Button size="sm" onClick={openCreate}><PlusCircle className="w-4 h-4 mr-2" />Add Customer</Button>
        </SearchFilter>
      </CardHeader>
      <CardContent className="p-0">
        <DataTable
          data={filteredCustomers}
          columns={[...tableColumns, actionsColumn]}
          exportColumns={exportColumns}
          exportFilename="customers"
          emptyMessage="No customers found."
          emptyIcon={<UsersIcon className="w-8 h-8" />}
          defaultSort={[{ id: "name", desc: false }]}
        />
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) setIsDialogOpen(false); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isEditing ? "Edit Customer" : "Create New Customer"}</DialogTitle></DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <div className="grid gap-4 py-4">
              <form.Field name="name">
                {(field) => (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name">Name</Label>
                    <div className="col-span-3">
                      <Input id="name" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} error={field.state.meta.errors.length > 0 ? field.state.meta.errors.map(e => e?.message ?? e).join(", ") : undefined} />
                    </div>
                  </div>
                )}
              </form.Field>
              <form.Field name="email">
                {(field) => (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email">Email</Label>
                    <div className="col-span-3">
                      <Input id="email" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} error={field.state.meta.errors.length > 0 ? field.state.meta.errors.map(e => e?.message ?? e).join(", ") : undefined} />
                    </div>
                  </div>
                )}
              </form.Field>
              <form.Field name="phone">
                {(field) => (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} className="col-span-3" />
                  </div>
                )}
              </form.Field>
              <form.Field name="status">
                {(field) => (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="status">Status</Label>
                    <Select value={field.state.value} onValueChange={(value) => field.handleChange(value as "active" | "inactive")}>
                      <SelectTrigger id="status" className="col-span-3"><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                    </Select>
                  </div>
                )}
              </form.Field>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <Button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
                    {isEditing ? "Update Customer" : "Create Customer"}
                  </Button>
                )}
              </form.Subscribe>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} onConfirm={handleDelete} description="Are you sure you want to delete this customer? This action cannot be undone." />
    </Card>
  );
}
