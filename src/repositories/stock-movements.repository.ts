import { BaseRepository } from "./base-repository";
import type { SupabaseClient } from "@supabase/supabase-js";

export type StockMovementType = "purchase" | "sale" | "adjustment";

export interface StockMovementWithProduct {
  product_id: number;
  movement_type: StockMovementType;
  quantity: number;
  product:
    | {
        id: number;
        name: string;
        uses_stock: boolean;
        category: Array<{
          id: number;
          name: string;
        }> | null;
      }
    | null;
}

export interface StockMovementsQueryOptions {
  fromDate?: string;
  toDate?: string;
}

export class StockMovementsRepository extends BaseRepository {
  constructor(supabase: SupabaseClient, userId: string) {
    super(supabase, userId);
  }

  async findAllWithProduct(
    options: StockMovementsQueryOptions = {}
  ): Promise<StockMovementWithProduct[]> {
    let query = this.supabase
      .from("stock_movements")
      .select(`
        product_id,
        movement_type,
        quantity,
        product:product_id (
          id,
          name,
          uses_stock,
          category:category_id (
            id,
            name
          )
        )
      `);

    if (options.fromDate) {
      const fromISO = new Date(options.fromDate + "T00:00:00").toISOString();
      query = query.gte("created_at", fromISO);
    }

    if (options.toDate) {
      const toISO = new Date(options.toDate + "T23:59:59.999").toISOString();
      query = query.lte("created_at", toISO);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      throw new Error("Failed to load stock movements: " + error.message);
    }

    return (data ?? []) as StockMovementWithProduct[];
  }
}
