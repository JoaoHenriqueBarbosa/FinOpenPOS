import type { OrderDTO } from "@/models/dto/order";
import type { OrderStatus } from "@/models/db/order";

export interface CreateOrderInput {
  playerId: number;
}

export interface UpdateOrderInput {
  status?: OrderStatus;
  payment_method_id?: number | null;
  items?: Array<{
    id?: number;
    product_id: number;
    quantity: number;
    unit_price: number;
  }>;
}

export interface AddOrderItemInput {
  productId: number;
  quantity: number;
}

export interface UpdateOrderItemInput {
  quantity: number;
}

class OrdersService {
  private baseUrl = "/api/orders";

  async getAll(): Promise<OrderDTO[]> {
    const response = await fetch(this.baseUrl);
    if (!response.ok) {
      throw new Error("Error al cargar las cuentas");
    }
    return response.json();
  }

  async getById(id: number): Promise<OrderDTO> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) {
      throw new Error("Error al cargar la cuenta");
    }
    return response.json();
  }

  async create(input: CreateOrderInput): Promise<OrderDTO> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.message || "Error al crear la cuenta";
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).orderId = errorData.orderId;
      throw error;
    }
    return response.json();
  }

  async update(id: number, input: UpdateOrderInput): Promise<OrderDTO> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error("Error updating order");
    }
    return response.json();
  }

  async addItem(orderId: number, input: AddOrderItemInput): Promise<OrderDTO> {
    const response = await fetch(`${this.baseUrl}/${orderId}/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error("Error adding item to order");
    }
    return response.json();
  }

  async updateItem(orderId: number, itemId: number, input: UpdateOrderItemInput): Promise<OrderDTO> {
    const response = await fetch(`${this.baseUrl}/${orderId}/items/${itemId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error("Error updating order item");
    }
    return response.json();
  }

  async removeItem(orderId: number, itemId: number): Promise<OrderDTO> {
    const response = await fetch(`${this.baseUrl}/${orderId}/items/${itemId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Error removing order item");
    }
    return response.json();
  }

  async cancel(orderId: number): Promise<OrderDTO> {
    const response = await fetch(`${this.baseUrl}/${orderId}/cancel`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error("Error cancelling order");
    }
    return response.json();
  }

  async pay(orderId: number, paymentMethodId: number): Promise<OrderDTO> {
    const response = await fetch(`${this.baseUrl}/${orderId}/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentMethodId: paymentMethodId }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Error paying order");
    }
    return response.json();
  }

  async getOpenOrdersCount(): Promise<number> {
    const response = await fetch(this.baseUrl);
    if (!response.ok) {
      return 0;
    }
    const orders: OrderDTO[] = await response.json();
    return orders.filter((o) => o.status === "open").length;
  }

  async quickSale(input: {
    playerId: number;
    items: Array<{ productId: number; quantity: number }>;
    paymentMethodId: number;
  }): Promise<OrderDTO> {
    const response = await fetch(`${this.baseUrl}/quick-sale`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Error processing quick sale");
    }
    return response.json();
  }

  async getStatistics(params: {
    fromDate?: string;
    toDate?: string;
    productId?: number;
    categoryId?: number;
  }): Promise<Array<{
    productId: number;
    productName: string;
    categoryId: number | null;
    categoryName: string | null;
    totalQuantity: number;
    totalAmount: number;
  }>> {
    const searchParams = new URLSearchParams();
    if (params.fromDate) searchParams.set('fromDate', params.fromDate);
    if (params.toDate) searchParams.set('toDate', params.toDate);
    if (params.productId) searchParams.set('productId', String(params.productId));
    if (params.categoryId) searchParams.set('categoryId', String(params.categoryId));

    const response = await fetch(`${this.baseUrl}/statistics?${searchParams.toString()}`);
    if (!response.ok) {
      throw new Error("Error al cargar las estadísticas");
    }
    return response.json();
  }

  async getClientRanking(params: {
    fromDate?: string;
    toDate?: string;
  }): Promise<Array<{
    playerId: number;
    playerName: string;
    totalAmount: number;
    orderCount: number;
  }>> {
    const searchParams = new URLSearchParams();
    if (params.fromDate) searchParams.set('fromDate', params.fromDate);
    if (params.toDate) searchParams.set('toDate', params.toDate);

    const response = await fetch(`${this.baseUrl}/client-ranking?${searchParams.toString()}`);
    if (!response.ok) {
      throw new Error("Error al cargar el ranking de clientes");
    }
    return response.json();
  }
}

export const ordersService = new OrdersService();

