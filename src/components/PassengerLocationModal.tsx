import { useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from "@react-google-maps/api";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, X, Navigation, Clock } from "lucide-react";

interface LatLng { lat: number; lng: number }

interface PassengerLocationModalProps {
  open: boolean;
  onClose: () => void;
  passengerName: string;
  passengerLocation: LatLng | null;
  originLabel?: string;
  conductorLocation?: LatLng | null;
}

const GOOGLE_MAPS_API_KEY = "AIzaSyAQnd6PVHzzNBtDo7F316cNAYcwpR1XP-Y";
const containerStyle = { width: "100%", height: "100%" };

const PassengerLocationModal = ({
  open,
  onClose,
  passengerName,
  passengerLocation,
  originLabel,
  conductorLocation,
}: PassengerLocationModalProps) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [driverPos, setDriverPos] = useState<LatLng | null>(conductorLocation ?? null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Get driver location if not provided
  useEffect(() => {
    if (!open) return;
    if (conductorLocation) {
      setDriverPos(conductorLocation);
      return;
    }
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setDriverPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setDriverPos(null),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [open, conductorLocation]);

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
      fillColor: "#1a3a5c",
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 3,
    } as google.maps.Symbol;
  }, [isLoaded]);

  const center = passengerLocation ?? driverPos ?? { lat: 0.0689, lng: -80.0517 };

  // Fit bounds to show both markers
  useEffect(() => {
    if (!open || !mapReady || !mapRef.current) return;
    if (passengerLocation && driverPos) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(passengerLocation);
      bounds.extend(driverPos);
      mapRef.current.fitBounds(bounds, 80);
    } else if (passengerLocation) {
      mapRef.current.panTo(passengerLocation);
      mapRef.current.setZoom(16);
    }
  }, [open, mapReady, passengerLocation, driverPos]);

  // Compute route
  useEffect(() => {
    if (!isLoaded || !open || !passengerLocation || !driverPos) {
      setDirections(null);
      setRouteInfo(null);
      return;
    }
    const svc = new google.maps.DirectionsService();
    svc.route(
      {
        origin: driverPos,
        destination: passengerLocation,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK" && result) {
          setDirections(result);
          setRouteError(null);
          const leg = result.routes[0]?.legs[0];
          if (leg?.distance && leg?.duration) {
            setRouteInfo({ distance: leg.distance.text, duration: leg.duration.text });
          }
        } else {
          setDirections(null);
          setRouteInfo(null);
          setRouteError("No se pudo trazar la ruta");
        }
      }
    );
  }, [isLoaded, open, passengerLocation, driverPos]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-background/95 backdrop-blur-sm flex items-center justify-center px-4 py-8 animate-fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 pb-2 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            📍 Ubicación del pasajero
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-muted-foreground hover:bg-muted transition"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="w-full h-[360px] bg-muted relative flex-shrink-0">
          {loadError ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-center">
              <AlertTriangle className="h-8 w-8 text-accent" />
              <p className="text-sm text-muted-foreground">No se pudo cargar el mapa</p>
            </div>
          ) : !isLoaded ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={passengerLocation ? 15 : 14}
              onLoad={(map) => {
                mapRef.current = map;
                setMapReady(true);
              }}
              options={{
                disableDefaultUI: true,
                zoomControl: true,
                gestureHandling: "greedy",
                clickableIcons: false,
              }}
            >
              {passengerLocation && (
                <Marker position={passengerLocation} icon={passengerIcon} title={passengerName} />
              )}
              {driverPos && (
                <Marker position={driverPos} icon={driverIcon} title="Tu ubicación" />
              )}
              {directions && (
                <DirectionsRenderer
                  directions={directions}
                  options={{
                    suppressMarkers: true,
                    polylineOptions: {
                      strokeColor: "#1a3a5c",
                      strokeWeight: 5,
                      strokeOpacity: 0.85,
                    },
                  }}
                />
              )}
            </GoogleMap>
          )}
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="inline-block w-3 h-3 rounded-full bg-[#f5c518] border-2 border-white shadow" />
            {originLabel || "Ubicación del pasajero"}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="inline-block w-3 h-3 rounded-full bg-[#1a3a5c] border-2 border-white shadow" />
            Tu ubicación (conductor)
          </div>

          {routeInfo && (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted/60 rounded-xl p-3 flex items-center gap-2">
                <Navigation className="h-4 w-4 text-[#1a3a5c]" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Distancia</p>
                  <p className="text-sm font-bold text-foreground">{routeInfo.distance}</p>
                </div>
              </div>
              <div className="bg-muted/60 rounded-xl p-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#1a3a5c]" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Tiempo est.</p>
                  <p className="text-sm font-bold text-foreground">{routeInfo.duration}</p>
                </div>
              </div>
            </div>
          )}

          {!passengerLocation && (
            <p className="text-center text-xs text-muted-foreground">
              El pasajero no compartió coordenadas exactas
            </p>
          )}
          {passengerLocation && !driverPos && (
            <p className="text-center text-xs text-muted-foreground">
              Activando tu ubicación para calcular la ruta…
            </p>
          )}
          {routeError && (
            <p className="text-center text-xs text-destructive">{routeError}</p>
          )}

          <Button variant="outline" className="w-full rounded-xl" onClick={onClose}>
            <X className="h-4 w-4 mr-1" /> Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PassengerLocationModal;
