"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchIcon } from "lucide-react";
import type { ProductDTO } from "@/models/dto/product";
import type { ProductCategoryDTO } from "@/models/dto/product-category";

interface ProductSelectorProps {
  products: ProductDTO[];
  onProductSelect: (product: ProductDTO) => void;
  disabled?: boolean;
  searchPlaceholder?: string;
  showSearch?: boolean; // Si es false, no muestra la búsqueda
  compact?: boolean; // Si es true, solo muestra categorías sin búsqueda
}

export function ProductSelector({
  products,
  onProductSelect,
  disabled = false,
  searchPlaceholder = "Buscar producto por nombre...",
  showSearch = true,
  compact = false,
}: ProductSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Filtrar solo productos activos
  const activeProducts = useMemo(
    () => products.filter((p) => p.is_active),
    [products]
  );

  // Agrupar productos por categoría
  const productsByCategory = useMemo(() => {
    const grouped = new Map<
      number | null,
      { category: ProductCategoryDTO | null; products: ProductDTO[] }
    >();

    // Agregar categoría null para productos sin categoría
    grouped.set(null, { category: null, products: [] });

    activeProducts.forEach((product) => {
      const categoryId = product.category?.id ?? null;
      if (!grouped.has(categoryId)) {
        grouped.set(categoryId, {
          category: product.category ?? null,
          products: [],
        });
      }
      grouped.get(categoryId)!.products.push(product);
    });

    return Array.from(grouped.values()).filter(
      (group) => group.products.length > 0
    );
  }, [activeProducts]);

  // Filtrar productos por término de búsqueda
  const filteredProductsByCategory = useMemo(() => {
    if (!searchTerm.trim()) {
      return productsByCategory;
    }

    const term = searchTerm.toLowerCase().trim();
    const filtered = productsByCategory.map((group) => ({
      ...group,
      products: group.products.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.category?.name.toLowerCase().includes(term)
      ),
    }));

    return filtered.filter((group) => group.products.length > 0);
  }, [productsByCategory, searchTerm]);

  // Productos que coinciden con la búsqueda (para mostrar al final)
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) {
      return [];
    }

    const term = searchTerm.toLowerCase().trim();
    return activeProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(term) &&
        !filteredProductsByCategory.some((group) =>
          group.products.some((prod) => prod.id === p.id)
        )
    );
  }, [activeProducts, searchTerm, filteredProductsByCategory]);

  const handleProductClick = (product: ProductDTO) => {
    if (!disabled) {
      onProductSelect(product);
    }
  };

  return (
    <div className="space-y-4">
      {/* Búsqueda - solo si showSearch es true */}
      {showSearch && !compact && (
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
            disabled={disabled}
          />
        </div>
      )}

      {/* Productos agrupados por categoría */}
      {filteredProductsByCategory.length > 0 && (
        <div className="space-y-4">
          {filteredProductsByCategory.map((group) => {
            const categoryColor = group.category?.color;
            const hasColor = categoryColor && categoryColor.trim() !== "";
            
            return (
              <div
                key={group.category?.id ?? "no-category"}
                className={`space-y-2 rounded-lg p-3 border-l-4 ${
                  hasColor
                    ? ""
                    : "border-l-muted"
                }`}
                style={
                  hasColor
                    ? {
                        borderLeftColor: categoryColor,
                        backgroundColor: `${categoryColor}15`, // 15 = ~8% opacity en hex
                      }
                    : undefined
                }
              >
                {group.category && (
                  <Label className="text-sm font-semibold text-muted-foreground">
                    {group.category.name}
                  </Label>
                )}
                {!group.category && (
                  <Label className="text-sm font-semibold text-muted-foreground">
                    Sin categoría
                  </Label>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {group.products.map((product) => (
                    <Button
                      key={product.id}
                      variant="outline"
                      className="flex flex-col items-start h-auto p-3 hover:bg-primary/5"
                      onClick={() => handleProductClick(product)}
                      disabled={disabled}
                    >
                      <div className="font-medium text-sm">{product.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        ${product.price.toFixed(2)}
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resultados de búsqueda adicionales (si hay búsqueda activa y no es compacto) */}
      {!compact && searchTerm.trim() && searchResults.length > 0 && (
        <div className="space-y-2 border-t pt-4">
          <Label className="text-sm font-semibold text-muted-foreground">
            Resultados de búsqueda
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {searchResults.map((product) => (
              <Button
                key={product.id}
                variant="outline"
                className="flex flex-col items-start h-auto p-3 hover:bg-primary/5"
                onClick={() => handleProductClick(product)}
                disabled={disabled}
              >
                <div className="font-medium text-sm">{product.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  ${product.price.toFixed(2)}
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Mensaje cuando no hay resultados - solo si no es compacto */}
      {!compact && searchTerm.trim() &&
        filteredProductsByCategory.length === 0 &&
        searchResults.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No se encontraron productos que coincidan con &quot;{searchTerm}&quot;
          </div>
        )}

      {/* Mensaje cuando no hay productos */}
      {(!searchTerm.trim() || compact) && activeProducts.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No hay productos disponibles
        </div>
      )}
    </div>
  );
}

