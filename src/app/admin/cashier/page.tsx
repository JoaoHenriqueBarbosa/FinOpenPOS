"use client";

import { useState } from "react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { EllipsisVerticalIcon, Loader2Icon } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { RouterInputs } from "@/lib/trpc/router";

type TransactionCreate = RouterInputs["transactions"]["create"];
type TransactionForm = { description: string; category: string; type: TransactionCreate["type"]; amount: number; status: NonNullable<TransactionCreate["status"]> };
const emptyForm: TransactionForm = { description: "", category: "", type: "income", amount: 0, status: "completed" };

export default function Cashier() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: transactions = [], isLoading } = useQuery(trpc.transactions.list.queryOptions());

  const createMutation = useMutation(trpc.transactions.create.mutationOptions({
    onSuccess: () => { queryClient.invalidateQueries(trpc.transactions.list.queryOptions()); toast.success("Transaction created"); setForm(emptyForm); },
    onError: () => toast.error("Failed to create transaction"),
  }));
  const updateMutation = useMutation(trpc.transactions.update.mutationOptions({
    onSuccess: () => { queryClient.invalidateQueries(trpc.transactions.list.queryOptions()); toast.success("Transaction updated"); setIsEditOpen(false); },
    onError: () => toast.error("Failed to update transaction"),
  }));
  const deleteMutation = useMutation(trpc.transactions.delete.mutationOptions({
    onSuccess: () => { queryClient.invalidateQueries(trpc.transactions.list.queryOptions()); toast.success("Transaction deleted"); },
    onError: () => toast.error("Failed to delete transaction"),
  }));

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<TransactionForm>(emptyForm);

  const openEdit = (t: typeof transactions[0]) => {
    setEditingId(t.id);
    setForm({ description: t.description ?? "", category: t.category ?? "", type: (t.type ?? "income") as TransactionForm["type"], amount: t.amount / 100, status: (t.status ?? "completed") as TransactionForm["status"] });
    setIsEditOpen(true);
  };

  const handleEditSave = () => {
    if (editingId === null) return;
    updateMutation.mutate({ id: editingId, description: form.description, category: form.category, type: form.type, amount: Math.round(form.amount * 100), status: form.status });
  };

  const handleAddTransaction = () => {
    if (!form.description.trim()) { toast.error("Description is required"); return; }
    if (form.amount <= 0) { toast.error("Amount must be greater than zero"); return; }
    createMutation.mutate({ description: form.description, category: form.category, type: form.type, amount: Math.round(form.amount * 100), status: form.status });
  };

  const handleDelete = () => {
    if (deleteId !== null) { deleteMutation.mutate({ id: deleteId }); setIsDeleteOpen(false); setDeleteId(null); }
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Cashier Transactions</CardTitle>
          <CardDescription>Manage your cashier transactions.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => (<div key={i} className="flex items-center gap-4"><Skeleton className="h-4 w-12" /><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-24" /><Skeleton className="h-6 w-16 rounded-full" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-20" /><Skeleton className="h-6 w-16 rounded-full" /></div>))}</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Description</TableHead><TableHead>Category</TableHead><TableHead>Type</TableHead><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.id}</TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>{transaction.category}</TableCell>
                    <TableCell><Badge variant={transaction.type as "income" | "expense" | undefined}>{transaction.type}</Badge></TableCell>
                    <TableCell>{formatDate(transaction.created_at!)}</TableCell>
                    <TableCell>${(transaction.amount / 100).toFixed(2)}</TableCell>
                    <TableCell><Badge variant={transaction.status === "completed" ? "default" : "secondary"}>{transaction.status}</Badge></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><EllipsisVerticalIcon className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openEdit(transaction)}>Edit</DropdownMenuItem><DropdownMenuItem onClick={() => { setDeleteId(transaction.id); setIsDeleteOpen(true); }}>Delete</DropdownMenuItem></DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell className="font-medium text-muted-foreground">New</TableCell>
                  <TableCell><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="h-8" /></TableCell>
                  <TableCell><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category" className="h-8" /></TableCell>
                  <TableCell><Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value as TransactionForm["type"] })}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="income">Income</SelectItem><SelectItem value="expense">Expense</SelectItem></SelectContent></Select></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{formatDate(new Date().toISOString())}</TableCell>
                  <TableCell><div className="relative"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span><Input type="number" min="0.01" step="0.01" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} placeholder="0.00" className="h-8 pl-5" /></div></TableCell>
                  <TableCell><Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value as TransactionForm["status"] })}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="completed">Completed</SelectItem><SelectItem value="pending">Pending</SelectItem></SelectContent></Select></TableCell>
                  <TableCell><Button size="sm" onClick={handleAddTransaction} disabled={createMutation.isPending}>{createMutation.isPending ? <Loader2Icon className="h-4 w-4 animate-spin" /> : "Add"}</Button></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={(open) => { if (!open) setIsEditOpen(false); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Transaction</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit-desc">Description</Label><Input id="edit-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="col-span-3" /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit-cat">Category</Label><Input id="edit-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="col-span-3" /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit-type">Type</Label><Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as TransactionForm["type"] })}><SelectTrigger id="edit-type" className="col-span-3"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="income">Income</SelectItem><SelectItem value="expense">Expense</SelectItem></SelectContent></Select></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit-amount">Amount</Label><Input id="edit-amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className="col-span-3" /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="edit-status">Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as TransactionForm["status"] })}><SelectTrigger id="edit-status" className="col-span-3"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="completed">Completed</SelectItem><SelectItem value="pending">Pending</SelectItem></SelectContent></Select></div>
          </div>
          <DialogFooter><Button variant="secondary" onClick={() => setIsEditOpen(false)}>Cancel</Button><Button onClick={handleEditSave} disabled={updateMutation.isPending}>{updateMutation.isPending ? <Loader2Icon className="h-4 w-4 animate-spin mr-2" /> : null}Update</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} onConfirm={handleDelete} description="Are you sure you want to delete this transaction? This action cannot be undone." />
    </>
  );
}
