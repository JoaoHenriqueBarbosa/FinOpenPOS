// lib/query-client.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Solo refetch en mount si los datos están stale (no fresh)
      refetchOnMount: true,
      // Evitar refetch automático cuando la ventana recupera el foco (solo si los datos están stale)
      refetchOnWindowFocus: false,
      // Evitar refetch automático al reconectar (solo si los datos están stale)
      refetchOnReconnect: false,
      // Tiempo por defecto que los datos se consideran "fresh" (5 minutos)
      // Si los datos son fresh, no se hará refetch automático
      staleTime: 1000 * 60 * 5,
      // Tiempo que los datos se mantienen en cache (10 minutos)
      gcTime: 1000 * 60 * 10,
      // Reintentar automáticamente en caso de error
      retry: 1,
    },
  },
});
