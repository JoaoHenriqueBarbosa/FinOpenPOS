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
import { toast } from "sonner";
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
  CardTitle,
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
  Share2Icon,
  WarehouseIcon,
  CalendarIcon,
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
import { Switch } from "@/components/ui/switch";
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
import { stockMovementsService } from "@/services/stock-movements.service";
import type { StockStatisticsItem } from "@/services/stock-movements.service";
import { ProductCategoriesTab } from "@/components/product-categories/ProductCategoriesTab";
import { ProductFliersTab } from "@/components/products/ProductFliersTab";

type Product = ProductDTO;

export default function Products() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"products" | "categories" | "share" | "stock">("products");
  
  // Filtros para control de stock
  const [stockFromDate, setStockFromDate] = useState<string>("");
  const [stockToDate, setStockToDate] = useState<string>("");
  const [stockCategoryFilter, setStockCategoryFilter] = useState<"all" | number>("all");
  
  // Dialog para ajuste de stock
  const [isAdjustmentDialogOpen, setIsAdjustmentDialogOpen] = useState(false);
  const [adjustmentProductId, setAdjustmentProductId] = useState<number | "none">("none");
  const [adjustmentQuantity, setAdjustmentQuantity] = useState<number | "">("");
  const [adjustmentNotes, setAdjustmentNotes] = useState<string>("");
  const [creatingAdjustment, setCreatingAdjustment] = useState(false);
  const [products, setProducts] = useState<ProductDTO[]>([]);
  const [categories, setCategories] = useState<ProductCategoryDTO[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<{
    categoryId: "all" | number;
  }>({
    categoryId: "all",
  });
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "active"
  );
  const [usesStockFilter, setUsesStockFilter] = useState<
    "all" | "uses_stock" | "no_stock"
  >("all");
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
  const [productUsesStock, setProductUsesStock] = useState(true);
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
    setProductUsesStock(true);
  };

  const queryClient = useQueryClient();

async function fetchCategories(): Promise<ProductCategoryDTO[]> {
  return productCategoriesService.getAll({ onlyActive: true });
}

  // React Query para compartir cache con otros componentes
  const {
    data: productsData = [],
    isLoading: loadingProducts,
    isError: productsError,
    error: productsErrorData,
  } = useQuery({
    queryKey: ["products", statusFilter], // Mismo key que PurchasesPage y OrderDetailPage
    queryFn: () => productsService.getAll(statusFilter),
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  const {
    data: categoriesData = [],
    isLoading: loadingCategories,
    isError: categoriesError,
    error: categoriesErrorData,
  } = useQuery({
    queryKey: ["product-categories", "onlyActive"],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 10, // 10 minutos - las categorías cambian raramente
  });

  // Mostrar errores de carga
  useEffect(() => {
    if (productsError) {
      const errorMessage = productsErrorData instanceof Error 
        ? productsErrorData.message 
        : "Error al cargar los productos";
      toast.error(errorMessage);
    }
  }, [productsError, productsErrorData]);

  useEffect(() => {
    if (categoriesError) {
      const errorMessage = categoriesErrorData instanceof Error 
        ? categoriesErrorData.message 
        : "Error al cargar las categorías";
      toast.error(errorMessage);
    }
  }, [categoriesError, categoriesErrorData]);

  // Query para estadísticas de stock
  const {
    data: stockStatistics = [],
    isLoading: loadingStockStats,
    refetch: refetchStockStats,
  } = useQuery({
    queryKey: ["stock-statistics", stockFromDate, stockToDate, stockCategoryFilter],
    queryFn: async () => {
      return stockMovementsService.getStatistics({
        fromDate: stockFromDate || undefined,
        toDate: stockToDate || undefined,
        categoryId: stockCategoryFilter === "all" ? undefined : Number(stockCategoryFilter),
      });
    },
    enabled: activeTab === "stock",
    staleTime: 1000 * 30, // 30 segundos
  });

  // Mutation para crear ajuste de stock
  const createAdjustmentMutation = useMutation({
    mutationFn: async (input: { productId: number; quantity: number; notes?: string }) => {
      return stockMovementsService.createAdjustment(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-statistics"] });
      setIsAdjustmentDialogOpen(false);
      setAdjustmentProductId("none");
      setAdjustmentQuantity("");
      setAdjustmentNotes("");
      toast.success("Ajuste de stock creado correctamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear el ajuste de stock");
    },
  });

  const handleCreateAdjustment = useCallback(async () => {
    if (adjustmentProductId === "none") {
      toast.error("Debe seleccionar un producto");
      return;
    }

    if (adjustmentQuantity === "" || Number(adjustmentQuantity) === 0) {
      toast.error("La cantidad debe ser diferente de cero");
      return;
    }

    setCreatingAdjustment(true);
    try {
      await createAdjustmentMutation.mutateAsync({
        productId: Number(adjustmentProductId),
        quantity: Number(adjustmentQuantity),
        notes: adjustmentNotes || undefined,
      });
    } catch (error) {
      // El error ya se maneja en onError
    } finally {
      setCreatingAdjustment(false);
    }
  }, [adjustmentProductId, adjustmentQuantity, adjustmentNotes, createAdjustmentMutation]);

  // Sincronizar con estado local para compatibilidad
  useEffect(() => {
    setProducts(productsData);
    setCategories(categoriesData);
  }, [productsData, categoriesData]);

  const loading = loadingProducts || loadingCategories;

  // Debounce search term para evitar filtros costosos en cada keystroke
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const filteredProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      if (
        filters.categoryId !== "all" &&
        product.category?.id !== Number(filters.categoryId)
      ) {
        return false;
      }

      if (usesStockFilter === "uses_stock" && product.uses_stock === false) {
        return false;
      }

      if (usesStockFilter === "no_stock" && product.uses_stock !== false) {
        return false;
      }

      const term = debouncedSearchTerm.toLowerCase();
      return (
        product.name.toLowerCase().includes(term) ||
        (product.description ?? "").toLowerCase().includes(term)
      );
    });

    // Ordenar por categoría: primero los que tienen categoría (ordenados por nombre de categoría), luego los sin categoría
    return filtered.sort((a, b) => {
      // Si ambos tienen categoría, ordenar por nombre de categoría
      if (a.category && b.category) {
        const categoryNameA = a.category.name.toLowerCase();
        const categoryNameB = b.category.name.toLowerCase();
        if (categoryNameA !== categoryNameB) {
          return categoryNameA.localeCompare(categoryNameB);
        }
        // Si tienen la misma categoría, ordenar por nombre de producto
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      }
      // Si solo uno tiene categoría, el que tiene categoría va primero
      if (a.category && !b.category) return -1;
      if (!a.category && b.category) return 1;
      // Si ninguno tiene categoría, ordenar por nombre de producto
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  }, [products, filters.categoryId, debouncedSearchTerm, usesStockFilter]);

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

  const handleStatusFilterChange = (value: "all" | "active" | "inactive") => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleUsesStockFilterChange = (
    value: "all" | "uses_stock" | "no_stock"
  ) => {
    setUsesStockFilter(value);
    setCurrentPage(1);
  };

  const handleAddProduct = useCallback(async () => {
    try {
      const price = typeof productPrice === "string" ? Number(productPrice) : productPrice;
      
      if (!productName.trim()) {
        toast.error("El nombre del producto es obligatorio");
        return;
      }

      if (Number.isNaN(price) || price <= 0) {
        toast.error("El precio debe ser un número positivo");
        return;
      }

      const newProductPayload = {
        name: productName,
        description: productDescription || null,
        price,
        uses_stock: productUsesStock,
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
      toast.success("Producto creado correctamente");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al crear el producto";
      toast.error(errorMessage);
    }
  }, [
    productName,
    productDescription,
    productPrice,
    productCategoryId,
    productUsesStock,
  ]);

  const handleEditProduct = useCallback(async () => {
    if (!selectedProductId) return;

    try {
      const price = typeof productPrice === "string" ? Number(productPrice) : productPrice;
      
      if (!productName.trim()) {
        toast.error("El nombre del producto es obligatorio");
        return;
      }

      if (Number.isNaN(price) || price <= 0) {
        toast.error("El precio debe ser un número positivo");
        return;
      }

      const updatedProductPayload: Partial<Product> & {
        category_id?: number | null;
      } = {
        name: productName,
        description: productDescription || null,
        price,
        uses_stock: productUsesStock,
        category_id:
          productCategoryId === "none" ? null : Number(productCategoryId),
      };

      await productsService.update(selectedProductId, updatedProductPayload);
      // Invalidar cache para refrescar datos
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsEditProductDialogOpen(false);
      resetSelectedProduct();
      toast.success("Producto actualizado correctamente");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al actualizar el producto";
      toast.error(errorMessage);
    }
  }, [
    selectedProductId,
    productName,
    productDescription,
    productPrice,
    productCategoryId,
    productUsesStock,
  ]);

  const handleDeleteProduct = useCallback(async () => {
    if (!productToDelete) return;
    try {
      await productsService.delete(productToDelete.id);

      // Invalidar cache para refrescar datos
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsDeleteConfirmationOpen(false);
      setProductToDelete(null);
      toast.success("Producto eliminado correctamente");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al eliminar el producto";
      toast.error(errorMessage);
    }
  }, [productToDelete]);

  const getCategoryName = (categoryId: number | null) => {
    if (categoryId == null) return "-";
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? cat.name : "-";
  };

  const getCategoryColor = (categoryId: number | null) => {
    if (categoryId == null) return null;
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.color && cat.color.trim() !== "" ? cat.color : null;
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
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "products" | "categories" | "share" | "stock")}>
        <TabsList className="mb-4">
          <TabsTrigger value="products">
            <PackageIcon className="w-4 h-4 mr-2" />
            Productos
          </TabsTrigger>
          <TabsTrigger value="categories">
            <TagIcon className="w-4 h-4 mr-2" />
            Categorías
          </TabsTrigger>
          <TabsTrigger value="stock">
            <WarehouseIcon className="w-4 h-4 mr-2" />
            Control de stock
          </TabsTrigger>
          <TabsTrigger value="share">
            <Share2Icon className="w-4 h-4 mr-2" />
            Compartir
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
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Filtrar por Estado</DropdownMenuLabel>
                      <DropdownMenuCheckboxItem
                        checked={statusFilter === "all"}
                        onCheckedChange={() => handleStatusFilterChange("all")}
                      >
                        Todos
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={statusFilter === "active"}
                        onCheckedChange={() => handleStatusFilterChange("active")}
                      >
                        Activos
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={statusFilter === "inactive"}
                        onCheckedChange={() =>
                          handleStatusFilterChange("inactive")
                        }
                      >
                        Inactivos
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Filtrar por stock</DropdownMenuLabel>
                      <DropdownMenuCheckboxItem
                        checked={usesStockFilter === "all"}
                        onCheckedChange={() => handleUsesStockFilterChange("all")}
                      >
                        Todos
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={usesStockFilter === "uses_stock"}
                        onCheckedChange={() =>
                          handleUsesStockFilterChange("uses_stock")
                        }
                      >
                        Usa stock
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={usesStockFilter === "no_stock"}
                        onCheckedChange={() =>
                          handleUsesStockFilterChange("no_stock")
                        }
                      >
                        No usa stock
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
                      <TableHead>Usa stock</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentProducts.map((product) => {
                      const categoryColor = getCategoryColor(product.category?.id ?? null);
                      const hasColor = categoryColor !== null;
                      
                      return (
                        <TableRow
                          key={product.id}
                          className={`border-l-4 ${
                            hasColor ? "" : "border-l-muted"
                          }`}
                          style={
                            hasColor
                              ? {
                                  borderLeftColor: categoryColor,
                                  backgroundColor: `${categoryColor}08`, // ~3% opacity
                                }
                              : undefined
                          }
                        >
                          <TableCell className="font-medium">
                            {product.name}
                          </TableCell>
                          <TableCell>{product.description ?? "-"}</TableCell>
                          <TableCell>{getCategoryName(product.category?.id ?? null)}</TableCell>
                          <TableCell>
                            {product.uses_stock ? (
                              <span className="text-emerald-600 font-medium">Sí</span>
                            ) : (
                              <span className="text-muted-foreground">No</span>
                            )}
                          </TableCell>
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
                              setProductUsesStock(product.uses_stock ?? true);
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
                      );
                    })}
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

        <TabsContent value="stock">
          <Card className="flex flex-col gap-6 p-6">
            <CardHeader className="p-0 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold">
                  Control de stock
                </CardTitle>
                <Button 
                  size="sm" 
                  onClick={() => setIsAdjustmentDialogOpen(true)}
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Ajustar stock
                </Button>
              </div>

              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1">
                  <Label className="flex items-center gap-1 text-xs">
                    <CalendarIcon className="w-3 h-3" />
                    Desde
                  </Label>
                  <Input
                    type="date"
                    value={stockFromDate}
                    onChange={(e) => setStockFromDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="flex items-center gap-1 text-xs">
                    <CalendarIcon className="w-3 h-3" />
                    Hasta
                  </Label>
                  <Input
                    type="date"
                    value={stockToDate}
                    onChange={(e) => setStockToDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="flex items-center gap-1 text-xs">
                    <WarehouseIcon className="w-3 h-3" />
                    Categoría
                  </Label>
                  <Select
                    value={stockCategoryFilter === "all" ? "all" : String(stockCategoryFilter)}
                    onValueChange={(value) => {
                      if (value === "all") {
                        setStockCategoryFilter("all");
                      } else {
                        setStockCategoryFilter(Number(value));
                      }
                    }}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <div className="flex gap-6 items-start">
              <div className="flex-1">
                {loadingStockStats ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2Icon className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead>Categoría</TableHead>
                          <TableHead className="text-right">Compras</TableHead>
                          <TableHead className="text-right">Ventas</TableHead>
                          <TableHead className="text-right">Ajustes</TableHead>
                          <TableHead className="text-right font-semibold">Stock actual</TableHead>
                          <TableHead className="text-right">Precio unitario</TableHead>
                          <TableHead className="text-right font-semibold">Valor de venta</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stockStatistics.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-6">
                              {stockFromDate || stockToDate 
                                ? "No hay movimientos de stock en el rango de fechas seleccionado."
                                : "Seleccioná un rango de fechas para ver los movimientos de stock."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          stockStatistics.map((stat: StockStatisticsItem) => {
                            const product = products.find(p => p.id === stat.productId);
                            const productPrice = product?.price ?? 0;
                            const saleValue = productPrice * stat.currentStock;
                            
                            return (
                              <TableRow key={stat.productId}>
                                <TableCell className="font-medium">{stat.productName}</TableCell>
                                <TableCell>{stat.categoryName ?? "-"}</TableCell>
                                <TableCell className="text-right text-green-600">
                                  +{stat.totalPurchases}
                                </TableCell>
                                <TableCell className="text-right text-red-600">
                                  -{stat.totalSales}
                                </TableCell>
                                <TableCell className="text-right">
                                  {stat.totalAdjustments > 0 ? "+" : ""}{stat.totalAdjustments}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  {stat.currentStock}
                                </TableCell>
                                <TableCell className="text-right">
                                  ${productPrice.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right font-semibold">
                                  ${saleValue.toFixed(2)}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Resumen */}
              {!loadingStockStats && stockStatistics.length > 0 && (
                <Card className="h-fit w-80 flex-shrink-0">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">Resumen de stock</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(() => {
                      // Calcular valor de venta por categoría
                      const valueByCategory = new Map<string | null, number>();
                      let totalValue = 0;

                      stockStatistics.forEach((stat: StockStatisticsItem) => {
                        const product = products.find(p => p.id === stat.productId);
                        const productPrice = product?.price ?? 0;
                        const saleValue = productPrice * stat.currentStock;
                        totalValue += saleValue;

                        const categoryName = stat.categoryName ?? "Sin categoría";
                        const currentValue = valueByCategory.get(categoryName) ?? 0;
                        valueByCategory.set(categoryName, currentValue + saleValue);
                      });

                      // Ordenar categorías por valor (mayor a menor)
                      const sortedCategories = Array.from(valueByCategory.entries())
                        .sort((a, b) => b[1] - a[1]);

                      return (
                        <>
                          <div className="space-y-3">
                            <div className="text-sm font-semibold">Valor por categoría</div>
                            {sortedCategories.length > 0 ? (
                              <div className="space-y-2">
                                {sortedCategories.map(([categoryName, value]) => (
                                  <div key={categoryName} className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">{categoryName}</span>
                                    <span className="font-medium">${value.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground">No hay productos con stock</div>
                            )}
                          </div>

                          <div className="border-t pt-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold">Total general</span>
                              <span className="text-xl font-bold">${totalValue.toFixed(2)}</span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </div>

            {!loadingStockStats && stockStatistics.length > 0 && (
              <CardFooter className="flex justify-between text-sm text-muted-foreground">
                <span>{stockStatistics.length} productos con movimientos</span>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="share">
          <ProductFliersTab />
        </TabsContent>
      </Tabs>

      {/* Dialog para ajuste de stock */}
      <Dialog
        open={isAdjustmentDialogOpen}
        onOpenChange={(open) => {
          setIsAdjustmentDialogOpen(open);
          if (!open) {
            setAdjustmentProductId("none");
            setAdjustmentQuantity("");
            setAdjustmentNotes("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar stock</DialogTitle>
            <DialogDescription>
              Agregá o restá unidades de stock de un producto. Usá valores positivos para agregar y negativos para restar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="adjustment-product" className="text-right">
                Producto
              </Label>
              <div className="col-span-3">
                <Select
                  value={adjustmentProductId === "none" ? "none" : String(adjustmentProductId)}
                  onValueChange={(value) =>
                    setAdjustmentProductId(value === "none" ? "none" : Number(value))
                  }
                >
                  <SelectTrigger id="adjustment-product">
                    <SelectValue placeholder="Seleccionar producto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Seleccionar...</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="adjustment-quantity" className="text-right">
                Cantidad
              </Label>
              <div className="col-span-3">
                <Input
                  id="adjustment-quantity"
                  type="number"
                  placeholder="Ej: +10 o -5"
                  value={adjustmentQuantity}
                  onChange={(e) =>
                    setAdjustmentQuantity(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Usá valores positivos para agregar stock, negativos para restar
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="adjustment-notes" className="text-right">
                Motivo
              </Label>
              <div className="col-span-3">
                <Input
                  id="adjustment-notes"
                  placeholder="Ej: Inventario físico, producto dañado, etc."
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAdjustmentDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateAdjustment}
              disabled={
                creatingAdjustment ||
                adjustmentProductId === "none" ||
                adjustmentQuantity === "" ||
                Number(adjustmentQuantity) === 0
              }
            >
              {creatingAdjustment && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Guardar ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              {isAddProductDialogOpen ? "Crear nuevo producto" : "Editar producto"}
            </DialogTitle>
            <DialogDescription>
              {isAddProductDialogOpen
                ? "Ingresá los detalles del nuevo producto."
                : "Editá los detalles del producto."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nombre
              </Label>
              <Input
                id="name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="col-span-3"
                placeholder="Nombre del producto"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Descripción
              </Label>
              <Input
                id="description"
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                className="col-span-3"
                placeholder="Descripción del producto (opcional)"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Precio
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={productPrice}
                onChange={(e) =>
                  setProductPrice(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                className="col-span-3"
                placeholder="0.00"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Categoría
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
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="uses-stock" className="text-right">
                Control de stock
              </Label>
              <div className="col-span-3 flex items-center gap-3">
                <Switch
                  id="uses-stock"
                  checked={productUsesStock}
                  onCheckedChange={(checked) =>
                    setProductUsesStock(Boolean(checked))
                  }
                />
                <span className="text-sm text-muted-foreground">
                  Si está desactivado, el producto se excluye del control de stock.
                </span>
              </div>
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
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que querés eliminar este producto? Esta acción no se 
              puede revertir.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteConfirmationOpen(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteProduct}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
