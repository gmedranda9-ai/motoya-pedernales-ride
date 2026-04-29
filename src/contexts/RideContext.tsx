import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CheckCircle, MapPin, Star, XCircle, ExternalLink } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";

export interface IncomingRideRequest {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerRating: number;
  passengerTrips: number;
  origin: string;
  originCoords?: { lat: number; lng: number };
  destination: string;
  costType: "city" | "outside";
  createdAt: string;
}

interface RideContextValue {
  incomingRequest: IncomingRideRequest | null;
  acceptedRide: IncomingRideRequest | null;
  consumeAcceptedRide: () => IncomingRideRequest | null;
  checkPendingRequest: () => Promise<boolean>;
}

const RideContext = createContext<RideContextValue>({
  incomingRequest: null,
  acceptedRide: null,
  consumeAcceptedRide: () => null,
  checkPendingRequest: async () => false,
});

export const useRide = () => useContext(RideContext);

const REQUEST_TIMEOUT_SECONDS = 60;

export const RideProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [conductorId, setConductorId] = useState<string | null>(null);
  const [isApprovedAvailable, setIsApprovedAvailable] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState<IncomingRideRequest | null>(null);
  const [requestTimer, setRequestTimer] = useState(REQUEST_TIMEOUT_SECONDS);
  const [acceptedRide, setAcceptedRide] = useState<IncomingRideRequest | null>(null);

  // Refresh conductor info on user change + listen to availability/status changes
  useEffect(() => {
    if (!user) {
      setConductorId(null);
      setIsApprovedAvailable(false);
      return;
    }
    let cancelled = false;

    const loadConductor = async () => {
      const { data } = await supabase
        .from("conductores")
        .select("id, estado, disponible")
        .eq("usuario_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setConductorId(data.id);
        setIsApprovedAvailable(data.estado === "aprobado" && !!data.disponible);
      } else {
        setConductorId(null);
        setIsApprovedAvailable(false);
      }
    };

    loadConductor();

    // Listen for availability/state changes on this conductor row
    const channel = supabase
      .channel(`conductor-self-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conductores", filter: `usuario_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as any;
          setConductorId(row.id);
          setIsApprovedAvailable(row.estado === "aprobado" && !!row.disponible);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Builds an IncomingRideRequest from a viajes row, fetching passenger info
  const buildRequestFromViaje = useCallback(async (viaje: any): Promise<IncomingRideRequest> => {
    let passengerName = viaje.pasajero_nombre || "";
    let passengerRating = 0;
    let passengerTrips = 0;

    if (!passengerName) {
      try {
        const { data: pasajero } = await supabase
          .from("usuarios")
          .select("nombre")
          .eq("id", viaje.pasajero_id)
          .maybeSingle();
        if (pasajero?.nombre) passengerName = pasajero.nombre;
      } catch (e) {
        console.error("usuarios fetch:", e);
      }
    }
    if (!passengerName) passengerName = "Pasajero";

    try {
      const { count } = await supabase
        .from("viajes")
        .select("id", { count: "exact", head: true })
        .eq("pasajero_id", viaje.pasajero_id)
        .eq("estado", "completado");
      passengerTrips = count ?? 0;
    } catch (e) {
      console.error("trips count:", e);
    }

    try {
      const { data: calificaciones } = await supabase
        .from("calificaciones")
        .select("estrellas")
        .eq("pasajero_id", viaje.pasajero_id);
      if (calificaciones && calificaciones.length > 0) {
        const sum = calificaciones.reduce((acc: number, c: any) => acc + (c.estrellas || 0), 0);
        passengerRating = sum / calificaciones.length;
      }
    } catch (e) {
      console.error("ratings fetch:", e);
    }

    return {
      id: viaje.id,
      passengerId: viaje.pasajero_id,
      passengerName,
      passengerRating,
      passengerTrips,
      origin: viaje.origen || "Origen no especificado",
      originCoords:
        viaje.origen_lat && viaje.origen_lng
          ? { lat: viaje.origen_lat, lng: viaje.origen_lng }
          : undefined,
      destination: viaje.destino || "Destino no especificado",
      costType: viaje.tipo_cobro === "fuera" ? "outside" : "city",
      createdAt: viaje.created_at,
    };
  }, []);

  // Manually check DB for a pending viaje (used when conductor opens app via push deep link
  // o al cargar ConductorHome — verifica viajes pendientes en los últimos 2 minutos)
  const checkPendingRequest = useCallback(async (): Promise<boolean> => {
    if (!conductorId) return false;
    try {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("viajes")
        .select("*")
        .eq("conductor_id", conductorId)
        .eq("estado", "pendiente")
        .gte("created_at", twoMinutesAgo)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error("checkPendingRequest error:", error);
        return false;
      }
      if (!data) return false;
      const remaining = REQUEST_TIMEOUT_SECONDS - Math.floor((Date.now() - new Date(data.created_at).getTime()) / 1000);
      if (remaining <= 0) {
        // Expired — mark as cancelled, do not show modal
        await supabase.from("viajes").update({ estado: "cancelado" }).eq("id", data.id).eq("estado", "pendiente");
        toast({ title: "Esta solicitud ya expiró", description: "El pasajero está esperando demasiado." });
        return false;
      }
      const req = await buildRequestFromViaje(data);
      setIncomingRequest(req);
      setRequestTimer(remaining);
      return true;
    } catch (e) {
      console.error("checkPendingRequest exception:", e);
      return false;
    }
  }, [conductorId, buildRequestFromViaje, toast]);

  // Global subscription to new ride requests for this conductor
  useEffect(() => {
    if (!conductorId || !isApprovedAvailable) return;

    const channel = supabase
      .channel(`viajes-conductor-global-${conductorId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "viajes",
          filter: `conductor_id=eq.${conductorId}`,
        },
        async (payload) => {
          const viaje = payload.new as any;
          if (viaje.estado !== "pendiente") return;
          // Si ya hay una solicitud abierta o un viaje aceptado en curso, ignorar nuevas
          if (incomingRequest || acceptedRide) {
            console.log("⛔ Solicitud ignorada — ya hay un viaje activo/modal abierto");
            return;
          }
          const req = await buildRequestFromViaje(viaje);
          const remaining = REQUEST_TIMEOUT_SECONDS - Math.floor((Date.now() - new Date(viaje.created_at).getTime()) / 1000);
          if (remaining <= 0) return;
          setIncomingRequest(req);
          setRequestTimer(remaining);
          toast({
            title: "🔔 Nueva solicitud de viaje",
            description: `${req.passengerName} necesita un viaje`,
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conductorId, isApprovedAvailable, toast, incomingRequest, acceptedRide, buildRequestFromViaje]);

  // Countdown — cancels the viaje in DB if the conductor doesn't respond in 60s
  useEffect(() => {
    if (!incomingRequest) return;
    if (requestTimer <= 0) {
      const expiredId = incomingRequest.id;
      setIncomingRequest(null);
      supabase
        .from("viajes")
        .update({ estado: "cancelado" })
        .eq("id", expiredId)
        .eq("estado", "pendiente")
        .then(({ error }) => {
          if (error) console.error("Error cancelando viaje expirado:", error);
        });
      toast({ title: "Solicitud expirada", description: "El tiempo para responder terminó." });
      return;
    }
    const t = setTimeout(() => setRequestTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [requestTimer, incomingRequest, toast]);

  const handleAccept = useCallback(async () => {
    if (!incomingRequest) return;

    // Validar tiempo restante real
    const remaining = REQUEST_TIMEOUT_SECONDS - Math.floor((Date.now() - new Date(incomingRequest.createdAt).getTime()) / 1000);
    if (remaining <= 0) {
      toast({ title: "Solicitud expirada", description: "Esta solicitud ya expiró", variant: "destructive" });
      setIncomingRequest(null);
      return;
    }

    // Verificar estado actual del viaje antes de aceptar
    const { data: current, error: fetchErr } = await supabase
      .from("viajes")
      .select("estado")
      .eq("id", incomingRequest.id)
      .maybeSingle();

    if (fetchErr) {
      console.error("❌ Error verificando estado del viaje:", fetchErr);
      toast({ title: "Error", description: "No se pudo aceptar el viaje.", variant: "destructive" });
      return;
    }

    if (!current || current.estado === "cancelado") {
      toast({ title: "El pasajero canceló la solicitud", description: "Esta solicitud ya no está disponible.", variant: "destructive" });
      setIncomingRequest(null);
      return;
    }

    if (current.estado !== "pendiente") {
      toast({ title: "Solicitud no disponible", description: `Estado actual: ${current.estado}`, variant: "destructive" });
      setIncomingRequest(null);
      return;
    }

    const { error } = await supabase
      .from("viajes")
      .update({ estado: "aceptado" })
      .eq("id", incomingRequest.id)
      .eq("estado", "pendiente");
    if (error) {
      console.error("❌ Error al aceptar viaje:", error);
      toast({ title: "Error", description: "No se pudo aceptar el viaje.", variant: "destructive" });
      return;
    }
    setAcceptedRide(incomingRequest);
    setIncomingRequest(null);
    toast({ title: "✅ Viaje aceptado", description: `Dirígete hacia ${incomingRequest.passengerName}` });
    navigate("/");
  }, [incomingRequest, navigate, toast]);

  const handleReject = useCallback(async () => {
    if (!incomingRequest) return;
    const rejectedId = incomingRequest.id;
    setIncomingRequest(null);
    const { error } = await supabase
      .from("viajes")
      .update({ estado: "rechazado" })
      .eq("id", rejectedId)
      .eq("estado", "pendiente");
    if (error) {
      console.error("❌ Error al rechazar viaje:", error);
    }
    toast({ title: "Solicitud rechazada", description: "Sigues disponible para otras solicitudes." });
  }, [incomingRequest, toast]);

  // ConductorHome calls this to take ownership of the accepted ride
  const consumeAcceptedRide = useCallback(() => {
    const r = acceptedRide;
    if (r) setAcceptedRide(null);
    return r;
  }, [acceptedRide]);

  const openInMaps = (address: string, coords?: { lat: number; lng: number }) => {
    const query = coords
      ? `${coords.lat},${coords.lng}`
      : encodeURIComponent(address + " Pedernales Ecuador");
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  return (
    <RideContext.Provider value={{ incomingRequest, acceptedRide, consumeAcceptedRide, checkPendingRequest }}>
      {children}
      {incomingRequest && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center px-6 animate-fade-in overflow-y-auto py-8">
          <div className="text-center space-y-5 max-w-sm w-full">
            <span className="text-4xl">🔔</span>
            <h2 className="text-lg font-extrabold text-foreground">¡Nueva solicitud de viaje!</h2>

            <div className="flex items-center justify-center gap-3">
              <UserAvatar nombre={incomingRequest.passengerName} size="md" />
              <div className="text-left">
                <p className="font-bold text-foreground">{incomingRequest.passengerName}</p>
                {incomingRequest.passengerTrips < 3 ? (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-accent/20 text-accent text-[10px] font-semibold">
                    ✨ Nuevo usuario
                  </span>
                ) : (
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`h-3.5 w-3.5 ${
                          n <= Math.round(incomingRequest.passengerRating)
                            ? "fill-accent text-accent"
                            : "text-muted-foreground"
                        }`}
                      />
                    ))}
                    <span className="text-xs text-muted-foreground ml-1">
                      {incomingRequest.passengerRating.toFixed(1)} · {incomingRequest.passengerTrips} viajes
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border p-4 space-y-3 text-left">
              <div className="flex items-start gap-2">
                <div className="w-3 h-3 rounded-full bg-[hsl(var(--success))] mt-1 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Origen</p>
                  <p className="text-sm font-medium text-foreground">{incomingRequest.origin}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-3 w-3 text-accent mt-1 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Destino</p>
                  <p className="text-sm font-medium text-foreground">{incomingRequest.destination}</p>
                </div>
              </div>
              <div className="border-t border-border pt-2">
                <p className="text-sm font-bold text-accent">
                  {incomingRequest.costType === "city"
                    ? "💰 $1.00 (dentro de la ciudad)"
                    : "💰 Consultar con pasajero"}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={() => openInMaps(incomingRequest.origin, incomingRequest.originCoords)}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver ubicación en Google Maps
            </Button>

            {/* Circular timer */}
            <div className="relative w-20 h-20 mx-auto">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  stroke="hsl(var(--accent))"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - requestTimer / REQUEST_TIMEOUT_SECONDS)}`}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-extrabold text-foreground">
                {requestTimer}s
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="lg"
                className="rounded-xl border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={handleReject}
              >
                <XCircle className="h-5 w-5 mr-1" /> Rechazar
              </Button>
              <Button variant="hero" size="lg" className="rounded-xl" onClick={handleAccept}>
                <CheckCircle className="h-5 w-5 mr-1" /> Aceptar
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground">
              Tienes {requestTimer}s para responder esta solicitud
            </p>
          </div>
        </div>
      )}
    </RideContext.Provider>
  );
};
