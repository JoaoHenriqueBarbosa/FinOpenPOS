"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  SearchIcon,
  FilterIcon,
  PlusIcon,
  FilePenIcon,
  TrashIcon,
  Loader2Icon,
} from "lucide-react";
import type { ProductCategoryDTO } from "@/models/dto/product";
import { toast } from "sonner";

type ActiveFilter = "all" | "active" | "inactive";

export function ProductCategoriesTab() {
  const [categories, setCategories] = useState<ProductCategoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
  const [categoryIsSellable, setCategoryIsSellable] = useState(true);

  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] =
    useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategoryDTO | null>(
    null
  );

  const resetForm = () => {
    setSelectedCategoryId(null);
    setName("");
    setDescription("");
    setColor("");
    setCategoryIsSellable(true);
    setIsEdit(false);
  };

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/product-categories");
        if (!res.ok) throw new Error("Failed to fetch categories");
        const data = await res.json();
        setCategories(data);
      } catch (err) {
        console.error("Error fetching categories:", err);
        toast.error("Error al cargar las categorías");
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      if (activeFilter === "active" && !cat.is_active) return false;
      if (activeFilter === "inactive" && cat.is_active) return false;

      const term = searchTerm.toLowerCase();
      return (
        cat.name.toLowerCase().includes(term) ||
        (cat.description ?? "").toLowerCase().includes(term)
      );
    });
  }, [categories, activeFilter, searchTerm]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsEdit(false);
    setIsDialogOpen(true);
  };

  const openEditDialog = (category: ProductCategoryDTO) => {
    setSelectedCategoryId(category.id);
    setName(category.name);
    setDescription(category.description ?? "");
    setColor(category.color ?? "");
    setIsEdit(true);
    setIsDialogOpen(true);
    setCategoryIsSellable(category.is_sellable);
  };

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      color: color.trim() || null,
      is_sellable: categoryIsSellable,
    };

    try {
      // Create
      if (!isEdit) {
        const res = await fetch("/api/product-categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          toast.error("Error al crear la categoría");
          return;
        }

        const created: ProductCategoryDTO = await res.json();
        setCategories((prev) => [...prev, created]);
        toast.success("Categoría creada correctamente");
      } else if (selectedCategoryId) {
        // Edit
        const res = await fetch(
          `/api/product-categories/${selectedCategoryId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        if (!res.ok) {
          toast.error("Error al actualizar la categoría");
          return;
        }

        const updated: ProductCategoryDTO = await res.json();
        setCategories((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
        toast.success("Categoría actualizada correctamente");
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error("Error saving category:", err);
      toast.error("Error al guardar la categoría");
    }
  }, [
    isEdit,
    selectedCategoryId,
    name,
    description,
    color,
    categoryIsSellable,
  ]);

  const handleDelete = useCallback(async () => {
    if (!categoryToDelete) return;

    try {
      const res = await fetch(
        `/api/product-categories/${categoryToDelete.id}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        toast.error("Error al eliminar la categoría");
        return;
      }

      // Soft delete → is_active = false, así que lo reflejamos en memoria
      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryToDelete.id ? { ...c, is_active: false } : c
        )
      );
      setIsDeleteConfirmationOpen(false);
      setCategoryToDelete(null);
      toast.success("Categoría eliminada correctamente");
    } catch (err) {
      console.error("Error deleting category:", err);
      toast.error("Error al eliminar la categoría");
    }
  }, [categoryToDelete]);

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
        <CardHeader className="p-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Buscar categorías..."
                  value={searchTerm}
                  onChange={handleSearchChange}
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
                  <DropdownMenuLabel>Filtrar por Estado</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={activeFilter === "all"}
                    onCheckedChange={() => setActiveFilter("all")}
                  >
                    Todos
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={activeFilter === "active"}
                    onCheckedChange={() => setActiveFilter("active")}
                  >
                    Activos
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={activeFilter === "inactive"}
                    onCheckedChange={() => setActiveFilter("inactive")}
                  >
                    Inactivos
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Button size="sm" onClick={openCreateDialog}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Nueva categoría
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Venta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell>{cat.description}</TableCell>
                    <TableCell>
                      {cat.color ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block w-4 h-4 rounded-full border"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {cat.color}
                          </span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {cat.is_sellable ? (
                        <span className="text-emerald-600 font-medium">Sí</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {cat.is_active ? (
                        <span className="text-green-600 font-medium">Activa</span>
                      ) : (
                        <span className="text-gray-500">Inactiva</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(cat)}
                        >
                          <FilePenIcon className="w-4 h-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setCategoryToDelete(cat);
                            setIsDeleteConfirmationOpen(true);
                          }}
                          disabled={!cat.is_active}
                        >
                          <TrashIcon className="w-4 h-4" />
                          <span className="sr-only">Eliminar</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCategories.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6">
                      No se encontraron categorías.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter />
      </Card>

      {/* Create / Edit Dialog */}
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
              {isEdit ? "Editar categoría" : "Nueva categoría"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Actualizá los detalles de la categoría."
                : "Completá los datos para la nueva categoría."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cat-name" className="text-right">
                Nombre
              </Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cat-description" className="text-right">
                Descripción
              </Label>
              <Input
                id="cat-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cat-color" className="text-right">
                Color
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <div className="relative">
                  <input
                    type="color"
                    id="cat-color-picker"
                    value={color && color.startsWith('#') ? color : '#000000'}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-10 w-16 cursor-pointer rounded border border-input bg-background"
                  />
                </div>
                <Input
                  id="cat-color"
                  placeholder="#00b894 o nombre CSS"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cat-sellable" className="text-right">
                ¿Se vende?
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Switch
                  id="cat-sellable"
                  checked={categoryIsSellable}
                  onCheckedChange={(checked) =>
                    setCategoryIsSellable(Boolean(checked))
                  }
                />
                <span className="text-sm text-muted-foreground">
                  Los productos de esta categoría aparecerán en los selectores de venta solo si está habilitada.
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {isEdit ? "Actualizar categoría" : "Crear categoría"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={isDeleteConfirmationOpen}
        onOpenChange={setIsDeleteConfirmationOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              Esto marcará la categoría como inactiva. Los productos existentes
              mantendrán la referencia.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteConfirmationOpen(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

