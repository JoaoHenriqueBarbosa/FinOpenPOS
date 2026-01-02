"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Loader2Icon,
  PlusCircle,
  SearchIcon,
  FilterIcon,
  FilePenIcon,
  Trash2,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SupplierDTO, SupplierStatus } from "@/models/dto/supplier";
import { suppliersService } from "@/services";

export function SuppliersTab() {
  const [suppliers, setSuppliers] = useState<SupplierDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<{ status: "all" | SupplierStatus }>({
    status: "all",
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<SupplierDTO | null>(
    null
  );

  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<SupplierStatus>("active");

  const queryClient = useQueryClient();

  // React Query para compartir cache con otros componentes
  const {
    data: suppliersData = [],
    isLoading: loadingSuppliers,
    refetch: refetchSuppliers,
  } = useQuery({
    queryKey: ["suppliers"], // Mismo key que PurchasesPage y PurchasesHistoryPage
    queryFn: () => suppliersService.getAll(),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Sincronizar suppliersData con estado local para compatibilidad
  useEffect(() => {
    setSuppliers(suppliersData);
  }, [suppliersData]);

  const loading = loadingSuppliers;

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      if (filters.status !== "all" && s.status !== filters.status) {
        return false;
      }
      const term = searchTerm.toLowerCase();
      return (
        s.name.toLowerCase().includes(term) ||
        (s.contact_email ?? "").toLowerCase().includes(term) ||
        (s.phone ?? "").toLowerCase().includes(term)
      );
    });
  }, [suppliers, filters.status, searchTerm]);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setContactEmail("");
    setPhone("");
    setNotes("");
    setStatus("active");
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (supplier: SupplierDTO) => {
    setEditingId(supplier.id);
    setName(supplier.name);
    setContactEmail(supplier.contact_email ?? "");
    setPhone(supplier.phone ?? "");
    setNotes(supplier.notes ?? "");
    setStatus(supplier.status);
    setIsDialogOpen(true);
  };

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      console.error("Name is required");
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        contact_email: contactEmail.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
        status,
      };

      if (editingId === null) {
        // CREATE
        await suppliersService.create(payload);
      } else {
        // UPDATE
        await suppliersService.update(editingId, payload);
      }
      // Invalidar cache para refrescar datos
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });

      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error("Error saving supplier:", err);
    }
  }, [editingId, name, contactEmail, phone, notes, status, queryClient]);

  const handleDelete = useCallback(async () => {
    if (!supplierToDelete) return;

    try {
      await suppliersService.delete(supplierToDelete.id);

      // Invalidar cache para refrescar datos
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setSupplierToDelete(null);
      setIsDeleteDialogOpen(false);
    } catch (err) {
      console.error("Error deleting supplier:", err);
    }
  }, [supplierToDelete, queryClient]);

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2Icon className="mx-auto h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-500">{error}</p>
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
                placeholder="Buscar proveedores..."
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
                  <span>Filtros</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Estado</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={filters.status === "all"}
                  onCheckedChange={() =>
                    setFilters((prev) => ({ ...prev, status: "all" }))
                  }
                >
                  Todos
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.status === "active"}
                  onCheckedChange={() =>
                    setFilters((prev) => ({ ...prev, status: "active" }))
                  }
                >
                  Activos
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.status === "inactive"}
                  onCheckedChange={() =>
                    setFilters((prev) => ({ ...prev, status: "inactive" }))
                  }
                >
                  Inactivos
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button size="sm" onClick={openCreateDialog}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Nuevo proveedor
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Notas</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6">
                    No hay proveedores cargados.
                  </TableCell>
                </TableRow>
              )}
              {filteredSuppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.contact_email ?? "-"}</TableCell>
                  <TableCell>{supplier.phone ?? "-"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {supplier.notes ?? "-"}
                  </TableCell>
                  <TableCell className="capitalize">
                    {supplier.status === "active" ? "Activo" : "Inactivo"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(supplier)}
                      >
                        <FilePenIcon className="w-4 h-4" />
                        <span className="sr-only">Editar</span>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setSupplierToDelete(supplier);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="sr-only">Eliminar</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between items-center text-xs text-muted-foreground">
        <span>{filteredSuppliers.length} proveedores</span>
      </CardFooter>

      {/* Dialog crear/editar */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId === null ? "Nuevo proveedor" : "Editar proveedor"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="Nombre del proveedor"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contact_email">Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="col-span-3"
                placeholder="email@ejemplo.com"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="col-span-3"
                placeholder="+54 11 1234-5678"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes">Notas</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="col-span-3"
                placeholder="Información adicional"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label>Estado</Label>
              <Select
                value={status}
                onValueChange={(value: SupplierStatus) => setStatus(value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
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
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {editingId === null ? "Crear proveedor" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog eliminar */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar proveedor</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            ¿Estás seguro de que querés eliminar este proveedor? Esta acción
            no se puede deshacer.
          </p>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

