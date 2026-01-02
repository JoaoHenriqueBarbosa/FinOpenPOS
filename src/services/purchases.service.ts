import type { PurchaseDTO } from "@/models/dto/purchase";
import type { SupplierDTO } from "@/models/dto/supplier";
import type { PaymentMethodDTO } from "@/models/dto/payment-method";
import type { PurchaseStatus } from "@/models/db/purchase";

export interface CreatePurchaseInput {
  supplier_id: number;
  payment_method_id?: number | null;
  items: Array<{
    productId: number;
    quantity: number;
    unitCost: number;
  }>;
  notes?: string | null;
}

class PurchasesService {
  private baseUrl = "/api/purchases";

  async getAll(): Promise<PurchaseDTO[]> {
    const response = await fetch(this.baseUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch purchases");
    }
    return response.json();
  }

  async getById(id: number): Promise<PurchaseDTO> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch purchase");
    }
    return response.json();
  }

  async create(input: CreatePurchaseInput): Promise<PurchaseDTO> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Error creating purchase");
    }
    return response.json();
  }

  async update(id: number, input: { payment_method_id?: number | null; notes?: string | null; status?: PurchaseStatus }): Promise<PurchaseDTO> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Error updating purchase");
    }
    return response.json();
  }

  async cancel(id: number): Promise<PurchaseDTO> {
    return this.update(id, { status: "cancelled" });
  }
}

class SuppliersService {
  private baseUrl = "/api/suppliers";

  async getAll(): Promise<SupplierDTO[]> {
    const response = await fetch(this.baseUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch suppliers");
    }
    return response.json();
  }

  async getById(id: number): Promise<SupplierDTO> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch supplier");
    }
    return response.json();
  }

  async create(input: { name: string; phone?: string | null; email?: string | null }): Promise<SupplierDTO> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error("Error creating supplier");
    }
    return response.json();
  }

  async update(id: number, input: { name?: string; phone?: string | null; email?: string | null }): Promise<SupplierDTO> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error("Error updating supplier");
    }
    return response.json();
  }

  async delete(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Error deleting supplier");
    }
  }
}

class PaymentMethodsService {
  private baseUrl = "/api/payment-methods";

  async getAll(onlyActive?: boolean, scope?: string): Promise<PaymentMethodDTO[]> {
    const params = new URLSearchParams();
    if (onlyActive) params.append("onlyActive", "true");
    if (scope) params.append("scope", scope);
    const url = params.toString() ? `${this.baseUrl}?${params.toString()}` : this.baseUrl;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch payment methods");
    }
    return response.json();
  }

  async getById(id: number): Promise<PaymentMethodDTO> {
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch payment method");
    }
    return response.json();
  }

  async create(input: { name: string; scope: string; is_active?: boolean }): Promise<PaymentMethodDTO> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error("Error creating payment method");
    }
    return response.json();
  }

  async update(id: number, input: { name?: string; scope?: string; is_active?: boolean }): Promise<PaymentMethodDTO> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error("Error updating payment method");
    }
    return response.json();
  }

  async delete(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Error deleting payment method");
    }
  }
}

export const purchasesService = new PurchasesService();
export const suppliersService = new SuppliersService();
export const paymentMethodsService = new PaymentMethodsService();

