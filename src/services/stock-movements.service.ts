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

class StockMovementsService {
  private baseUrl = "/api/stock-movements";

  async getStatistics(params: {
    fromDate?: string;
    toDate?: string;
  }): Promise<StockStatisticsItem[]> {
    const searchParams = new URLSearchParams();
    if (params.fromDate) searchParams.set('fromDate', params.fromDate);
    if (params.toDate) searchParams.set('toDate', params.toDate);

    const response = await fetch(`${this.baseUrl}/statistics?${searchParams.toString()}`);
    if (!response.ok) {
      throw new Error("Error al cargar las estadísticas de stock");
    }
    return response.json();
  }
}

export const stockMovementsService = new StockMovementsService();

