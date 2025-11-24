"use client";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
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

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  category_id: number | null;
  is_active: boolean;
}

interface ProductCategory {
  id: number;
  name: string;
}

type InStockFilter = "all" | "in-stock" | "out-of-stock";

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<{
    categoryId: "all" | number;
    inStock: InStockFilter;
  }>({
    categoryId: "all",
    inStock: "all",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState<number | "">("");
  const [productStock, setProductStock] = useState<number | "">("");
  const [productCategoryId, setProductCategoryId] = useState<
    number | "none"
  >("none");
  const [isEditProductDialogOpen, setIsEditProductDialogOpen] =
    useState(false);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] =
    useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const resetSelectedProduct = () => {
    setSelectedProductId(null);
    setProductName("");
    setProductDescription("");
    setProductPrice("");
    setProductStock("");
    setProductCategoryId("none");
  };

  // Fetch products + categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/product-categories?onlyActive=true"),
        ]);

        if (!productsRes.ok) {
          throw new Error("Failed to fetch products");
        }
        const productsData = await productsRes.json();

        let categoriesData: ProductCategory[] = [];
        if (categoriesRes.ok) {
          categoriesData = await categoriesRes.json();
        }

        setProducts(productsData);
        setCategories(categoriesData);
      } catch (error) {
        console.error("Error fetching products/categories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (
        filters.categoryId !== "all" &&
        product.category_id !== filters.categoryId
      ) {
        return false;
      }

      if (filters.inStock === "in-stock" && product.stock_quantity <= 0) {
        return false;
      }

      if (filters.inStock === "out-of-stock" && product.stock_quantity > 0) {
        return false;
      }

      const term = searchTerm.toLowerCase();
      return (
        product.name.toLowerCase().includes(term) ||
        (product.description ?? "").toLowerCase().includes(term)
      );
    });
  }, [products, filters.categoryId, filters.inStock, searchTerm]);

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(
    indexOfFirstProduct,
    indexOfLastProduct
  );

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (
    type: "categoryId" | "inStock",
    value: "all" | InStockFilter | number
  ) => {
    setFilters((prev) => ({
      ...prev,
      [type]: value,
    }));
    setCurrentPage(1);
  };

  const handleAddProduct = useCallback(async () => {
    try {
      const price = typeof productPrice === "string" ? Number(productPrice) : productPrice;
      const stock =
        typeof productStock === "string" ? Number(productStock) : productStock;

      if (!productName.trim()) {
        console.error("Product name is required");
        return;
      }

      if (Number.isNaN(price) || price <= 0) {
        console.error("Price must be a positive number");
        return;
      }

      const newProductPayload = {
        name: productName,
        description: productDescription || null,
        price,
        stock_quantity: Number.isNaN(stock) ? 0 : stock ?? 0,
        uses_stock: true,
        min_stock: 0,
        category_id:
          productCategoryId === "none" ? null : Number(productCategoryId),
        is_active: true,
      };

      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newProductPayload),
      });

      if (!response.ok) {
        console.error("Failed to add product");
        return;
      }

      const addedProduct: Product = await response.json();
      setProducts((prev) => [...prev, addedProduct]);
      setIsAddProductDialogOpen(false);
      resetSelectedProduct();
    } catch (error) {
      console.error("Error adding product:", error);
    }
  }, [
    productName,
    productDescription,
    productPrice,
    productStock,
    productCategoryId,
  ]);

  const handleEditProduct = useCallback(async () => {
    if (!selectedProductId) return;

    try {
      const price = typeof productPrice === "string" ? Number(productPrice) : productPrice;
      const stock =
        typeof productStock === "string" ? Number(productStock) : productStock;

      const updatedProductPayload: Partial<Product> & {
        category_id?: number | null;
        stock_quantity?: number;
      } = {
        name: productName,
        description: productDescription || null,
        price,
        stock_quantity: Number.isNaN(stock) ? 0 : stock ?? 0,
        category_id:
          productCategoryId === "none" ? null : Number(productCategoryId),
      };

      const response = await fetch(`/api/products/${selectedProductId}`, {
        method: "PATCH", // usamos PATCH, no PUT
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedProductPayload),
      });

      if (!response.ok) {
        console.error("Failed to update product");
        return;
      }

      const updatedProductFromServer: Product = await response.json();
      setProducts((prev) =>
        prev.map((p) =>
          p.id === updatedProductFromServer.id ? updatedProductFromServer : p
        )
      );
      setIsEditProductDialogOpen(false);
      resetSelectedProduct();
    } catch (error) {
      console.error("Error updating product:", error);
    }
  }, [
    selectedProductId,
    productName,
    productDescription,
    productPrice,
    productStock,
    productCategoryId,
  ]);

  const handleDeleteProduct = useCallback(async () => {
    if (!productToDelete) return;
    try {
      const response = await fetch(`/api/products/${productToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        console.error("Failed to delete product");
        return;
      }

      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      setIsDeleteConfirmationOpen(false);
      setProductToDelete(null);
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  }, [productToDelete]);

  const getCategoryName = (categoryId: number | null) => {
    if (categoryId == null) return "-";
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? cat.name : "-";
  };

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
                  placeholder="Buscar productos..."
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
                    <span>Filtros</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Filtrar por Categoria</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={filters.categoryId === "all"}
                    onCheckedChange={() =>
                      handleFilterChange("categoryId", "all")
                    }
                  >
                    Todas
                  </DropdownMenuCheckboxItem>
                  {categories.map((cat) => (
                    <DropdownMenuCheckboxItem
                      key={cat.id}
                      checked={filters.categoryId === cat.id}
                      onCheckedChange={() =>
                        handleFilterChange("categoryId", cat.id)
                      }
                    >
                      {cat.name}
                    </DropdownMenuCheckboxItem>
                  ))}

                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Filtrar por Stock</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={filters.inStock === "all"}
                    onCheckedChange={() =>
                      handleFilterChange("inStock", "all")
                    }
                  >
                    Todas
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filters.inStock === "in-stock"}
                    onCheckedChange={() =>
                      handleFilterChange("inStock", "in-stock")
                    }
                  >
                    Con Stock
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filters.inStock === "out-of-stock"}
                    onCheckedChange={() =>
                      handleFilterChange("inStock", "out-of-stock")
                    }
                  >
                    Sin Stock
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Button size="sm" onClick={() => setIsAddProductDialogOpen(true)}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Crear Producto
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Descripcion</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      {product.name}
                    </TableCell>
                    <TableCell>{product.description}</TableCell>
                    <TableCell>{getCategoryName(product.category_id)}</TableCell>
                    <TableCell>${product.price.toFixed(2)}</TableCell>
                    <TableCell>{product.stock_quantity}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSelectedProductId(product.id);
                            setProductName(product.name);
                            setProductDescription(product.description ?? "");
                            setProductPrice(product.price);
                            setProductStock(product.stock_quantity);
                            setProductCategoryId(
                              product.category_id ?? "none"
                            );
                            setIsEditProductDialogOpen(true);
                          }}
                        >
                          <FilePenIcon className="w-4 h-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setProductToDelete(product);
                            setIsDeleteConfirmationOpen(true);
                          }}
                        >
                          <TrashIcon className="w-4 h-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {currentProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      No se encontraron productos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(
            (page) => (
              <Button
                key={page}
                size="sm"
                variant={page === currentPage ? "default" : "outline"}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </Button>
            )
          )}
        </CardFooter>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog
        open={isAddProductDialogOpen || isEditProductDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddProductDialogOpen(false);
            setIsEditProductDialogOpen(false);
            resetSelectedProduct();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isAddProductDialogOpen ? "Add New Product" : "Edit Product"}
            </DialogTitle>
            <DialogDescription>
              {isAddProductDialogOpen
                ? "Enter the details of the new product."
                : "Edit the details of the product."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Input
                id="description"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Price
              </Label>
              <Input
                id="price"
                type="number"
                value={productPrice}
                onChange={(e) =>
                  setProductPrice(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stock" className="text-right">
                Stock
              </Label>
              <Input
                id="stock"
                type="number"
                value={productStock}
                onChange={(e) =>
                  setProductStock(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Category
              </Label>
              <Select
                value={
                  productCategoryId === "none"
                    ? "none"
                    : String(productCategoryId)
                }
                onValueChange={(value) => {
                  if (value === "none") {
                    setProductCategoryId("none");
                  } else {
                    setProductCategoryId(Number(value));
                  }
                }}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={
                isAddProductDialogOpen ? handleAddProduct : handleEditProduct
              }
            >
              {isAddProductDialogOpen ? "Add Product" : "Update Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog
        open={isDeleteConfirmationOpen}
        onOpenChange={setIsDeleteConfirmationOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this product? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteConfirmationOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProduct}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
