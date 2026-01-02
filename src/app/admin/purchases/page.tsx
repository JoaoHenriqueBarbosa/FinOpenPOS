"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Loader2Icon, LayersIcon, UsersIcon } from "lucide-react";
import { suppliersService, paymentMethodsService } from "@/services";
import { PurchasesHistoryTab } from "@/components/purchases/PurchasesHistoryTab";
import { SuppliersTab } from "@/components/purchases/SuppliersTab";

export default function PurchasesPage() {
  const [activeTab, setActiveTab] = useState<"history" | "suppliers">("history");

  const {
    data: suppliersData = [],
    isLoading: loadingSuppliers,
  } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => suppliersService.getAll(),
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: paymentMethodsData = [],
    isLoading: loadingPM,
  } = useQuery({
    queryKey: ["payment-methods", "BAR"],
    queryFn: async () => paymentMethodsService.getAll(true, "BAR"),
    staleTime: 1000 * 60 * 10,
  });

  const loading = loadingSuppliers || loadingPM;

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2Icon className="mx-auto h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "history" | "suppliers")}>
        <TabsList className="mb-4">
          <TabsTrigger value="history">
            <LayersIcon className="w-4 h-4 mr-2" />
            Historial
          </TabsTrigger>
          <TabsTrigger value="suppliers">
            <UsersIcon className="w-4 h-4 mr-2" />
            Proveedores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <PurchasesHistoryTab />
        </TabsContent>

        <TabsContent value="suppliers">
          <SuppliersTab />
        </TabsContent>
      </Tabs>
    </>
  );
}
