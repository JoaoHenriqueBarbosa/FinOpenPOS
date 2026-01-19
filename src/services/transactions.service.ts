type TransactionCreateInput = {
  amount: number;
  description: string;
  payment_method_id?: number | null;
  order_id?: number | null;
  player_id?: number | null;
};

export interface TransactionDTO {
  id: number;
  order_id: number | null;
  player_id: number | null;
  payment_method_id: number | null;
  description: string | null;
  amount: number;
  type: "income" | "expense" | "adjustment" | "withdrawal";
  status: "pending" | "completed" | "failed";
  created_at: string;
  payment_method?: {
    id: number;
    name: string;
  } | null;
  player?: {
    id: number;
    first_name: string;
    last_name: string;
  } | null;
}

class TransactionsService {
  private baseUrl = "/api/transactions";

  async getBalance(params?: { fromDate?: string; toDate?: string; type?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.fromDate) searchParams.set("fromDate", params.fromDate);
    if (params?.toDate) searchParams.set("toDate", params.toDate);
    if (params?.type) searchParams.set("type", params.type);
    const response = await fetch(`${this.baseUrl}/balance?${searchParams.toString()}`);
    if (!response.ok) {
      throw new Error("Failed to fetch balance");
    }
    return response.json();
  }

  async createAdjustment(input: TransactionCreateInput) {
    const response = await fetch(`${this.baseUrl}/adjustment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error("Failed to create adjustment");
    }
    return response.json();
  }

  async createWithdrawal(input: TransactionCreateInput & { player_id: number }) {
    const response = await fetch(`${this.baseUrl}/withdrawal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error("Failed to create withdrawal");
    }
    return response.json();
  }

  async getAll(filters?: {
    type?: "income" | "expense" | "adjustment" | "withdrawal";
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

