"use client";

import { useState, useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  SearchIcon,
  FilterIcon,
  FilePenIcon,
  TrashIcon,
  PlusIcon,
  Loader2Icon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCrud } from "@/hooks/use-crud";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  in_stock: number;
  category: string;
}

const emptyForm = { name: "", description: "", price: 0, in_stock: 0, category: "" };

export default function Products() {
  const { items: products, loading, add, update, remove } = useCrud<Product>({
    url: "/api/products",
    transformForApi: (data) => ({
      ...data,
      price: Math.round((data.price ?? 0) * 100),
    }),
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({ category: "all", inStock: "all" });
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 10;

  const isEditing = editingId !== null;

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (filters.category !== "all" && p.category !== filters.category) return false;
      if (filters.inStock === "in-stock" && p.in_stock === 0) return false;
      if (filters.inStock === "out-of-stock" && p.in_stock > 0) return false;
      return p.name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [products, filters.category, filters.inStock, searchTerm]);

  const currentProducts = filteredProducts.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({ name: p.name, description: p.description, price: p.price / 100, in_stock: p.in_stock, category: p.category });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const result = isEditing
      ? await update(editingId, form as Partial<Product>)
      : await add(form as Partial<Product>);
    if (result) {
      toast.success(isEditing ? "Product updated" : "Product created");
      setIsDialogOpen(false);
    } else {
      toast.error(isEditing ? "Failed to update product" : "Failed to create product");
    }
  };

  const handleDelete = async () => {
    if (deleteId !== null) {
      const ok = await remove(deleteId);
      ok ? toast.success("Product deleted") : toast.error("Failed to delete product");
      setIsDeleteOpen(false);
      setDeleteId(null);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (type: "category" | "inStock", value: string) => {
    setFilters((prev) => ({ ...prev, [type]: value }));
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <Card className="flex flex-col gap-6 p-6">
        <CardHeader className="p-0">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-9 w-32" />
          </div>
        </CardHeader>
        <CardContent className="p-0 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
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
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={handleSearch}
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
                  <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {["all", "electronics", "home", "health"].map((cat) => (
                    <DropdownMenuCheckboxItem
                      key={cat}
                      checked={filters.category === cat}
                      onCheckedChange={() => handleFilterChange("category", cat)}
                    >
                      {cat === "all" ? "All Categories" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </DropdownMenuCheckboxItem>
                  ))}
                  <DropdownMenuSeparator />
                  {["all", "in-stock", "out-of-stock"].map((stock) => (
                    <DropdownMenuCheckboxItem
                      key={stock}
                      checked={filters.inStock === stock}
                      onCheckedChange={() => handleFilterChange("inStock", stock)}
                    >
                      {stock === "all" ? "All Stock" : stock === "in-stock" ? "In Stock" : "Out of Stock"}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Button size="sm" onClick={openCreate}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.description}</TableCell>
                    <TableCell>${(product.price / 100).toFixed(2)}</TableCell>
                    <TableCell>{product.in_stock}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(product)}>
                          <FilePenIcon className="w-4 h-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => { setDeleteId(product.id); setIsDeleteOpen(true); }}
                        >
                          <TrashIcon className="w-4 h-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter />
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) setIsDialogOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Product" : "Add New Product"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Edit the details of the product." : "Enter the details of the new product."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Description</Label>
              <Input id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">Price</Label>
              <Input id="price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="in_stock" className="text-right">In Stock</Label>
              <Input id="in_stock" type="number" value={form.in_stock} onChange={(e) => setForm({ ...form, in_stock: Number(e.target.value) })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">Category</Label>
              <Select value={form.category} onValueChange={(value) => setForm({ ...form, category: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="clothing">Clothing</SelectItem>
                  <SelectItem value="books">Books</SelectItem>
                  <SelectItem value="home">Home</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave}>{isEditing ? "Update Product" : "Add Product"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDelete}
        description="Are you sure you want to delete this product? This action cannot be undone."
      />
    </>
  );
}
