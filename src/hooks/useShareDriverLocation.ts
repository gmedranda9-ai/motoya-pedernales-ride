import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * While `enabled` is true, push the driver's GPS coordinates to the
 * `viajes` row every `intervalMs` ms (default 5000).
 */
export const useShareDriverLocation = (
  viajeId: string | null | undefined,
  enabled: boolean,
  intervalMs = 5000,
) => {
  useEffect(() => {
    if (!viajeId || !enabled) return;
    if (!("geolocation" in navigator)) {
      console.warn("Geolocation no disponible en este dispositivo");
      return;
    }

    let cancelled = false;
    let timer: number | undefined;

    const pushOnce = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (cancelled) return;
          const { latitude, longitude } = pos.coords;
          const { error } = await supabase
            .from("viajes")
            .update({
              conductor_lat: latitude,
              conductor_lng: longitude,
              conductor_loc_actualizado_en: new Date().toISOString(),
            })
            .eq("id", viajeId);
          if (error) console.warn("No se pudo actualizar ubicación del conductor:", error.message);
        },
        (err) => console.warn("Geolocation error:", err.message),
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 }
      );
    };

    pushOnce();
    timer = window.setInterval(pushOnce, intervalMs);

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, [viajeId, enabled, intervalMs]);
};
