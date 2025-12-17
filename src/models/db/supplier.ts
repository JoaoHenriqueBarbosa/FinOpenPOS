// src/models/db/supplier.ts
export type SupplierStatus = "active" | "inactive";

export interface SupplierDB {
  id: number;
  user_uid: string;
  name: string;
  contact_email: string | null;
  phone: string | null;
  notes: string | null;
  status: SupplierStatus;
  created_at: string;
}

// Input types for creating/updating entities
export interface CreateSupplierInput {
  name: string;
  contact_email?: string | null;
  phone?: string | null;
  notes?: string | null;
  status?: SupplierStatus;
}

export interface FindSuppliersOptions {
  onlyActive?: boolean;
  search?: string;
}


