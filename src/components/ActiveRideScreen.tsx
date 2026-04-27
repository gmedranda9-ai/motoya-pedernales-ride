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
  llegado: { label: "¡Tu conductor está aquí!", emoji: "🏍️", desc: "Prepárate para abordar" },
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

  // Pasajero solo puede avanzar de "en_camino" -> "llegado" (confirma que llegó el conductor)
  // y de "en_viaje" -> "completado" (llegué al destino). El paso "llegado" -> "en_viaje" lo hace el conductor.
  const advanceStatus = async () => {
    let next: RideStatus | null = null;
    if (status === "en_camino") next = "llegado";
    else if (status === "en_viaje") next = "completado";
    if (!next) return;

    setStatus(next);

    if (!viajeId) return;
    const { error } = await supabase.from("viajes").update({ estado: next }).eq("id", viajeId);
    if (error) {
      console.error("❌ Error actualizando estado del viaje:", error);
      toast({ title: "Error", description: "No se pudo actualizar el estado del viaje", variant: "destructive" });
    }
  };

  // ─── Pantalla: viaje completado ───
  if (status === "completado") {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6 animate-fade-in">
        <div className="text-center space-y-6 max-w-sm">
          <span className="text-6xl">✅</span>
          <h2 className="text-xl font-extrabold text-foreground">¡Viaje completado!</h2>
          <p className="text-sm text-muted-foreground">Has llegado a <span className="font-bold text-foreground">{destination}</span></p>
          <div className="flex items-center justify-center gap-3">
            {hasPhoto ? (
              <img src={driver.photo} alt={firstName} className="w-12 h-12 rounded-full object-cover border-2 border-accent" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary border-2 border-accent flex items-center justify-center">
                <span className="text-base font-extrabold text-primary-foreground">{initial}</span>
              </div>
            )}
            <div className="text-left">
              <p className="text-sm font-bold text-foreground">{firstName}</p>
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

  // ─── Pantalla: ¡Tu conductor está aquí! (esperando que conductor inicie viaje) ───
  if (status === "llegado") {
    return (
      <div className="fixed inset-0 z-50 bg-primary text-primary-foreground flex flex-col animate-fade-in">
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="relative mb-8">
            <span className="absolute inset-0 rounded-full bg-accent/20 animate-ping" />
            <span className="absolute inset-0 rounded-full bg-accent/10 animate-pulse" />
            <div className="relative w-32 h-32 rounded-full bg-accent/15 border-4 border-accent flex items-center justify-center">
              <span className="text-7xl animate-bounce">🏍️</span>
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-accent mb-2">¡Tu conductor está aquí!</h1>
          <p className="text-base text-primary-foreground/80 mb-8">Prepárate para abordar</p>

          <div className="w-full max-w-sm bg-primary-foreground/10 backdrop-blur rounded-2xl border border-primary-foreground/20 p-4 flex items-center gap-3">
            {hasPhoto ? (
              <img src={driver.photo} alt={firstName} className="w-14 h-14 rounded-full object-cover border-2 border-accent flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-accent border-2 border-accent flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-extrabold text-primary">{initial}</span>
              </div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <p className="font-bold truncate">{firstName}</p>
              <p className="text-xs text-primary-foreground/70 truncate">
                <span className="mr-1">🏍️</span>{driver.model} · <span className="font-semibold">{driver.plate}</span>
              </p>
            </div>
            {driver.phone && (
              <a
                href={`tel:${driver.phone}`}
                className="p-2 rounded-full bg-accent/20 hover:bg-accent/30 transition-colors flex-shrink-0"
                aria-label={`Llamar a ${firstName}`}
              >
                <Phone className="h-5 w-5 text-accent" />
              </a>
            )}
          </div>

          <p className="text-xs text-primary-foreground/60 mt-6 italic">Esperando que el conductor inicie el viaje…</p>
        </div>

        {/* Acciones: solo Chat y SOS */}
        <div className="px-4 pb-8 grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="relative rounded-xl h-14 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
            onClick={handleToggleChat}
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Chat
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center shadow">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            className="rounded-xl h-14 border-destructive bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => setShowSOS(true)}
          >
            <Shield className="h-5 w-5 mr-2" />
            SOS
          </Button>
        </div>

        {/* Chat overlay */}
        {chatOpen && (
          <div className="fixed inset-x-0 bottom-0 bg-card text-foreground rounded-t-3xl border-t border-border p-4 max-h-[60vh] flex flex-col animate-slide-in-up shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold">Chat con {firstName}</h3>
              <button onClick={handleToggleChat} className="text-xs text-muted-foreground">Cerrar</button>
            </div>
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto flex flex-col">
              {messages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Envía un mensaje para coordinar tu recogida</p>
              )}
              {messages.map((m) => {
                const mine = m.remitente_id === user?.id;
                return (
                  <div key={m.id} className={`mb-2 text-xs px-3 py-2 rounded-xl max-w-[80%] ${mine ? "bg-accent text-accent-foreground self-end" : "bg-muted text-foreground self-start"}`}>
                    {m.texto}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 mt-2">
              <Input placeholder="Escribe un mensaje..." value={msgText} onChange={(e) => setMsgText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} className="rounded-xl" />
              <Button size="icon" variant="hero" className="rounded-xl" onClick={handleSend}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {showSOS && <SOSModal onClose={() => setShowSOS(false)} onShare={handleShareWhatsApp} />}
      </div>
    );
  }

  // ─── Pantalla normal: en_camino o en_viaje ───
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
              <span className="text-xs">🏍️</span>
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

      {/* Bottom action — solo cuando el pasajero puede avanzar */}
      <div className="sticky bottom-0 mt-auto px-4 pb-6 pt-4 bg-background border-t border-border">
        {status === "en_camino" && (
          <Button variant="hero" size="lg" className="w-full rounded-xl" onClick={advanceStatus}>
            El conductor llegó ✅
          </Button>
        )}
        {status === "en_viaje" && (
          <Button variant="hero" size="lg" className="w-full rounded-xl" onClick={advanceStatus}>
            Llegué al destino 🏁
          </Button>
        )}
      </div>

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
