import {
  StockMovementsRepository,
  type StockMovementWithProduct,
} from "@/repositories/stock-movements.repository";

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

export interface StockStatisticsOptions {
  fromDate?: string;
  toDate?: string;
  categoryId?: number | null;
  pageSize?: number;
}

export class StockMovementsStatisticsService {
  constructor(private readonly repository: StockMovementsRepository) {}

  async getStatistics(
    options: StockStatisticsOptions = {}
  ): Promise<StockStatisticsItem[]> {
    const allMovements: StockMovementWithProduct[] = [];

    const pageSize =
      options.pageSize && Number.isFinite(options.pageSize) && options.pageSize > 0
        ? Math.min(Math.floor(options.pageSize), 100000)
        : 5000;

    let offset = 0;
    while (true) {
      const chunk = await this.repository.findAllWithProduct({
        fromDate: options.fromDate,
        toDate: options.toDate,
        limit: pageSize,
        offset,
      });
      if (chunk.length === 0) {
        break;
      }
      allMovements.push(...chunk);
      if (chunk.length < pageSize) {
        break;
      }
      offset += pageSize;
    }

    const stats = new Map<number, StockStatisticsItem>();

    allMovements.forEach((item) => {
      if (!item.product) return;

      const product = Array.isArray(item.product) ? item.product[0] : item.product;
      if (!product || product.uses_stock === false) {
        return;
      }

      const category = product.category
        ? Array.isArray(product.category)
          ? product.category[0]
          : product.category
        : null;

      const existing = stats.get(product.id) || {
        productId: product.id,
        productName: product.name,
        categoryId: category?.id ?? null,
        categoryName: category?.name ?? null,
        totalPurchases: 0,
        totalSales: 0,
        totalAdjustments: 0,
        currentStock: 0,
      };

      if (item.movement_type === "purchase") {
        existing.totalPurchases += item.quantity;
        existing.currentStock += item.quantity;
      } else if (item.movement_type === "sale") {
        existing.totalSales += item.quantity;
        existing.currentStock -= item.quantity;
      } else if (item.movement_type === "adjustment") {
        existing.totalAdjustments += item.quantity;
        existing.currentStock += item.quantity;
      }

      stats.set(product.id, existing);
    });

    const filteredStats = options.categoryId
      ? Array.from(stats.values()).filter(
          (stat) => stat.categoryId === options.categoryId
        )
      : Array.from(stats.values());

    return filteredStats.sort((a, b) =>
      a.productName.localeCompare(b.productName)
    );
  }
}
