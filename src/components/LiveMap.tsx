import { Component, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader, Marker, Polyline } from "@react-google-maps/api";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, AlertTriangle } from "lucide-react";
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

const LiveMap = ({ viajeId, passengerLocation, className }: LiveMapProps) => {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const [passenger, setPassenger] = useState<LatLng | null>(passengerLocation ?? null);
  const [driver, setDriver] = useState<LatLng | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Detect passenger location if not provided
  useEffect(() => {
    if (passengerLocation || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setPassenger({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setPassenger(PEDERNALES_FALLBACK),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [passengerLocation]);

  // Initial fetch + realtime subscription to driver coordinates
  useEffect(() => {
    if (!viajeId) return;

    let cancelled = false;
    const loadInitial = async () => {
      const { data } = await supabase
        .from("viajes")
        .select("conductor_lat, conductor_lng")
        .eq("id", viajeId)
        .maybeSingle();
      if (cancelled) return;
      const lat = (data as any)?.conductor_lat;
      const lng = (data as any)?.conductor_lng;
      if (typeof lat === "number" && typeof lng === "number") {
        setDriver({ lat, lng });
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

  // Fit bounds whenever both points are known
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
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
  }, [isLoaded, passenger, driver]);

  const center = useMemo(() => passenger ?? driver ?? PEDERNALES_FALLBACK, [passenger, driver]);

  // Marker icons (built lazily once Google is loaded)
  const passengerIcon = useMemo(() => {
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

  const driverIcon = useMemo(() => {
    if (!isLoaded) return undefined;
    const svg = `
      <svg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'>
        <circle cx='22' cy='22' r='20' fill='#1a3a5c' stroke='#f5c518' stroke-width='3'/>
        <image href='/favicon.png' x='6' y='6' width='32' height='32' clip-path='circle(16px at 16px 16px)'/>
      </svg>`;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(44, 44),
      anchor: new google.maps.Point(22, 22),
    } as google.maps.Icon;
  }, [isLoaded]);

  if (!isLoaded) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className ?? ""}`}>
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className={className}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={15}
        onLoad={(map) => { mapRef.current = map; }}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          clickableIcons: false,
        }}
      >
        {passenger && <Marker position={passenger} icon={passengerIcon} title="Tú" />}
        {driver && <Marker position={driver} icon={driverIcon} title="Conductor" />}
        {passenger && driver && (
          <Polyline
            path={[passenger, driver]}
            options={{
              strokeColor: "#f5c518",
              strokeOpacity: 0.9,
              strokeWeight: 4,
              geodesic: true,
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
};

export default LiveMap;
