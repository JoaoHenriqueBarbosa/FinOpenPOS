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

type Category = {
  id: number;
  name: string;
  description: string | null;
  color: string | null;
  is_active: boolean;
  created_at: string;
};

type ActiveFilter = "all" | "active" | "inactive";

export default function ProductCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
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

  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] =
    useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null
  );

  const resetForm = () => {
    setSelectedCategoryId(null);
    setName("");
    setDescription("");
    setColor("");
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

  const openEditDialog = (category: Category) => {
    setSelectedCategoryId(category.id);
    setName(category.name);
    setDescription(category.description ?? "");
    setColor(category.color ?? "");
    setIsEdit(true);
    setIsDialogOpen(true);
  };

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      console.error("Name is required");
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      color: color.trim() || null,
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
          console.error("Failed to create category");
          return;
        }

        const created: Category = await res.json();
        setCategories((prev) => [...prev, created]);
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
          console.error("Failed to update category");
          return;
        }

        const updated: Category = await res.json();
        setCategories((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error("Error saving category:", err);
    }
  }, [isEdit, selectedCategoryId, name, description, color]);

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
        console.error("Failed to delete category");
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
    } catch (err) {
      console.error("Error deleting category:", err);
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
                  placeholder="Buscar categorias..."
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
              Add Category
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Descripcion</TableHead>
                  <TableHead>Color</TableHead>
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
                    <TableCell className="capitalize">
                      {cat.is_active ? "active" : "inactive"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(cat)}
                        >
                          <FilePenIcon className="w-4 h-4" />
                          <span className="sr-only">Edit</span>
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
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCategories.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6">
                      No categories found.
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
              {isEdit ? "Edit Category" : "Create Category"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update the category details."
                : "Enter details for the new category."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cat-name" className="text-right">
                Name
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
                Description
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
                Color (CSS)
              </Label>
              <Input
                id="cat-color"
                placeholder="#00b894 or red"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="col-span-3"
              />
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
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {isEdit ? "Update Category" : "Create Category"}
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
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              This will mark the category as inactive. Existing products will
              keep the reference.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteConfirmationOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
