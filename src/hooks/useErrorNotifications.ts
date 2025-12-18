import { useEffect } from "react";
import { toast } from "sonner";

export interface ErrorNotification {
  error: boolean | unknown;
  message: string;
}

/**
 * Hook para manejar notificaciones de errores automáticamente
 * 
 * @param errors - Array de objetos con error y mensaje
 * 
 * @example
 * ```tsx
 * useErrorNotifications([
 *   { error: isPaymentMethodsError, message: "No se pudieron cargar los métodos de pago." },
 *   { error: isCourtSlotsError, message: "No se pudieron cargar los turnos de canchas." },
 * ]);
 * ```
 */
export function useErrorNotifications(errors: ErrorNotification[]) {
  useEffect(() => {
    errors.forEach(({ error, message }) => {
      if (error) {
        toast.error(message);
      }
    });
  }, [errors]);
}

