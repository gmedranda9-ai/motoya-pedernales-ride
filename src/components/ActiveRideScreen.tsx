import { useState } from "react";
import { Phone, Shield, MessageCircle, Share2, Send, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LiveMap from "@/components/LiveMap";
import type { Driver } from "@/components/DriverCard";

type RideStatus = "en_camino" | "en_viaje" | "completado";

interface ActiveRideScreenProps {
  driver: Driver;
  destination: string;
  onFinish: () => void;
  viajeId?: string;
}

const STATUS_LABELS: Record<RideStatus, { label: string; emoji: string; desc: string }> = {
  en_camino: { label: "Tu conductor está en camino 🏍️", emoji: "🏍️", desc: "Tu conductor se dirige a tu ubicación" },
  en_viaje: { label: "En viaje", emoji: "🛣️", desc: "Estás en camino a tu destino" },
  completado: { label: "Viaje completado", emoji: "✅", desc: "¡Has llegado a tu destino!" },
};

const ActiveRideScreen = ({ driver, destination, onFinish, viajeId }: ActiveRideScreenProps) => {
  const [status, setStatus] = useState<RideStatus>("en_camino");
  const [messages, setMessages] = useState<{ from: string; text: string }[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [showSOS, setShowSOS] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(true);

  const currentStatus = STATUS_LABELS[status];

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🏍️ Estoy en un viaje con MotoYa\n👤 Conductor: ${driver.name}\n🏍️ Placa: ${driver.plate}\n📍 Destino: ${destination}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const sendMessage = () => {
    if (!msgText.trim()) return;
    setMessages((prev) => [...prev, { from: "yo", text: msgText.trim() }]);
    setMsgText("");
    // Mock driver reply
    setTimeout(() => {
      setMessages((prev) => [...prev, { from: driver.name, text: "¡Ya casi llego! 👍" }]);
    }, 2000);
  };

  // Demo: simulate ride progression
  const advanceStatus = () => {
    if (status === "en_camino") setStatus("en_viaje");
    else if (status === "en_viaje") setStatus("completado");
  };

  if (status === "completado") {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6 animate-fade-in">
        <div className="text-center space-y-6 max-w-sm">
          <span className="text-6xl">✅</span>
          <h2 className="text-xl font-extrabold text-foreground">¡Viaje completado!</h2>
          <p className="text-sm text-muted-foreground">Has llegado a <span className="font-bold text-foreground">{destination}</span></p>
          <div className="flex items-center justify-center gap-3">
            <img src={driver.photo} alt={driver.name} className="w-12 h-12 rounded-full object-cover border-2 border-accent" />
            <div className="text-left">
              <p className="text-sm font-bold text-foreground">{driver.name}</p>
              <p className="text-xs text-muted-foreground">{driver.plate}</p>
            </div>
          </div>
          <Button variant="hero" size="lg" className="w-full rounded-xl" onClick={onFinish}>
            Calificar viaje ⭐
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
      {/* Header */}
      <div className="gradient-primary px-4 pt-10 pb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{currentStatus.emoji}</span>
          <h1 className="text-lg font-extrabold text-accent">{currentStatus.label}</h1>
        </div>
        <p className="text-xs text-primary-foreground/70">{currentStatus.desc}</p>
      </div>

      {/* Status progress */}
      <div className="px-4 py-3 flex items-center gap-2">
        {(["en_camino", "en_viaje", "completado"] as RideStatus[]).map((s, i) => (
          <div key={s} className="flex-1 flex items-center gap-1">
            <div className={`h-2 flex-1 rounded-full ${
              (["en_camino", "en_viaje", "completado"].indexOf(status) >= i) ? "bg-accent" : "bg-muted"
            }`} />
          </div>
        ))}
      </div>
      <div className="px-4 flex justify-between text-[10px] text-muted-foreground -mt-1 mb-3">
        <span>En camino</span><span>En viaje</span><span>Completado</span>
      </div>

      {/* Driver info */}
      <div className="px-4">
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4">
          <img src={driver.photo} alt={driver.name} className="w-16 h-16 rounded-full object-cover border-2 border-accent" />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground truncate">{driver.name}</h3>
            <p className="text-xs text-muted-foreground">🏍️ {driver.model} · <span className="font-semibold">{driver.plate}</span></p>
            <p className="text-xs text-muted-foreground">📍 Destino: {destination}</p>
          </div>
          <a href={`tel:${driver.phone}`} className="p-2 rounded-full bg-accent/10">
            <Phone className="h-5 w-5 text-accent" />
          </a>
        </div>
      </div>

      {/* Live Map */}
      {viajeId && mapExpanded && (
        <div className="px-4 mt-4">
          <div className="rounded-2xl overflow-hidden border border-border bg-muted h-56">
            <LiveMap viajeId={viajeId} className="w-full h-full" />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 mt-4 grid grid-cols-4 gap-2">
        <Button variant="outline" className="rounded-xl flex-col h-auto py-3 gap-1" onClick={() => setChatOpen(!chatOpen)}>
          <MessageCircle className="h-5 w-5" />
          <span className="text-[10px]">Chat</span>
        </Button>
        <Button variant="outline" className="rounded-xl flex-col h-auto py-3 gap-1" onClick={() => setMapExpanded((v) => !v)}>
          <MapIcon className="h-5 w-5" />
          <span className="text-[10px]">{mapExpanded ? "Ocultar mapa" : "Ver mapa"}</span>
        </Button>
        <Button variant="outline" className="rounded-xl flex-col h-auto py-3 gap-1" onClick={handleShareWhatsApp}>
          <Share2 className="h-5 w-5" />
          <span className="text-[10px]">Compartir</span>
        </Button>
        <Button variant="outline" className="rounded-xl flex-col h-auto py-3 gap-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => setShowSOS(true)}>
          <Shield className="h-5 w-5" />
          <span className="text-[10px]">SOS</span>
        </Button>
      </div>

      {/* Chat panel */}
      {chatOpen && (
        <div className="px-4 mt-4 flex-1 flex flex-col min-h-0">
          <div className="bg-card rounded-2xl border border-border flex-1 flex flex-col p-3 max-h-48 overflow-y-auto">
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Envía un mensaje para coordinar tu recogida</p>
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

      {/* Demo advance button */}
      <div className="mt-auto px-4 pb-6 pt-4">
        <Button variant="hero" size="lg" className="w-full rounded-xl" onClick={advanceStatus}>
          {status === "en_camino" ? "El conductor llegó ✅" : "Llegué al destino 🏁"}
        </Button>
      </div>

      {/* SOS Modal */}
      {showSOS && (
        <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-card rounded-2xl border border-destructive p-6 max-w-sm w-full space-y-4 text-center">
            <Shield className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-lg font-extrabold text-foreground">Emergencia</h2>
            <p className="text-sm text-muted-foreground">¿Estás en una situación de emergencia? Contacta al 911 o comparte tu ubicación con alguien de confianza.</p>
            <div className="space-y-2">
              <Button variant="destructive" className="w-full rounded-xl" onClick={() => window.open("tel:911")}>
                Llamar al 911
              </Button>
              <Button variant="outline" className="w-full rounded-xl" onClick={handleShareWhatsApp}>
                Compartir ubicación por WhatsApp
              </Button>
              <Button variant="ghost" className="w-full rounded-xl" onClick={() => setShowSOS(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveRideScreen;
