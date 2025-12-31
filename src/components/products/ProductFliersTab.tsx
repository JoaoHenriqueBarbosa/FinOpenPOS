"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DownloadIcon, Share2Icon, Loader2Icon, EyeIcon } from "lucide-react";
import { productsService, productCategoriesService } from "@/services/products.service";
import type { ProductDTO } from "@/models/dto/product";
import type { ProductCategoryDTO } from "@/models/dto/product";

async function fetchProducts(): Promise<ProductDTO[]> {
  return productsService.getAll();
}

async function fetchCategories(): Promise<ProductCategoryDTO[]> {
  return productCategoriesService.getAll(true);
}

export function ProductFliersTab() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "all">("all");
  const [previewCategory, setPreviewCategory] = useState<ProductCategoryDTO | null | undefined>(undefined);
  const flierRef = useRef<HTMLDivElement>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Cargar fuentes de Google Fonts
  useEffect(() => {
    const link1 = document.createElement("link");
    link1.href = "https://fonts.googleapis.com/css2?family=Anton&display=swap";
    link1.rel = "stylesheet";
    
    const link2 = document.createElement("link");
    link2.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap";
    link2.rel = "stylesheet";
    
    document.head.appendChild(link1);
    document.head.appendChild(link2);

    // Esperar a que las fuentes se carguen
    if (document.fonts) {
      Promise.all([
        document.fonts.load("72px Anton"),
        document.fonts.load("28px Poppins"),
        document.fonts.load("32px Poppins"),
      ]).then(() => {
        setFontsLoaded(true);
      });
    } else {
      // Fallback si document.fonts no está disponible
      setTimeout(() => setFontsLoaded(true), 1000);
    }

    return () => {
      document.head.removeChild(link1);
      document.head.removeChild(link2);
    };
  }, []);

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
    staleTime: 1000 * 60 * 5,
  });

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ["product-categories", "onlyActive"],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 10,
  });

  // Filtrar productos activos y agrupar por categoría
  const productsByCategory = useMemo(() => {
    const activeProducts = products.filter((p) => p.is_active);
    const grouped = new Map<number | null, ProductDTO[]>();

    activeProducts.forEach((product) => {
      const categoryId = product.category?.id ?? null;
      if (!grouped.has(categoryId)) {
        grouped.set(categoryId, []);
      }
      grouped.get(categoryId)!.push(product);
    });

    return grouped;
  }, [products]);

  // Obtener categorías con productos
  const categoriesWithProducts = useMemo(() => {
    return categories.filter((cat) => {
      const productsInCategory = productsByCategory.get(cat.id) ?? [];
      return productsInCategory.length > 0;
    });
  }, [categories, productsByCategory]);

  // Productos sin categoría
  const productsWithoutCategory = productsByCategory.get(null) ?? [];

  // Filtrar según categoría seleccionada
  const filteredCategories = useMemo(() => {
    if (selectedCategoryId === "all") {
      return categoriesWithProducts;
    }
    return categoriesWithProducts.filter((cat) => cat.id === selectedCategoryId);
  }, [categoriesWithProducts, selectedCategoryId]);

  const filteredProductsWithoutCategory = useMemo(() => {
    if (selectedCategoryId === "all") {
      return productsWithoutCategory;
    }
    return [];
  }, [productsWithoutCategory, selectedCategoryId]);

  const loading = loadingProducts || loadingCategories;

  // Función para generar y descargar flier de una categoría
  const handleDownloadFlier = async (category: ProductCategoryDTO | null) => {
    const categoryProducts = category
      ? productsByCategory.get(category.id) ?? []
      : productsWithoutCategory;

    if (categoryProducts.length === 0) return;

    await generateFlierWithCanvas(category, categoryProducts);
  };

  // Función fallback usando canvas nativo
  const generateFlierWithCanvas = async (
    category: ProductCategoryDTO | null,
    categoryProducts: ProductDTO[]
  ) => {
    // Usar mayor resolución para mejor calidad
    const scale = 2;
    const width = 1080;
    const height = 1350;
    const horizontalMargin = 80; // Márgenes laterales
    const contentWidth = width - (horizontalMargin * 2);
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Habilitar suavizado de imágenes
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Escalar el contexto para trabajar con las dimensiones originales
    ctx.scale(scale, scale);
    
    // Fondo blanco para los márgenes
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    // Determinar qué imagen de fondo usar
    const categoryName = category?.name || "";
    const isAccesorios = categoryName.toLowerCase().includes("accesorios");
    const backgroundImagePath = isAccesorios
      ? "/PCP-accesorios-cantina.png"
      : "/PCP-cantina.png";

    // Cargar imagen de fondo
    const backgroundImage = new Image();
    backgroundImage.crossOrigin = "anonymous";

    await new Promise<void>((resolve, reject) => {
      backgroundImage.onload = () => {
        // Calcular dimensiones para mostrar más ancho de la imagen
        const imgAspect = backgroundImage.width / backgroundImage.height;
        const canvasAspect = width / height;
        
        let drawWidth = width;
        let drawHeight = height;
        let drawX = 0;
        let drawY = 0;

        // Calcular dimensiones para el área de contenido (sin márgenes)
        const contentAspect = contentWidth / height;
        
        // Priorizar mostrar más ancho: si la imagen es más alta, escalar por altura para mostrar más ancho
        if (imgAspect < contentAspect) {
          // La imagen es más alta que el área de contenido, escalar por altura
          drawHeight = height;
          drawWidth = height * imgAspect;
          drawX = horizontalMargin + (contentWidth - drawWidth) / 2;
        } else {
          // La imagen es más ancha o similar, escalar por ancho del área de contenido
          drawWidth = contentWidth;
          drawHeight = contentWidth / imgAspect;
          drawY = (height - drawHeight) / 2;
          drawX = horizontalMargin;
        }

        // Dibujar imagen de fondo en el área de contenido (con márgenes laterales)
        ctx.drawImage(backgroundImage, drawX, drawY, drawWidth, drawHeight);
        
        // Agregar overlay negro para oscurecer la imagen (solo en el área de contenido)
        ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
        ctx.fillRect(horizontalMargin, 0, contentWidth, height);
        
        resolve();
      };
      backgroundImage.onerror = () => {
        // Si falla la carga, usar fondo blanco
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        resolve();
      };
      backgroundImage.src = backgroundImagePath;
    });

    // Agregar overlay negro semi-transparente muy sutil solo donde hay texto para mejorar legibilidad
    // No dibujar un recuadro completo, solo aplicar sombras al texto

    // Título con el nombre de la categoría en mayúsculas usando Anton (más grande)
    const categoryTitle = category?.name?.toUpperCase() || "PRODUCTOS";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "96px Anton, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Sombra para el título
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    
    ctx.fillText(categoryTitle, width / 2, 100);
    
    // Resetear sombra
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Lista de productos (más chica) con más margen desde el título
    let yPosition = 280; // Aumentado de 200 a 280 para más espacio
    const productHeight = 70;
    const padding = 60;
    const maxWidth = contentWidth - padding * 2;

    categoryProducts.forEach((product, index) => {
      if (yPosition + productHeight > height - 60) return;

      // Nombre del producto en blanco usando Poppins (más grande)
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "600 32px Poppins, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      
      // Sombra para el texto para mejor legibilidad
      ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
      
      const productName = product.name.toUpperCase();
      const maxNameWidth = maxWidth - 250; // Dejar espacio para el precio

      // Truncar nombre si es muy largo
      let displayName = productName;
      if (ctx.measureText(displayName).width > maxNameWidth) {
        while (ctx.measureText(displayName + "...").width > maxNameWidth) {
          displayName = displayName.slice(0, -1);
        }
        displayName += "...";
      }
      ctx.fillText(displayName, horizontalMargin + padding, yPosition);
      
      // Resetear sombra
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Precio en blanco usando Poppins (más grande y en negrita)
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 36px Poppins, sans-serif";
      ctx.textAlign = "right";
      
      // Sombra para el precio
      ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
      
      const price = `$${product.price.toFixed(3).replace(/\.?0+$/, "")}`;
      ctx.fillText(price, width - horizontalMargin - padding, yPosition);
      
      // Resetear sombra
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Línea separadora blanca más visible y gruesa (con márgenes)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.6)"; // Aumentado de 0.3 a 0.6 para más visibilidad
      ctx.lineWidth = 3; // Aumentado a 3 para más grosor
      ctx.beginPath();
      ctx.moveTo(horizontalMargin + padding, yPosition + productHeight - 5);
      ctx.lineTo(width - horizontalMargin - padding, yPosition + productHeight - 5);
      ctx.stroke();

      yPosition += productHeight;
    });

    // Convertir canvas a imagen y descargar con alta calidad
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const fileName = categoryName || "productos";
      link.download = `flier-${fileName.toLowerCase().replace(/\s+/g, "-")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, "image/png", 1.0); // Calidad máxima (1.0)
  };

  // Función para generar flier de todas las categorías
  const handleDownloadAllFliers = () => {
    categoriesWithProducts.forEach((category) => {
      setTimeout(() => {
        handleDownloadFlier(category);
      }, 500); // Pequeño delay entre descargas
    });
    
    // También descargar productos sin categoría si existen
    if (productsWithoutCategory.length > 0) {
      setTimeout(() => {
        handleDownloadFlier(null);
      }, (categoriesWithProducts.length + 1) * 500);
    }
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2Icon className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="flex flex-col gap-6 p-6">
      <CardHeader className="p-0">
        <div className="flex items-center justify-between">
          <CardTitle>Fliers para Compartir</CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="category-filter" className="text-sm">
              Filtrar por categoría:
            </Label>
            <Select
              value={selectedCategoryId === "all" ? "all" : String(selectedCategoryId)}
              onValueChange={(value) => {
                setSelectedCategoryId(value === "all" ? "all" : Number(value));
              }}
            >
              <SelectTrigger id="category-filter" className="w-[200px]">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categoriesWithProducts.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCategoryId === "all" && (
              <Button onClick={handleDownloadAllFliers} variant="outline">
                <DownloadIcon className="w-4 h-4 mr-2" />
                Descargar Todos
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 space-y-6">
        {/* Fliers por categoría */}
        {filteredCategories.map((category) => {
          const categoryProducts = productsByCategory.get(category.id) ?? [];
          if (categoryProducts.length === 0) return null;

          return (
            <Card key={category.id} className="border-2">
              <CardHeader
                className="text-white"
                style={{ backgroundColor: category.color || "#3B82F6" }}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">{category.name}</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setPreviewCategory(category)}
                      variant="outline"
                      size="sm"
                    >
                      <EyeIcon className="w-4 h-4 mr-2" />
                      Previsualizar
                    </Button>
                    <Button
                      onClick={() => handleDownloadFlier(category)}
                      variant="secondary"
                      size="sm"
                    >
                      <DownloadIcon className="w-4 h-4 mr-2" />
                      Descargar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryProducts.map((product) => (
                    <div
                      key={product.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                      {product.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {product.description}
                        </p>
                      )}
                      <p
                        className="text-2xl font-bold"
                        style={{ color: category.color || "#3B82F6" }}
                      >
                        ${product.price.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Productos sin categoría */}
        {filteredProductsWithoutCategory.length > 0 && (
          <Card className="border-2">
            <CardHeader className="bg-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Productos sin Categoría</CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPreviewCategory(null)}
                    variant="outline"
                    size="sm"
                  >
                    <EyeIcon className="w-4 h-4 mr-2" />
                    Previsualizar
                  </Button>
                  <Button
                    onClick={() => handleDownloadFlier(null)}
                    variant="secondary"
                    size="sm"
                  >
                    <DownloadIcon className="w-4 h-4 mr-2" />
                    Descargar
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProductsWithoutCategory.map((product) => (
                  <div
                    key={product.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                    {product.description && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {product.description}
                      </p>
                    )}
                    <p className="text-2xl font-bold text-gray-700">
                      ${product.price.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {filteredCategories.length === 0 && filteredProductsWithoutCategory.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {selectedCategoryId === "all"
              ? "No hay productos activos para mostrar."
              : "No hay productos en esta categoría."}
          </div>
        )}
      </CardContent>

      {/* Preview Dialog */}
      <Dialog open={previewCategory !== undefined} onOpenChange={(open) => !open && setPreviewCategory(undefined)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Previsualización del Flier - {previewCategory?.name || "Productos sin Categoría"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center overflow-auto">
            <div
              ref={flierRef}
              className="relative bg-white overflow-hidden"
              style={{
                width: "1080px",
                minHeight: "1350px",
                transform: "scale(0.6)",
                transformOrigin: "top center",
              }}
            >
              {/* Imagen de fondo */}
              <img
                src={
                  previewCategory?.name?.toLowerCase().includes("accesorios")
                    ? "/PCP-accesorios-cantina.png"
                    : "/PCP-cantina.png"
                }
                alt="Background"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ objectFit: "cover" }}
              />
              
              {/* Overlay negro para oscurecer la imagen */}
              <div className="absolute inset-0 bg-black/40" />

              {/* Contenido */}
              <div className="relative z-10">
                {/* Título con nombre de categoría usando Anton (más grande) */}
                <div className="text-center pt-16 pb-8">
                  <h1 
                    className="text-8xl text-white drop-shadow-lg"
                    style={{ fontFamily: "'Anton', sans-serif" }}
                  >
                    {previewCategory?.name?.toUpperCase() || "PRODUCTOS"}
                  </h1>
                </div>

                {/* Productos (más chicos) con más margen desde el título */}
                <div className="px-16 pt-8">
                  {(() => {
                    const products = previewCategory
                      ? productsByCategory.get(previewCategory.id) ?? []
                      : productsWithoutCategory;
                    return products.map((product, index) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between py-3"
                        style={{
                          borderBottom: index < products.length - 1 ? "3px solid rgba(255, 255, 255, 0.6)" : "none"
                        }}
                      >
                        <div className="flex-1">
                          <h3 
                            className="text-3xl text-white drop-shadow-lg"
                            style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}
                          >
                            {product.name.toUpperCase()}
                          </h3>
                        </div>
                        <p 
                          className="text-3xl text-white ml-6 drop-shadow-lg"
                          style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700 }}
                        >
                          ${product.price.toFixed(3).replace(/\.?0+$/, "")}
                        </p>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setPreviewCategory(undefined)}
            >
              Cerrar
            </Button>
            <Button
              onClick={() => {
                if (previewCategory !== undefined) {
                  handleDownloadFlier(previewCategory);
                }
              }}
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              Descargar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

