import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import logoMotoya from "@/assets/logo-motoya.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Star,
  MapPin,
  Phone,
  MessageCircle,
  Send,
  Share2,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ExternalLink,
} from "lucide-react";

type ApplicationStatus = "none" | "pending" | "approved" | "rejected";
type RideStatus = "en_camino" | "en_viaje" | "completado";

interface RideRequest {
  id: string;
  passengerName: string;
  passengerPhoto: string;
  origin: string;
  destination: string;
  costType: "city" | "outside";
  timestamp: number;
}

const MOCK_REQUEST: RideRequest = {
  id: "r1",
  passengerName: "María López",
  passengerPhoto:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
  origin: "Av. Eloy Alfaro, Pedernales",
  destination: "Terminal Terrestre",
  costType: "city",
  timestamp: Date.now(),
};

const STATUS_LABELS: Record<RideStatus, { label: string; emoji: string; desc: string }> = {
  en_camino: { label: "En camino al pasajero", emoji: "🏍️", desc: "Dirígete a la ubicación del pasajero" },
  en_viaje: { label: "En viaje", emoji: "🛣️", desc: "Llevando al pasajero a su destino" },
  completado: { label: "Viaje completado", emoji: "✅", desc: "¡Has completado el viaje!" },
};

const ConductorHome = () => {
  const { user } = useAuth();
  const userName = user?.user_metadata?.nombre || user?.email?.split("@")[0] || "Conductor";

  // States
  const [appStatus, setAppStatus] = useState<ApplicationStatus>("approved"); // demo: approved
  const [available, setAvailable] = useState(false);
  const [rating] = useState(4.7);
  const [totalTrips] = useState(128);

  // Request states
  const [incomingRequest, setIncomingRequest] = useState<RideRequest | null>(null);
  const [requestTimer, setRequestTimer] = useState(30);

  // Active ride
  const [activeRide, setActiveRide] = useState<RideRequest | null>(null);
  const [rideStatus, setRideStatus] = useState<RideStatus>("en_camino");
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ from: string; text: string }[]>([]);
  const [msgText, setMsgText] = useState("");

  // Simulate incoming request when available
  useEffect(() => {
    if (!available || activeRide) return;
    const timer = setTimeout(() => {
      setIncomingRequest(MOCK_REQUEST);
      setRequestTimer(30);
    }, 3000);
    return () => clearTimeout(timer);
  }, [available, activeRide]);

  // Request countdown
  useEffect(() => {
    if (!incomingRequest) return;
    if (requestTimer <= 0) {
      setIncomingRequest(null);
      return;
    }
    const t = setTimeout(() => setRequestTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [requestTimer, incomingRequest]);

  const handleAcceptRequest = () => {
    if (!incomingRequest) return;
    setActiveRide(incomingRequest);
    setIncomingRequest(null);
    setRideStatus("en_camino");
  };

  const handleRejectRequest = () => {
    setIncomingRequest(null);
  };

  const openInMaps = (address: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, "_blank");
  };

  const handleShareWhatsApp = () => {
    if (!activeRide) return;
    const text = encodeURIComponent(
      `🏍️ Viaje MotoYa\n👤 Pasajero: ${activeRide.passengerName}\n📍 Destino: ${activeRide.destination}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const sendMessage = () => {
    if (!msgText.trim()) return;
    setMessages((prev) => [...prev, { from: "yo", text: msgText.trim() }]);
    setMsgText("");
    setTimeout(() => {
      setMessages((prev) => [...prev, { from: activeRide?.passengerName || "Pasajero", text: "¡Te espero aquí! 📍" }]);
    }, 2000);
  };

  const advanceStatus = () => {
    if (rideStatus === "en_camino") setRideStatus("en_viaje");
    else if (rideStatus === "en_viaje") setRideStatus("completado");
  };

  const finishRide = () => {
    setActiveRide(null);
    setMessages([]);
    setChatOpen(false);
    setRideStatus("en_camino");
  };

  // ── ACTIVE RIDE VIEW ──
  if (activeRide) {
    const currentStatus = STATUS_LABELS[rideStatus];

    if (rideStatus === "completado") {
      return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6 animate-fade-in">
          <div className="text-center space-y-6 max-w-sm">
            <span className="text-6xl">✅</span>
            <h2 className="text-xl font-extrabold text-foreground">¡Viaje completado!</h2>
            <p className="text-sm text-muted-foreground">
              Pasajero: <span className="font-bold text-foreground">{activeRide.passengerName}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              📍 {activeRide.destination}
            </p>
            <div className="bg-accent/10 rounded-xl px-4 py-3">
              <span className="text-sm font-bold text-accent">
                {activeRide.costType === "city" ? "Cobro: $1.00" : "Cobro acordado con el pasajero"}
              </span>
            </div>
            <Button variant="hero" size="lg" className="w-full rounded-xl" onClick={finishRide}>
              Volver al panel
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
        <div className="gradient-primary px-4 pt-10 pb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{currentStatus.emoji}</span>
            <h1 className="text-lg font-extrabold text-accent">{currentStatus.label}</h1>
          </div>
          <p className="text-xs text-primary-foreground/70">{currentStatus.desc}</p>
        </div>

        {/* Progress */}
        <div className="px-4 py-3 flex items-center gap-2">
          {(["en_camino", "en_viaje", "completado"] as RideStatus[]).map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-2 rounded-full ${
                ["en_camino", "en_viaje", "completado"].indexOf(rideStatus) >= i ? "bg-accent" : "bg-muted"
              }`} />
            </div>
          ))}
        </div>
        <div className="px-4 flex justify-between text-[10px] text-muted-foreground -mt-1 mb-3">
          <span>En camino</span><span>En viaje</span><span>Completado</span>
        </div>

        {/* Passenger info */}
        <div className="px-4">
          <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4">
            <img src={activeRide.passengerPhoto} alt={activeRide.passengerName} className="w-14 h-14 rounded-full object-cover border-2 border-accent" />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground truncate">{activeRide.passengerName}</h3>
              <p className="text-xs text-muted-foreground">📍 Destino: {activeRide.destination}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                💰 {activeRide.costType === "city" ? "$1.00" : "Consultar con pasajero"}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 mt-4 grid grid-cols-3 gap-3">
          <Button variant="outline" className="rounded-xl flex-col h-auto py-3 gap-1" onClick={() => setChatOpen(!chatOpen)}>
            <MessageCircle className="h-5 w-5" />
            <span className="text-[10px]">Chat</span>
          </Button>
          <Button variant="outline" className="rounded-xl flex-col h-auto py-3 gap-1" onClick={() => openInMaps(activeRide.destination)}>
            <MapPin className="h-5 w-5" />
            <span className="text-[10px]">Ver mapa</span>
          </Button>
          <Button variant="outline" className="rounded-xl flex-col h-auto py-3 gap-1" onClick={handleShareWhatsApp}>
            <Share2 className="h-5 w-5" />
            <span className="text-[10px]">Compartir</span>
          </Button>
        </div>

        {/* Chat */}
        {chatOpen && (
          <div className="px-4 mt-4 flex-1 flex flex-col min-h-0">
            <div className="bg-card rounded-2xl border border-border flex-1 flex flex-col p-3 max-h-48 overflow-y-auto">
              {messages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Envía un mensaje al pasajero</p>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`mb-2 text-xs px-3 py-2 rounded-xl max-w-[80%] ${m.from === "yo" ? "bg-accent text-accent-foreground self-end" : "bg-muted text-foreground self-start"}`}>
                  <span className="font-bold">{m.from === "yo" ? "Tú" : m.from}:</span> {m.text}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input placeholder="Escribe un mensaje..." value={msgText} onChange={(e) => setMsgText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} className="rounded-xl" />
              <Button size="icon" variant="hero" className="rounded-xl" onClick={sendMessage}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Demo advance */}
        <div className="mt-auto px-4 pb-6 pt-4">
          <Button variant="hero" size="lg" className="w-full rounded-xl" onClick={advanceStatus}>
            {rideStatus === "en_camino" ? "Simular: Llegué al pasajero" : "Simular: Llegamos al destino"}
          </Button>
        </div>
      </div>
    );
  }

  // ── INCOMING REQUEST OVERLAY ──
  if (incomingRequest) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6 animate-fade-in">
        <div className="text-center space-y-5 max-w-sm w-full">
          <span className="text-4xl">🔔</span>
          <h2 className="text-lg font-extrabold text-foreground">¡Nueva solicitud de viaje!</h2>

          {/* Passenger info */}
          <div className="flex items-center justify-center gap-3">
            <img src={incomingRequest.passengerPhoto} alt={incomingRequest.passengerName} className="w-16 h-16 rounded-full object-cover border-2 border-accent" />
            <div className="text-left">
              <p className="font-bold text-foreground">{incomingRequest.passengerName}</p>
              <p className="text-xs text-muted-foreground">Pasajero</p>
            </div>
          </div>

          {/* Trip details */}
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
                {incomingRequest.costType === "city" ? "💰 $1.00 (dentro de la ciudad)" : "💰 Consultar con pasajero"}
              </p>
            </div>
          </div>

          {/* Maps button */}
          <Button
            variant="outline"
            className="w-full rounded-xl"
            onClick={() => openInMaps(`${incomingRequest.origin} Pedernales Ecuador`)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver ubicación en Google Maps
          </Button>

          {/* Timer */}
          <div className="relative w-20 h-20 mx-auto">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="34" fill="none"
                stroke="hsl(var(--accent))" strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - requestTimer / 30)}`}
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-lg font-extrabold text-foreground">
              {requestTimer}s
            </span>
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="lg"
              className="rounded-xl border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={handleRejectRequest}
            >
              <XCircle className="h-5 w-5 mr-1" /> Rechazar
            </Button>
            <Button
              variant="hero"
              size="lg"
              className="rounded-xl"
              onClick={handleAcceptRequest}
            >
              <CheckCircle className="h-5 w-5 mr-1" /> Aceptar
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground">
            Tienes {requestTimer}s para responder esta solicitud
          </p>
        </div>
      </div>
    );
  }

  // ── MAIN PANEL ──
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="gradient-primary px-4 pt-10 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <img src={logoMotoya} alt="MotoYa" className="h-10 w-10" />
          <div>
            <h1 className="text-xl font-extrabold text-accent">MotoYa</h1>
            <p className="text-xs text-primary-foreground/70">Panel del conductor</p>
          </div>
        </div>
      </header>

      {/* Profile card */}
      <div className="px-4 -mt-5">
        <div className="bg-card rounded-2xl shadow-lg p-5 border border-border">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-2xl border-2 border-accent">
              🏍️
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-extrabold text-foreground">{userName}</h2>
              <div className="flex items-center gap-1 mt-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-3.5 w-3.5 ${i < Math.round(rating) ? "fill-accent text-accent" : "fill-muted text-muted"}`} />
                ))}
                <span className="text-xs font-medium text-muted-foreground ml-1">{rating.toFixed(1)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{totalTrips} viajes completados</p>
            </div>
          </div>

          {/* Application status */}
          {appStatus === "none" && (
            <Button variant="hero" size="lg" className="w-full rounded-xl" onClick={() => setAppStatus("pending")}>
              Postularme como conductor
            </Button>
          )}

          {appStatus === "pending" && (
            <div className="bg-accent/10 rounded-xl px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 text-accent animate-spin" />
                <span className="text-sm font-bold text-accent">En revisión ⏳</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Tu postulación está siendo revisada por el equipo MotoYa</p>
            </div>
          )}

          {appStatus === "rejected" && (
            <div className="space-y-2">
              <div className="bg-destructive/10 rounded-xl px-4 py-3 text-center">
                <span className="text-sm font-bold text-destructive">Postulación rechazada</span>
                <p className="text-xs text-muted-foreground mt-1">Puedes volver a intentarlo con documentos actualizados</p>
              </div>
              <Button variant="heroOutline" size="lg" className="w-full rounded-xl" onClick={() => setAppStatus("pending")}>
                Volver a postular
              </Button>
            </div>
          )}

          {appStatus === "approved" && (
            <div className="space-y-4">
              {/* Availability toggle */}
              <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {available ? "🟢 Disponible" : "⚫ No disponible"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {available ? "Recibirás solicitudes de viaje" : "No recibirás solicitudes"}
                  </p>
                </div>
                <Switch checked={available} onCheckedChange={setAvailable} />
              </div>

              {available && (
                <div className="bg-accent/10 rounded-xl px-4 py-3 text-center animate-fade-in">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 text-accent animate-spin" />
                    <span className="text-sm font-medium text-accent">Esperando solicitudes...</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Te notificaremos cuando un pasajero solicite un viaje</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {appStatus === "approved" && (
        <div className="px-4 mt-6">
          <h3 className="text-sm font-bold text-foreground mb-3">Tus estadísticas</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Viajes", value: totalTrips.toString(), emoji: "🏍️" },
              { label: "Calificación", value: rating.toFixed(1), emoji: "⭐" },
              { label: "Meses activo", value: "8", emoji: "📅" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card rounded-xl p-3 text-center border border-border">
                <span className="text-lg">{stat.emoji}</span>
                <p className="text-lg font-extrabold text-foreground mt-1">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="px-4 mt-6 mb-4">
        <h3 className="text-sm font-bold text-foreground mb-3">Consejos</h3>
        <div className="space-y-2">
          {[
            { emoji: "⚡", text: "Responde rápido para mantener buena calificación" },
            { emoji: "📍", text: "Mantén tu GPS activo para mejor ubicación" },
            { emoji: "😊", text: "Un buen trato = más viajes y mejores propinas" },
          ].map((tip) => (
            <div key={tip.text} className="flex items-start gap-2 bg-muted rounded-xl px-3 py-2.5">
              <span className="text-sm">{tip.emoji}</span>
              <p className="text-xs text-muted-foreground">{tip.text}</p>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ConductorHome;
