"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Loader2Icon,
  PlusCircle,
  Trash2,
  FilePenIcon,
  CreditCardIcon,
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
import { Label } from "@/components/ui/label";

type PaymentMethod = {
  id: number;
  name: string;
};

export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [methodToDelete, setMethodToDelete] = useState<PaymentMethod | null>(
    null
  );
  const [name, setName] = useState("");

  const isEditing = selectedId !== null;

  useEffect(() => {
    const fetchMethods = async () => {
      try {
        const response = await fetch("/api/payment-methods");
        if (!response.ok) throw new Error("Failed to fetch payment methods");
        const data = await response.json();
        setMethods(data);
      } catch (error) {
        setError((error as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchMethods();
  }, []);

  const resetForm = () => {
    setSelectedId(null);
    setName("");
  };

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;

    try {
      const url = isEditing
        ? `/api/payment-methods/${selectedId}`
        : "/api/payment-methods";

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) throw new Error("Failed to save payment method");

      const saved = await response.json();

      if (isEditing) {
        setMethods(methods.map((m) => (m.id === saved.id ? saved : m)));
      } else {
        setMethods([...methods, saved]);
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
    }
  }, [name, isEditing, selectedId, methods]);

  const handleDelete = useCallback(async () => {
    if (!methodToDelete) return;

    try {
      const response = await fetch(
        `/api/payment-methods/${methodToDelete.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Failed to delete payment method");

      setMethods(methods.filter((m) => m.id !== methodToDelete.id));
      setIsDeleteOpen(false);
      setMethodToDelete(null);
    } catch (error) {
      console.error(error);
    }
  }, [methodToDelete, methods]);

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
            <span className="text-sm">
              {methods.length} method{methods.length !== 1 && "s"}
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}
          >
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
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setSelectedId(method.id);
                        setName(method.name);
                        setIsDialogOpen(true);
                      }}
                    >
                      <FilePenIcon className="w-4 h-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setMethodToDelete(method);
                        setIsDeleteOpen(true);
                      }}
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

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsDialogOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Payment Method" : "New Payment Method"}
            </DialogTitle>
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          Are you sure you want to delete &quot;{methodToDelete?.name}&quot;?
          Transactions using this method may be affected.
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
