import { useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, X } from "lucide-react";

interface LatLng { lat: number; lng: number }

interface DriverLocationModalProps {
  open: boolean;
  onClose: () => void;
  driverName: string;
  driverLocation: LatLng | null;
  passengerLocation: LatLng | null;
}

const GOOGLE_MAPS_API_KEY = "AIzaSyAQnd6PVHzzNBtDo7F316cNAYcwpR1XP-Y";
const containerStyle = { width: "100%", height: "100%" };

// Haversine (metros)
const distanceMeters = (a: LatLng, b: LatLng) => {
  const R = 6371000;
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const formatDistance = (m: number) => {
  if (m < 1000) return `${Math.round(m)} metros`;
  return `${(m / 1000).toFixed(1)} km`;
};

const DriverLocationModal = ({
  open,
  onClose,
  driverName,
  driverLocation,
  passengerLocation,
}: DriverLocationModalProps) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<LatLng | null>(null);

  useEffect(() => {
    if (!open || passengerLocation || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [open, passengerLocation]);

  const effectivePassenger = passengerLocation ?? gpsLocation;

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

  const fitBoth = () => {
    if (!mapRef.current || !isLoaded) return;
    if (driverLocation && effectivePassenger) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(driverLocation);
      bounds.extend(effectivePassenger);
      mapRef.current.fitBounds(bounds, 80);
    } else if (driverLocation) {
      mapRef.current.panTo(driverLocation);
      mapRef.current.setZoom(15);
    } else if (effectivePassenger) {
      mapRef.current.panTo(effectivePassenger);
      mapRef.current.setZoom(15);
    }
  };

  useEffect(() => {
    if (open && mapReady) {
      setTimeout(fitBoth, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mapReady, driverLocation, effectivePassenger]);

  const distance =
    driverLocation && effectivePassenger ? distanceMeters(driverLocation, effectivePassenger) : null;

  const center = driverLocation ?? effectivePassenger ?? { lat: 0.0689, lng: -80.0517 };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            📍 Ubicación de {driverName}
          </DialogTitle>
        </DialogHeader>

        <div className="w-full h-[360px] bg-muted relative">
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
              zoom={15}
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
              {driverLocation && (
                <Marker position={driverLocation} icon={driverIcon} title="Conductor" />
              )}
              {passengerLocation && (
                <Marker position={passengerLocation} icon={passengerIcon} title="Tú" />
              )}
            </GoogleMap>
          )}
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="inline-block w-3 h-3 rounded-full bg-[#1a73e8] border-2 border-white shadow" />
              Conductor
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="inline-block w-3 h-3 rounded-full bg-[#f5c518] border-2 border-white shadow" />
              Tú
            </span>
          </div>

          {distance != null ? (
            <p className="text-center text-sm font-semibold text-foreground">
              A {formatDistance(distance)} de tu ubicación
            </p>
          ) : !driverLocation ? (
            <p className="text-center text-xs text-muted-foreground">
              El conductor aún no ha compartido su ubicación
            </p>
          ) : !passengerLocation ? (
            <p className="text-center text-xs text-muted-foreground">
              No tenemos tu ubicación actual
            </p>
          ) : null}

          <Button variant="outline" className="w-full rounded-xl" onClick={onClose}>
            <X className="h-4 w-4 mr-1" /> Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DriverLocationModal;
