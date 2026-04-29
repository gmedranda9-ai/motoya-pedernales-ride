import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
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
 * Per-screen handler used by overlay/secondary screens (chat, driver profile,
 * trip history, etc.). While `active` is true, the device back button calls
 * `onBack()` instead of triggering the global main-screen exit dialog.
 *
 * Implementation: push a sentinel history entry while the overlay is open;
 * on popstate, run `onBack`. The overlay must call its own close handler.
 */
export const useBackHandler = (active: boolean, onBack: () => void) => {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!active) return;

    // Push a sentinel entry so the next back press fires popstate here.
    window.history.pushState({ __motoyaOverlay: true }, "");

    const handler = (e: PopStateEvent) => {
      if ((window as any).__motoyaActiveRide) {
        // Ride lock takes precedence — re-push and warn.
        window.history.pushState({ __motoyaOverlay: true }, "");
        toast.error("No puedes salir durante un viaje activo");
        return;
      }
      onBackRef.current();
    };

    window.addEventListener("popstate", handler);
    return () => {
      window.removeEventListener("popstate", handler);
      // If we're unmounting while our sentinel is still on top of the stack
      // (overlay closed via UI, not via back button), pop it so we don't leak
      // an extra entry.
      if (window.history.state?.__motoyaOverlay) {
        window.history.back();
      }
    };
  }, [active]);
};

/**
 * Global back-button handler for MAIN routes only.
 *
 * - Active ride: block and notify.
 * - Main screens (bottom nav): show "exit app?" confirmation dialog.
 * - Secondary routes (auth, etc.): plain history back (browser default).
 *
 * Overlay screens (chat, driver profile, historial) opt in with
 * `useBackHandler(open, close)` and are handled before this global guard.
 */
const BackButtonGuard = () => {
  const location = useLocation();
  const [exitOpen, setExitOpen] = useState(false);

  useEffect(() => {
    const isMainRoute = MAIN_ROUTES.includes(location.pathname);
    if (!isMainRoute) return;

    // Push a sentinel so the first back press lands on our handler.
    window.history.pushState({ __motoyaMain: true }, "");

    const handlePopState = () => {
      if ((window as any).__motoyaActiveRide) {
        window.history.pushState({ __motoyaMain: true }, "");
        toast.error("No puedes salir durante un viaje activo");
        return;
      }
      // Re-push so we stay on this main screen until the user confirms.
      window.history.pushState({ __motoyaMain: true }, "");
      setExitOpen(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (window.history.state?.__motoyaMain) {
        window.history.back();
      }
    };
  }, [location.pathname]);

  const handleExit = () => {
    setExitOpen(false);
    // Try to close the window/PWA. Browsers only allow this for windows the
    // script opened, so as a fallback go far back to leave the app.
    setTimeout(() => {
      window.close();
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

/** Backwards-compatible no-op. */
export const useBackButton = () => {};
