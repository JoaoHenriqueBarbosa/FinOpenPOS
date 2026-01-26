import type { ProductDTO } from "@/models/dto/product";
import type { ProductCategoryDTO } from "@/models/dto/product-category";
import type { ProductStatusFilter } from "@/models/db/product";

export interface CreateProductInput {
  name: string;
  description?: string | null;
  price: number;
  uses_stock?: boolean;
  min_stock?: number | null;
  category_id?: number | null;
  is_active?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  description?: string | null;
  price?: number;
  uses_stock?: boolean;
  min_stock?: number | null;
  category_id?: number | null;
  is_active?: boolean;
}

class ProductsService {
  private baseUrl = "/api/products";

  async getAll(status: ProductStatusFilter = "active"): Promise<ProductDTO[]> {
    try {
      const params = new URLSearchParams();
      params.set("status", status);
      const url = `${this.baseUrl}?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error || "Error al cargar los productos";
        throw new Error(errorMessage);
      }
      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Error desconocido al cargar los productos");
    }
  }

  async getById(id: number): Promise<ProductDTO> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error || "Error al cargar el producto";
        throw new Error(errorMessage);
      }
      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Error desconocido al cargar el producto");
    }
  }

  async create(input: CreateProductInput): Promise<ProductDTO> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error || "Error al crear el producto";
        throw new Error(errorMessage);
      }
      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Error desconocido al crear el producto");
    }
  }

  async update(id: number, input: UpdateProductInput): Promise<ProductDTO> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error || "Error al actualizar el producto";
        throw new Error(errorMessage);
      }
      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Error desconocido al actualizar el producto");
    }
  }

  async delete(id: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData?.error || "Error al eliminar el producto";
        throw new Error(errorMessage);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Error desconocido al eliminar el producto");
    }
  }
}

class ProductCategoriesService {
  private baseUrl = "/api/product-categories";

  async getAll(onlyActive?: boolean): Promise<ProductCategoryDTO[]> {
    const url = onlyActive ? `${this.baseUrl}?onlyActive=true` : this.baseUrl;
    const response = await fetch(url);
    if (!response.ok) {
      return [];
    }
    return response.json();
  }

  async getById(id: number): Promise<ProductCategoryDTO> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch product category");
    }
    return response.json();
  }

  async create(input: { name: string; color: string }): Promise<ProductCategoryDTO> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error("Error creating product category");
    }
    return response.json();
  }

  async update(id: number, input: { name?: string; color?: string }): Promise<ProductCategoryDTO> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error("Error updating product category");
    }
    return response.json();
  }

  async delete(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Error deleting product category");
    }
  }
}

export const productsService = new ProductsService();
export const productCategoriesService = new ProductCategoriesService();

