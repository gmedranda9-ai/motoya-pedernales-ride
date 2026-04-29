import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const MAIN_ROUTES = ["/", "/viajes", "/mensajes", "/perfil", "/admin"];

/**
 * Mark the app as being inside an active ride.
 * While true, the device back button is blocked.
 */
export const setActiveRide = (active: boolean) => {
  (window as any).__motoyaActiveRide = active;
};

/**
 * Global back-button handler. Mount once near the root of the app.
 *
 * - Active ride: block and notify.
 * - Main screens (bottom nav): show "exit app?" confirmation dialog.
 * - Secondary screens / auth screens: navigate back to the previous screen.
 */
const BackButtonGuard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [exitOpen, setExitOpen] = useState(false);

  useEffect(() => {
    const isMainRoute = MAIN_ROUTES.includes(location.pathname);

    // Push a sentinel so the first back press lands on our handler.
    window.history.pushState(
      { __motoyaSentinel: true },
      "",
      location.pathname + location.search,
    );

    const repush = () =>
      window.history.pushState(
        { __motoyaSentinel: true },
        "",
        location.pathname + location.search,
      );

    const handlePopState = () => {
      if ((window as any).__motoyaActiveRide) {
        repush();
        toast.error("No puedes salir durante un viaje activo");
        return;
      }

      if (isMainRoute) {
        repush();
        setExitOpen(true);
      } else {
        navigate(-1);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [location.pathname, location.search, navigate]);

  const handleExit = () => {
    setExitOpen(false);
    // Try to close the window/PWA. If the browser blocks it, fall back to history.
    setTimeout(() => {
      window.close();
      // Fallback: go far back in history to leave the app.
      window.history.go(-window.history.length);
    }, 50);
  };

  return (
    <AlertDialog open={exitOpen} onOpenChange={setExitOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Salir de MotoYa?</AlertDialogTitle>
          <AlertDialogDescription>
            ¿Deseas cerrar la aplicación?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleExit}>Salir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BackButtonGuard;

/**
 * Backwards-compatible no-op hook. Per-page `useBackButton()` calls keep
 * working but the real logic now lives in the global <BackButtonGuard />.
 */
export const useBackButton = () => {
  // intentionally empty — handled globally
};
