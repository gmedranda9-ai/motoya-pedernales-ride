import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const MAIN_ROUTES = ["/", "/viajes", "/mensajes", "/perfil", "/admin"];

/**
 * Global handler for the device back button.
 *
 * - Main screens (bottom nav): show "exit app?" confirmation dialog.
 * - Secondary screens: navigate back to the previous screen.
 * - During an active ride (window flag): block exit and toast a message.
 */
export const useBackButton = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const isMainRoute = MAIN_ROUTES.includes(location.pathname);

    // Always push a sentinel entry so the first back press is captured by us.
    window.history.pushState({ __motoyaSentinel: true }, "", location.pathname + location.search);

    const handlePopState = () => {
      // Re-push so we keep control of the next back press as well.
      const repush = () =>
        window.history.pushState({ __motoyaSentinel: true }, "", location.pathname + location.search);

      // Block back button during an active ride.
      if ((window as any).__motoyaActiveRide) {
        repush();
        // Lazy import to avoid SSR issues.
        import("sonner").then(({ toast }) => {
          toast.error("No puedes salir durante un viaje activo");
        });
        return;
      }

      if (isMainRoute) {
        repush();
        const ok = window.confirm("¿Salir de MotoYa?\n\n¿Deseas cerrar la aplicación?");
        if (ok) {
          // Pop our sentinel and the previous one so we actually leave.
          window.history.go(-2);
        }
      } else {
        // Secondary screen: go back to the previous logical page.
        navigate(-1);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [location.pathname, location.search, navigate]);
};

/**
 * Mark the app as inside an active ride, so the back button is blocked.
 * Call setActiveRide(true) when a trip starts and setActiveRide(false) when it finishes.
 */
export const setActiveRide = (active: boolean) => {
  (window as any).__motoyaActiveRide = active;
};
