"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PlusCircle, Trash2, FilePenIcon, CreditCardIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function PaymentMethodsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: methods = [], isLoading, error } = useQuery(trpc.paymentMethods.list.queryOptions());

  const createMutation = useMutation(trpc.paymentMethods.create.mutationOptions({
    onSuccess: () => { queryClient.invalidateQueries(trpc.paymentMethods.list.queryOptions()); toast.success("Payment method created"); setIsDialogOpen(false); },
    onError: () => toast.error("Failed to create"),
  }));
  const updateMutation = useMutation(trpc.paymentMethods.update.mutationOptions({
    onSuccess: () => { queryClient.invalidateQueries(trpc.paymentMethods.list.queryOptions()); toast.success("Payment method updated"); setIsDialogOpen(false); },
    onError: () => toast.error("Failed to update"),
  }));
  const deleteMutation = useMutation(trpc.paymentMethods.delete.mutationOptions({
    onSuccess: () => { queryClient.invalidateQueries(trpc.paymentMethods.list.queryOptions()); toast.success("Payment method deleted"); },
    onError: () => toast.error("Failed to delete"),
  }));

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [name, setName] = useState("");

  const isEditing = editingId !== null;

  const openCreate = () => { setEditingId(null); setName(""); setIsDialogOpen(true); };
  const openEdit = (m: typeof methods[0]) => { setEditingId(m.id); setName(m.name); setIsDialogOpen(true); };

  const handleSave = () => {
    if (!name.trim()) return;
    if (isEditing) { updateMutation.mutate({ id: editingId, name }); }
    else { createMutation.mutate({ name }); }
  };

  const handleDelete = () => {
    if (deleteId !== null) { deleteMutation.mutate({ id: deleteId }); setIsDeleteOpen(false); setDeleteId(null); }
  };

  if (isLoading) {
    return (
      <Card className="flex flex-col gap-6 p-6">
        <CardHeader className="p-0"><div className="flex items-center justify-between"><Skeleton className="h-5 w-24" /><Skeleton className="h-9 w-28" /></div></CardHeader>
        <CardContent className="p-0 space-y-3">{Array.from({ length: 3 }).map((_, i) => (<div key={i} className="flex items-center justify-between"><Skeleton className="h-4 w-32" /><Skeleton className="h-8 w-20" /></div>))}</CardContent>
      </Card>
    );
  }

  if (error) { return <Card><CardContent><p className="text-red-500">{error.message}</p></CardContent></Card>; }

  return (
    <Card className="flex flex-col gap-6 p-6">
      <CardHeader className="p-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground"><CreditCardIcon className="w-5 h-5" /><span className="text-sm">{methods.length} method{methods.length !== 1 && "s"}</span></div>
          <Button size="sm" onClick={openCreate}><PlusCircle className="w-4 h-4 mr-2" />Add Method</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="w-[100px]">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {methods.map((method) => (
              <TableRow key={method.id}>
                <TableCell>{method.name}</TableCell>
                <TableCell><div className="flex items-center gap-2"><Button size="icon" variant="ghost" onClick={() => openEdit(method)}><FilePenIcon className="w-4 h-4" /><span className="sr-only">Edit</span></Button><Button size="icon" variant="ghost" onClick={() => { setDeleteId(method.id); setIsDeleteOpen(true); }}><Trash2 className="w-4 h-4" /><span className="sr-only">Delete</span></Button></div></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) setIsDialogOpen(false); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isEditing ? "Edit Payment Method" : "New Payment Method"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4"><div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="method-name">Name</Label><Input id="method-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Credit Card, PIX, Cash" className="col-span-3" onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }} /></div></div>
          <DialogFooter><Button variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={!name.trim() || createMutation.isPending || updateMutation.isPending}>{isEditing ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} onConfirm={handleDelete} description="Are you sure you want to delete this payment method? Transactions using this method may be affected." />
    </Card>
  );
}
