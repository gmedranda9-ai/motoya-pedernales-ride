import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const MAIN_ROUTES = ["/", "/viajes", "/mensajes", "/perfil"];

/**
 * Prevents the physical back button from exiting the app on main screens.
 * On secondary screens, it navigates back normally.
 */
export const useBackButton = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const isMainRoute = MAIN_ROUTES.includes(location.pathname);

    if (isMainRoute) {
      // Push a duplicate entry so pressing back stays on the same page
      window.history.pushState(null, "", location.pathname + location.search);

      const handlePopState = () => {
        // Re-push to prevent leaving
        window.history.pushState(null, "", location.pathname + location.search);
      };

      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    } else {
      // Secondary screens: let back button go to previous page
      const handlePopState = () => {
        navigate(-1);
      };

      // We don't need to intercept on secondary routes — 
      // the browser's default popstate with React Router handles it.
      // No-op here.
    }
  }, [location.pathname, location.search, navigate]);
};
