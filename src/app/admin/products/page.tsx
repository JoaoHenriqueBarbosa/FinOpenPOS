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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/useDebounce";
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
  TagIcon,
  PackageIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
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

import type { ProductDTO } from "@/models/dto/product";
import type { ProductCategoryDTO } from "@/models/dto/product";
import { productsService, productCategoriesService } from "@/services/products.service";
import { ProductCategoriesTab } from "@/components/product-categories/ProductCategoriesTab";

type Product = ProductDTO;

export default function Products() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"products" | "categories">("products");
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [categories, setCategories] = useState<ProductCategoryDTO[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<{
    categoryId: "all" | number;
  }>({
    categoryId: "all",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(10);
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState<number | "">("");
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
    setProductCategoryId("none");
  };

  const queryClient = useQueryClient();

  // Fetch functions para React Query
  async function fetchProducts(): Promise<ProductDTO[]> {
    return productsService.getAll();
  }

  async function fetchCategories(): Promise<ProductCategoryDTO[]> {
    return productCategoriesService.getAll(true);
  }

  // React Query para compartir cache con otros componentes
  const {
    data: productsData = [],
    isLoading: loadingProducts,
  } = useQuery({
    queryKey: ["products"], // Mismo key que PurchasesPage y OrderDetailPage
    queryFn: fetchProducts,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const {
    data: categoriesData = [],
    isLoading: loadingCategories,
  } = useQuery({
    queryKey: ["product-categories", "onlyActive"],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 10, // 10 minutos - las categorías cambian raramente
  });

  // Sincronizar con estado local para compatibilidad
  useEffect(() => {
    setProducts(productsData);
    setCategories(categoriesData);
  }, [productsData, categoriesData]);

  const loading = loadingProducts || loadingCategories;

  // Debounce search term para evitar filtros costosos en cada keystroke
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (
        filters.categoryId !== "all" &&
        product.category?.id !== Number(filters.categoryId)
      ) {
        return false;
      }

      const term = debouncedSearchTerm.toLowerCase();
      return (
        product.name.toLowerCase().includes(term) ||
        (product.description ?? "").toLowerCase().includes(term)
      );
    });
  }, [products, filters.categoryId, debouncedSearchTerm]);

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
    type: "categoryId",
    value: "all" | number
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
        uses_stock: true,
        min_stock: 0,
        category_id:
          productCategoryId === "none" ? null : Number(productCategoryId),
        is_active: true,
      };

      const addedProduct = await productsService.create(newProductPayload);
      // Invalidar cache para refrescar datos
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsAddProductDialogOpen(false);
      resetSelectedProduct();
    } catch (error) {
      console.error("Error adding product:", error);
    }
  }, [
    productName,
    productDescription,
    productPrice,
    productCategoryId,
  ]);

  const handleEditProduct = useCallback(async () => {
    if (!selectedProductId) return;

    try {
      const price = typeof productPrice === "string" ? Number(productPrice) : productPrice;
      
      const updatedProductPayload: Partial<Product> & {
        category_id?: number | null;
      } = {
        name: productName,
        description: productDescription || null,
        price,
        category_id:
          productCategoryId === "none" ? null : Number(productCategoryId),
      };

      await productsService.update(selectedProductId, updatedProductPayload);
      // Invalidar cache para refrescar datos
      queryClient.invalidateQueries({ queryKey: ["products"] });
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
    productCategoryId,
  ]);

  const handleDeleteProduct = useCallback(async () => {
    if (!productToDelete) return;
    try {
      await productsService.delete(productToDelete.id);

      // Invalidar cache para refrescar datos
      queryClient.invalidateQueries({ queryKey: ["products"] });
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
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "products" | "categories")}>
        <TabsList className="mb-4">
          <TabsTrigger value="products">
            <PackageIcon className="w-4 h-4 mr-2" />
            Productos
          </TabsTrigger>
          <TabsTrigger value="categories">
            <TagIcon className="w-4 h-4 mr-2" />
            Categorías
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products">
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
                        <TableCell>{getCategoryName(product.category?.id ?? null)}</TableCell>
                        <TableCell>${product.price.toFixed(2)}</TableCell>
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
                                setProductCategoryId(
                                  product.category?.id ?? "none"
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
        </TabsContent>

        <TabsContent value="categories">
          <ProductCategoriesTab />
        </TabsContent>
      </Tabs>

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
              {isAddProductDialogOpen ? "Crear Producto" : "Editar Producto"}
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
              Estas seguro de que quieres eliminar este producto? Esta accion no se 
              puede revertir.
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
