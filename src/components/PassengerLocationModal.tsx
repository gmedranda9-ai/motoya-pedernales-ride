import { useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, X } from "lucide-react";

interface LatLng { lat: number; lng: number }

interface PassengerLocationModalProps {
  open: boolean;
  onClose: () => void;
  passengerName: string;
  passengerLocation: LatLng | null;
  originLabel?: string;
}

const GOOGLE_MAPS_API_KEY = "AIzaSyAQnd6PVHzzNBtDo7F316cNAYcwpR1XP-Y";
const containerStyle = { width: "100%", height: "100%" };

const PassengerLocationModal = ({
  open,
  onClose,
  passengerName,
  passengerLocation,
  originLabel,
}: PassengerLocationModalProps) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script-passenger",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

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

  const center = passengerLocation ?? { lat: 0.0689, lng: -80.0517 };

  useEffect(() => {
    if (open && mapReady && mapRef.current && passengerLocation) {
      mapRef.current.panTo(passengerLocation);
      mapRef.current.setZoom(16);
    }
  }, [open, mapReady, passengerLocation]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-background/95 backdrop-blur-sm flex items-center justify-center px-4 py-8 animate-fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 pb-2 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            📍 Ubicación de recogida
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
              zoom={passengerLocation ? 16 : 15}
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
            </GoogleMap>
          )}
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="inline-block w-3 h-3 rounded-full bg-[#f5c518] border-2 border-white shadow" />
            {originLabel || "Ubicación del pasajero"}
          </div>

          {!passengerLocation && (
            <p className="text-center text-xs text-muted-foreground">
              El pasajero no compartió coordenadas exactas
            </p>
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
