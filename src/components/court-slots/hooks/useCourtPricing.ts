import { useState, useEffect } from "react";
import { courtSlotsService } from "@/services/court-slots.service";
import type { CourtPricingDB } from "@/models/db/court";

export interface PricingRule {
  id: number;
  court_id: number;
  start_time: string;
  end_time: string;
  price_per_player: number;
}

export function useCourtPricing() {
  const [pricing, setPricing] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadPricing() {
      try {
        setLoading(true);
        const rules = await courtSlotsService.getPricing();
        const pricingMap = new Map<string, number>();

        for (const rule of rules) {
          // Normalizar tiempos a formato HH:MM (pueden venir como HH:MM:SS desde la DB)
          const startTime = rule.start_time.slice(0, 5);
          const endTime = rule.end_time.slice(0, 5);
          // Usar un separador diferente para evitar conflictos con el formato HH:MM
          // Key: court_id|start_time|end_time
          const key = `${rule.court_id}|${startTime}|${endTime}`;
          pricingMap.set(key, rule.price_per_player);
        }

        setPricing(pricingMap);
        console.log("[useCourtPricing] Loaded pricing rules:", {
          totalRules: rules.length,
          mapSize: pricingMap.size,
          rulesByCourt: rules.reduce((acc, r) => {
            acc[r.court_id] = (acc[r.court_id] || 0) + 1;
            return acc;
          }, {} as Record<number, number>),
          sampleEntries: Array.from(pricingMap.entries()).slice(0, 5)
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load pricing"));
        console.error("Error loading court pricing:", err);
      } finally {
        setLoading(false);
      }
    }

    loadPricing();
  }, []);

  /**
   * Get price per player for a court ID and time
   */
  const getPrice = (courtId: number, time: string): number => {
    // Normalizar el tiempo a formato HH:MM
    const normalizedTime = time.slice(0, 5);
    
    // Buscar la regla que coincida con el tiempo
    for (const [key, price] of pricing.entries()) {
      const [id, startTime, endTime] = key.split("|");
      if (parseInt(id, 10) === courtId) {
        // Comparar tiempos (formato HH:MM)
        const start = startTime.slice(0, 5);
        const end = endTime.slice(0, 5);
        
        if (normalizedTime >= start && normalizedTime < end) {
          return price;
        }
      }
    }
    return 0; // Fallback si no hay regla
  };

  return {
    pricing,
    getPrice,
    loading,
    error,
    refetch: async () => {
      try {
        setLoading(true);
        const rules = await courtSlotsService.getPricing();
        const pricingMap = new Map<string, number>();

        for (const rule of rules) {
          // Normalizar tiempos a formato HH:MM (pueden venir como HH:MM:SS desde la DB)
          const startTime = rule.start_time.slice(0, 5);
          const endTime = rule.end_time.slice(0, 5);
          // Usar un separador diferente para evitar conflictos con el formato HH:MM
          const key = `${rule.court_id}|${startTime}|${endTime}`;
          pricingMap.set(key, rule.price_per_player);
        }

        setPricing(pricingMap);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load pricing"));
      } finally {
        setLoading(false);
      }
    },
  };
}
