import { Component, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, AlertTriangle, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";

// Fallback UI when Google Maps fails to load or crashes at runtime
const MapFallback = ({ onRetry }: { onRetry: () => void }) => (
  <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4 text-center bg-muted">
    <AlertTriangle className="h-8 w-8 text-accent" />
    <p className="text-sm font-semibold text-foreground">El mapa no pudo cargar</p>
    <p className="text-xs text-muted-foreground">El viaje continúa normalmente.</p>
    <Button size="sm" variant="outline" className="rounded-xl mt-1" onClick={onRetry}>
      <RefreshCw className="h-4 w-4 mr-1" /> Reintentar
    </Button>
  </div>
);

// Error boundary so a Maps runtime crash never blanks the app
class MapErrorBoundary extends Component<
  { onRetry: () => void; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.error("LiveMap crashed:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <MapFallback
          onRetry={() => {
            this.setState({ hasError: false });
            this.props.onRetry();
          }}
        />
      );
    }
    return this.props.children;
  }
}

const GOOGLE_MAPS_API_KEY = "AIzaSyAQnd6PVHzzNBtDo7F316cNAYcwpR1XP-Y";

interface LatLng {
  lat: number;
  lng: number;
}

interface LiveMapProps {
  viajeId: string;
  /** Passenger location (blue pin). If omitted, browser geolocation is used. */
  passengerLocation?: LatLng;
  className?: string;
}

const containerStyle = { width: "100%", height: "100%" };

const PEDERNALES_FALLBACK: LatLng = { lat: 0.0689, lng: -80.0517 };

const LiveMapInner = ({ viajeId, passengerLocation, className, onRetry }: LiveMapProps & { onRetry: () => void }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const [passenger, setPassenger] = useState<LatLng | null>(passengerLocation ?? null);
  const [driver, setDriver] = useState<LatLng | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const userInteractedRef = useRef(false);
  const didInitialFitRef = useRef(false);

  const fitToBoth = (force = false) => {
    if (!mapRef.current) return;
    if (passenger && driver) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(passenger);
      bounds.extend(driver);
      mapRef.current.fitBounds(bounds, 80);
    } else if (passenger) {
      mapRef.current.panTo(passenger);
      mapRef.current.setZoom(15);
    } else if (driver) {
      mapRef.current.panTo(driver);
      mapRef.current.setZoom(15);
    }
    if (force) userInteractedRef.current = false;
  };

  // Sync passenger location from prop whenever it changes
  useEffect(() => {
    if (passengerLocation) setPassenger(passengerLocation);
  }, [passengerLocation]);

  // Initial fetch + realtime subscription to driver + passenger origin coordinates
  useEffect(() => {
    if (!viajeId) return;

    let cancelled = false;
    const loadInitial = async () => {
      const { data } = await supabase
        .from("viajes")
        .select("conductor_lat, conductor_lng, origen_lat, origen_lng")
        .eq("id", viajeId)
        .maybeSingle();
      if (cancelled) return;
      const lat = (data as any)?.conductor_lat;
      const lng = (data as any)?.conductor_lng;
      if (typeof lat === "number" && typeof lng === "number") {
        setDriver({ lat, lng });
      }
      // Use passenger origin from DB if no prop provided
      if (!passengerLocation) {
        const oLat = (data as any)?.origen_lat;
        const oLng = (data as any)?.origen_lng;
        if (typeof oLat === "number" && typeof oLng === "number") {
          setPassenger({ lat: oLat, lng: oLng });
        }
        // If origen_lat/lng vacíos → no mostrar pin del pasajero (no crash)
      }
    };
    loadInitial();

    const channel = supabase
      .channel(`viaje_map_${viajeId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "viajes", filter: `id=eq.${viajeId}` },
        (payload: any) => {
          const lat = payload.new?.conductor_lat;
          const lng = payload.new?.conductor_lng;
          if (typeof lat === "number" && typeof lng === "number") {
            setDriver({ lat, lng });
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [viajeId]);

  // Initial fitBounds only once; do not auto-recenter while the user navigates the map.
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
    if (didInitialFitRef.current) return;
    if (passenger || driver) {
      fitToBoth();
      if (passenger && driver) didInitialFitRef.current = true;
    }
  }, [isLoaded, passenger, driver]);

  // Draw route line imperatively to avoid @react-google-maps Polyline setPath crashes.
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !passenger || !driver) {
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
      return;
    }

    if (!polylineRef.current) {
      polylineRef.current = new google.maps.Polyline({
        map: mapRef.current,
        strokeColor: "#f5c518",
        strokeOpacity: 0.9,
        strokeWeight: 4,
        geodesic: true,
      });
    }
    polylineRef.current.setPath([passenger, driver]);

    return () => {
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
    };
  }, [isLoaded, passenger, driver]);

  const center = useMemo(() => passenger ?? driver ?? PEDERNALES_FALLBACK, [passenger, driver]);

  // Marker icons (built lazily once Google is loaded)
  // Pasajero → amarillo, Conductor → azul
  const passengerIcon = useMemo(() => {
    if (!isLoaded) return undefined;
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: "#f5c518",
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 3,
    } as google.maps.Symbol;
  }, [isLoaded]);

  const driverIcon = useMemo(() => {
    if (!isLoaded) return undefined;
    return {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: "#1a73e8",
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 3,
    } as google.maps.Symbol;
  }, [isLoaded]);

  if (loadError) {
    return (
      <div className={className}>
        <MapFallback onRetry={onRetry} />
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className ?? ""}`}>
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className={`${className ?? ""} relative`}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={15}
        onLoad={(map) => { mapRef.current = map; }}
        onDragStart={() => { userInteractedRef.current = true; }}
        onZoomChanged={() => {
          // Marca interacción solo si ya hicimos el fit inicial (evita falsos positivos durante el fitBounds inicial)
          if (didInitialFitRef.current) userInteractedRef.current = true;
        }}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          clickableIcons: false,
        }}
      >
        {passenger && <Marker position={passenger} icon={passengerIcon} title="Pasajero" />}
        {driver && <Marker position={driver} icon={driverIcon} title="Conductor" />}
      </GoogleMap>

      {/* Botón flotante para recentrar y ver ambos pins */}
      <button
        type="button"
        onClick={() => fitToBoth(true)}
        aria-label="Centrar mapa"
        className="absolute bottom-3 right-3 z-10 h-11 w-11 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-foreground hover:bg-muted active:scale-95 transition"
      >
        <Crosshair className="h-5 w-5 text-accent" />
      </button>
    </div>
  );
};

const LiveMap = (props: LiveMapProps) => {
  const [retryKey, setRetryKey] = useState(0);
  const handleRetry = () => setRetryKey((k) => k + 1);
  return (
    <MapErrorBoundary key={retryKey} onRetry={handleRetry}>
      <LiveMapInner {...props} onRetry={handleRetry} />
    </MapErrorBoundary>
  );
};

export default LiveMap;
