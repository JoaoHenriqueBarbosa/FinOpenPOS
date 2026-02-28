"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2Icon, PlusCircle, Trash2, FilePenIcon, CreditCardIcon } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { useCrud } from "@/hooks/use-crud";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";

type PaymentMethod = {
  id: number;
  name: string;
};

export default function PaymentMethodsPage() {
  const { items: methods, loading, error, add, update, remove } = useCrud<PaymentMethod>({ url: "/api/payment-methods" });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [name, setName] = useState("");

  const isEditing = editingId !== null;

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setIsDialogOpen(true);
  };

  const openEdit = (m: PaymentMethod) => {
    setEditingId(m.id);
    setName(m.name);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (isEditing) {
      await update(editingId, { name });
    } else {
      await add({ name } as Partial<PaymentMethod>);
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
          <div className="flex items-center gap-2 text-muted-foreground">
            <CreditCardIcon className="w-5 h-5" />
            <span className="text-sm">{methods.length} method{methods.length !== 1 && "s"}</span>
          </div>
          <Button size="sm" onClick={openCreate}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Method
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {methods.map((method) => (
              <TableRow key={method.id}>
                <TableCell>{method.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(method)}>
                      <FilePenIcon className="w-4 h-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => { setDeleteId(method.id); setIsDeleteOpen(true); }}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) setIsDialogOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Payment Method" : "New Payment Method"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="method-name">Name</Label>
              <Input
                id="method-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Credit Card, PIX, Cash"
                className="col-span-3"
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDelete}
        description={`Are you sure you want to delete this payment method? Transactions using this method may be affected.`}
      />
    </Card>
  );
}
