import { useState, useEffect, useRef } from "react";
import { Phone, Shield, MessageCircle, Share2, Send, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LiveMap from "@/components/LiveMap";
import type { Driver } from "@/components/DriverCard";
import { useAuth } from "@/contexts/AuthContext";
import { useRideChat } from "@/hooks/useRideChat";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type RideStatus = "en_camino" | "llegado" | "en_viaje" | "completado";

interface ActiveRideScreenProps {
  driver: Driver;
  destination: string;
  onFinish: () => void;
  viajeId?: string;
  originCoords?: { lat: number; lng: number };
}

const STATUS_LABELS: Record<RideStatus, { label: string; emoji: string; desc: string }> = {
  en_camino: { label: "Tu conductor está en camino", emoji: "🚦", desc: "Tu conductor se dirige a tu ubicación" },
  llegado: { label: "¡Tu conductor está aquí!", emoji: "🛺", desc: "Prepárate para abordar" },
  en_viaje: { label: "En viaje 🚀", emoji: "🛣️", desc: "Estás en camino a tu destino" },
  completado: { label: "Viaje completado", emoji: "✅", desc: "¡Has llegado a tu destino!" },
};

const ActiveRideScreen = ({ driver, destination, onFinish, viajeId, originCoords }: ActiveRideScreenProps) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<RideStatus>("en_camino");
  const [chatOpen, setChatOpen] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [showSOS, setShowSOS] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(true);
  const { messages, sendMessage } = useRideChat(viajeId, user?.id);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const readKey = viajeId && user?.id ? `chat:lastRead:${user.id}:${viajeId}` : null;
  const [lastReadAt, setLastReadAt] = useState<number>(() => {
    if (!readKey) return 0;
    try {
      const v = localStorage.getItem(readKey);
      return v ? new Date(v).getTime() : 0;
    } catch {
      return 0;
    }
  });

  const unreadCount = messages.filter(
    (m) => m.remitente_id !== user?.id && new Date(m.hora).getTime() > lastReadAt
  ).length;

  const markAsRead = () => {
    const now = new Date();
    setLastReadAt(now.getTime());
    if (readKey) {
      try {
        localStorage.setItem(readKey, now.toISOString());
      } catch {}
    }
  };

  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight });
    if (chatOpen) markAsRead();
  }, [messages.length, chatOpen]);

  // Toast cuando el conductor marca "Llegué"
  const prevStatusRef = useRef<RideStatus>(status);
  useEffect(() => {
    if (prevStatusRef.current !== "llegado" && status === "llegado") {
      toast({
        title: "🛺 ¡Tu conductor está aquí!",
        description: "Prepárate para abordar",
      });
    }
    prevStatusRef.current = status;
  }, [status]);

  // Sync status from DB + realtime (so pasajero auto-updates when conductor presses "Iniciar viaje")
  useEffect(() => {
    if (!viajeId) return;
    let cancelled = false;

    const apply = (estado: string | null | undefined) => {
      if (!estado) return;
      const valid: RideStatus[] = ["en_camino", "llegado", "en_viaje", "completado"];
      // Map DB "aceptado" to "en_camino" for backward compat
      const mapped = (estado === "aceptado" ? "en_camino" : estado) as RideStatus;
      if (valid.includes(mapped) && !cancelled) setStatus(mapped);
    };

    supabase
      .from("viajes")
      .select("estado")
      .eq("id", viajeId)
      .maybeSingle()
      .then(({ data }) => apply((data as any)?.estado));

    const channel = supabase
      .channel(`viaje_estado_${viajeId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "viajes", filter: `id=eq.${viajeId}` },
        (payload) => apply((payload.new as any)?.estado)
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [viajeId]);

  const handleToggleChat = () => {
    const next = !chatOpen;
    setChatOpen(next);
    if (next) markAsRead();
  };

  const currentStatus = STATUS_LABELS[status];

  const firstName =
    (driver.name || "")
      .trim()
      .split(/\s+/)[0]
      ?.toLowerCase()
      .replace(/^./, (c) => c.toUpperCase()) || "Conductor";
  const initial = firstName.charAt(0).toUpperCase();
  const hasPhoto = !!driver.photo && !driver.photo.includes("placeholder");

  const handleShareWhatsApp = () => {
    const lines = [
      "Estoy viajando en MotoYa",
      `👤 Conductor: ${driver.name}`,
      `🛺 Moto: ${driver.model || "—"} - Placa: ${driver.plate || "—"}`,
    ];
    if (originCoords) {
      lines.push(`📍 Mi ubicación: https://maps.google.com/?q=${originCoords.lat},${originCoords.lng}`);
    } else {
      lines.push(`📍 Mi ubicación: ${destination}`);
    }
    if (viajeId) {
      lines.push(`🔗 Seguir viaje: ${window.location.origin}/?viaje=${viajeId}`);
    }
    const text = encodeURIComponent(lines.join("\n"));
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleSend = async () => {
    const text = msgText.trim();
    if (!text) return;
    setMsgText("");
    await sendMessage(text);
  };

  // El pasajero ya NO controla el estado del viaje. El conductor avanza
  // en_camino → llegado → en_viaje → completado vía Realtime.
  // Cuando llega a "completado", saltamos automáticamente a la pantalla de calificación.
  useEffect(() => {
    if (status === "completado") {
      onFinish();
    }
  }, [status, onFinish]);

  // ─── Pantalla normal: en_camino, llegado o en_viaje ───
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
        {(["en_camino", "llegado", "en_viaje", "completado"] as RideStatus[]).map((s, i) => (
          <div key={s} className="flex-1 flex items-center gap-1">
            <div className={`h-2 flex-1 rounded-full ${
              (["en_camino", "llegado", "en_viaje", "completado"].indexOf(status) >= i) ? "bg-accent" : "bg-muted"
            }`} />
          </div>
        ))}
      </div>
      <div className="px-4 flex justify-between text-[10px] text-muted-foreground -mt-1 mb-3">
        <span>En camino</span><span>Llegó</span><span>En viaje</span><span>Final</span>
      </div>

      {/* Banner: conductor llegó */}
      {status === "llegado" && (
        <div className="px-4 mb-3 animate-slide-up">
          <div className="rounded-2xl border-2 border-accent bg-accent/15 px-4 py-3 flex items-center gap-3 shadow-md">
            <span className="text-2xl animate-bounce">🛺</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-extrabold text-foreground leading-tight">
                ¡Tu conductor está aquí!
              </p>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Prepárate para abordar
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Driver info */}
      <div className="px-4">
        <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4">
          {hasPhoto ? (
            <img src={driver.photo} alt={firstName} className="w-16 h-16 rounded-full object-cover border-2 border-accent flex-shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary border-2 border-accent flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-extrabold text-primary-foreground">{initial}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground truncate">{firstName}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="text-xs">🛺</span>
              {driver.model} · <span className="font-semibold">{driver.plate}</span>
            </p>
            {driver.phone ? (
              <p className="text-xs text-muted-foreground">📞 <span className="font-semibold text-foreground">{driver.phone}</span></p>
            ) : (
              <p className="text-xs text-muted-foreground italic">📞 Teléfono no disponible</p>
            )}
            <p className="text-xs text-muted-foreground truncate">📍 {destination}</p>
          </div>
          {driver.phone ? (
            <a
              href={`tel:${driver.phone}`}
              className="p-2 rounded-full bg-accent/10 hover:bg-accent/20 transition-colors flex-shrink-0"
              aria-label={`Llamar a ${firstName} al ${driver.phone}`}
            >
              <Phone className="h-5 w-5 text-accent" />
            </a>
          ) : (
            <span className="p-2 rounded-full bg-muted opacity-50 flex-shrink-0" aria-label="Teléfono no disponible">
              <Phone className="h-5 w-5 text-muted-foreground" />
            </span>
          )}
        </div>
      </div>

      {/* Live Map */}
      {mapExpanded && (
        <div className="px-4 mt-4">
          <div className="rounded-2xl overflow-hidden border border-border bg-muted h-56">
            {viajeId ? (
              <LiveMap viajeId={viajeId} className="w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                Mapa no disponible (sin ID de viaje)
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 mt-4 grid grid-cols-4 gap-2">
        <Button variant="outline" className="relative rounded-xl flex-col h-auto py-3 gap-1" onClick={handleToggleChat}>
          <MessageCircle className="h-5 w-5" />
          <span className="text-[10px]">Chat</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center shadow">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
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
          <div ref={chatScrollRef} className="bg-card rounded-2xl border border-border flex-1 flex flex-col p-3 max-h-48 overflow-y-auto">
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Envía un mensaje para coordinar tu recogida</p>
            )}
            {messages.map((m) => {
              const mine = m.remitente_id === user?.id;
              return (
                <div
                  key={m.id}
                  className={`mb-2 text-xs px-3 py-2 rounded-xl max-w-[80%] ${
                    mine ? "bg-accent text-accent-foreground self-end" : "bg-muted text-foreground self-start"
                  }`}
                >
                  {m.texto}
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Escribe un mensaje..."
              value={msgText}
              onChange={(e) => setMsgText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="rounded-xl"
            />
            <Button size="icon" variant="hero" className="rounded-xl" onClick={handleSend}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* El pasajero NO controla el estado del viaje — todo lo maneja el conductor */}
      <div className="pb-6" />

      {showSOS && <SOSModal onClose={() => setShowSOS(false)} onShare={handleShareWhatsApp} />}
    </div>
  );
};

const SOSModal = ({ onClose, onShare }: { onClose: () => void; onShare: () => void }) => (
  <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
    <div className="bg-card rounded-2xl border border-destructive p-6 max-w-sm w-full space-y-4 text-center">
      <Shield className="h-12 w-12 text-destructive mx-auto" />
      <h2 className="text-lg font-extrabold text-foreground">Emergencia</h2>
      <p className="text-sm text-muted-foreground">¿Estás en una situación de emergencia? Contacta al 911 o comparte tu ubicación con alguien de confianza.</p>
      <div className="space-y-2">
        <Button variant="destructive" className="w-full rounded-xl" onClick={() => window.open("tel:911")}>
          Llamar al 911
        </Button>
        <Button variant="outline" className="w-full rounded-xl" onClick={onShare}>
          Compartir ubicación por WhatsApp
        </Button>
        <Button variant="ghost" className="w-full rounded-xl" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </div>
  </div>
);

export default ActiveRideScreen;
