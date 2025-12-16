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


