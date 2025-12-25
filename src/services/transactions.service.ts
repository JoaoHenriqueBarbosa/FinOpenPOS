export interface TransactionDTO {
  id: number;
  order_id: number | null;
  player_id: number | null;
  payment_method_id: number | null;
  description: string | null;
  amount: number;
  type: "income" | "expense";
  status: "pending" | "completed" | "failed";
  created_at: string;
  payment_method?: {
    id: number;
    name: string;
  } | null;
}

class TransactionsService {
  private baseUrl = "/api/transactions";

  async getAll(filters?: {
    type?: "income" | "expense";
    status?: "pending" | "completed" | "failed";
    from?: string;
    to?: string;
    orderId?: number;
    playerId?: number;
  }): Promise<TransactionDTO[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append("type", filters.type);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.from) params.append("from", filters.from);
    if (filters?.to) params.append("to", filters.to);
    if (filters?.orderId) params.append("orderId", String(filters.orderId));
    if (filters?.playerId) params.append("playerId", String(filters.playerId));

    const url = params.toString() ? `${this.baseUrl}?${params.toString()}` : this.baseUrl;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Error al cargar las transacciones");
    }
    return response.json();
  }
}

export const transactionsService = new TransactionsService();

