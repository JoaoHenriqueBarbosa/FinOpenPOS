// src/services/stock-movements.service.ts

export interface StockStatisticsItem {
  productId: number;
  productName: string;
  categoryId: number | null;
  categoryName: string | null;
  totalPurchases: number;
  totalSales: number;
  totalAdjustments: number;
  currentStock: number;
}

export interface CreateStockAdjustmentInput {
  productId: number;
  quantity: number; // Puede ser positivo o negativo
  notes?: string;
}

class StockMovementsService {
  private baseUrl = "/api/stock-movements";

  async getStatistics(params: {
    fromDate?: string;
    toDate?: string;
    categoryId?: number | null;
  }): Promise<StockStatisticsItem[]> {
    const searchParams = new URLSearchParams();
    if (params.fromDate) searchParams.set('fromDate', params.fromDate);
    if (params.toDate) searchParams.set('toDate', params.toDate);
    if (params.categoryId !== undefined && params.categoryId !== null) {
      searchParams.set('categoryId', params.categoryId.toString());
    }

    const response = await fetch(`${this.baseUrl}/statistics?${searchParams.toString()}`);
    if (!response.ok) {
      throw new Error("Error al cargar las estadísticas de stock");
    }
    return response.json();
  }

  async createAdjustment(input: CreateStockAdjustmentInput): Promise<void> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        productId: input.productId,
        quantity: input.quantity,
        movement_type: "adjustment",
        notes: input.notes || null,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Error al crear el ajuste de stock");
    }
  }
}

export const stockMovementsService = new StockMovementsService();

