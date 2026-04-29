import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Marca la app como en viaje activo. Cuando es true, si el usuario intenta
 * navegar hacia atrás se muestra un toast pero NO se bloquea con diálogos
 * ni se interceptan eventos popstate de forma agresiva.
 */
let activeRide = false;

export const setActiveRide = (active: boolean) => {
  activeRide = active;
  (window as any).__motoyaActiveRide = active;
};

/**
 * Hook global muy ligero: si hay viaje activo y el usuario navega atrás,
 * mostramos un toast informativo. No bloqueamos navegación ni mostramos
 * diálogos de salida. La navegación atrás del navegador funciona de forma
 * natural en el resto de casos.
 */
const BackButtonGuard = () => {
  useEffect(() => {
    const onPop = () => {
      if (activeRide) {
        toast.error("No puedes salir durante un viaje activo");
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return null;
};

export default BackButtonGuard;

/** No-ops mantenidos por compatibilidad con imports existentes. */
export const useBackButton = () => {};
export const useBackHandler = (_active: boolean, _onBack: () => void) => {};
