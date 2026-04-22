import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRide } from "@/contexts/RideContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import NotificationsBanner from "@/components/NotificationsBanner";
import logoMotoya from "@/assets/logo-motoya.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Star,
  MapPin,
  MessageCircle,
  Send,
  Share2,
  Loader2,
  ArrowLeft,
  Camera,
  Upload,
  Map as MapIcon,
} from "lucide-react";
import { subscribeToPush, unsubscribeFromPush } from "@/lib/onesignal";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";
import { useShareDriverLocation } from "@/hooks/useShareDriverLocation";
import { useRideChat } from "@/hooks/useRideChat";
import LiveMap from "@/components/LiveMap";

type ApplicationStatus = "none" | "pending" | "approved" | "rejected";
type RideStatus = "en_camino" | "en_viaje" | "completado";
type Step = "panel" | "apply";

interface RideRequest {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerRating: number;
  passengerTrips: number;
  origin: string;
  originCoords?: { lat: number; lng: number };
  destination: string;
  costType: "city" | "outside";
}

interface ApplicationForm {
  photoUrl: string;
  cedula: string;
  cedulaPhotoUrl: string;
  phone: string;
  plate: string;
  motoModel: string;
  motoColor: string;
  motoPhotoUrl: string;
}


const STATUS_LABELS: Record<RideStatus, { label: string; emoji: string; desc: string }> = {
  en_camino: { label: "En camino al pasajero", emoji: "🏍️", desc: "Dirígete a la ubicación del pasajero" },
  en_viaje: { label: "En viaje", emoji: "🛣️", desc: "Llevando al pasajero a su destino" },
  completado: { label: "Viaje completado", emoji: "✅", desc: "¡Has completado el viaje!" },
};

const ConductorHome = () => {
  const { user } = useAuth();
  const { acceptedRide, consumeAcceptedRide } = useRide();
  const { toast } = useToast();
  const { isGranted: notifGranted, isBlocked: notifBlocked, request: requestNotif, refresh: refreshNotif } = useNotificationPermission();
  const userName = user?.user_metadata?.nombre || user?.email?.split("@")[0] || "Conductor";

  const [step, setStep] = useState<Step>("panel");
  const [appStatus, setAppStatus] = useState<ApplicationStatus>("none");
  const [available, setAvailable] = useState(false);
  const [conductorId, setConductorId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [totalTrips, setTotalTrips] = useState(0);
  const [monthsActive, setMonthsActive] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Load existing application status from Supabase
  useEffect(() => {
    if (!user) return;
    const loadStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("conductores")
          .select("estado, id, disponible, calificacion_promedio, created_at")
          .eq("usuario_id", user.id)
          .maybeSingle();
        
        if (error) {
          console.error("Error loading conductor status:", error.message, error.details);
          return;
        }
        if (data) {
          setConductorId(data.id);
          setAvailable(data.disponible ?? false);
          setRating(Number(data.calificacion_promedio) || 0);
          if (data.created_at) {
            const created = new Date(data.created_at);
            const now = new Date();
            const months =
              (now.getFullYear() - created.getFullYear()) * 12 +
              (now.getMonth() - created.getMonth());
            setMonthsActive(Math.max(0, months));
          }
          // Count completed trips
          const { count } = await supabase
            .from("viajes")
            .select("id", { count: "exact", head: true })
            .eq("conductor_id", data.id)
            .eq("estado", "completado");
          setTotalTrips(count ?? 0);

          const statusMap: Record<string, ApplicationStatus> = {
            pendiente: "pending",
            aprobado: "approved",
            rechazado: "rejected",
          };
          setAppStatus(statusMap[data.estado] || "pending");
        }
      } catch (err) {
        console.error("Unexpected error loading conductor:", err);
      }
    };
    loadStatus();
  }, [user]);

  const persistAvailability = async (value: boolean, playerId?: string | null) => {
    if (!user) return false;
    const updatePayload: Record<string, any> = { disponible: value };
    if (value && playerId) updatePayload.onesignal_player_id = playerId;
    const { error } = await supabase
      .from("conductores")
      .update(updatePayload)
      .eq("usuario_id", user.id);
    if (error) {
      console.error("Error updating disponible:", error);
      return false;
    }
    return true;
  };

  const handleToggleAvailable = async (value: boolean) => {
    if (!user) return;

    if (value) {
      // Require notification permission BEFORE flipping the toggle on.
      refreshNotif();
      if (notifBlocked) {
        toast({
          title: "Notificaciones bloqueadas",
          description: "Actívalas en la configuración del navegador y recarga la página.",
          variant: "destructive",
        });
        return;
      }
      if (!notifGranted) {
        const next = await requestNotif();
        if (next !== "granted") {
          toast({
            title: "Permiso necesario",
            description: "Debes permitir notificaciones para recibir solicitudes.",
            variant: "destructive",
          });
          return;
        }
      }

      const playerId = await subscribeToPush();
      if (!playerId) {
        toast({
          title: "No se pudo suscribir",
          description: "Intenta nuevamente en unos segundos.",
          variant: "destructive",
        });
        return;
      }

      const ok = await persistAvailability(true, playerId);
      if (!ok) {
        toast({ title: "Error", description: "No se pudo actualizar tu disponibilidad.", variant: "destructive" });
        return;
      }
      setAvailable(true);
      toast({ title: "🟢 Ahora estás disponible" });
    } else {
      await unsubscribeFromPush();
      const ok = await persistAvailability(false);
      if (!ok) {
        toast({ title: "Error", description: "No se pudo actualizar tu disponibilidad.", variant: "destructive" });
        return;
      }
      setAvailable(false);
      toast({ title: "⚫ No estás disponible" });
    }
  };

  // Auto-disable when notifications are missing while marked as "disponible".
  // Also resubscribe on app reopen to refresh player_id in case it changed.
  useEffect(() => {
    if (!user || !conductorId) return;
    if (available && !notifGranted) {
      console.warn("⚠️ Conductor disponible sin notificaciones — desactivando automáticamente.");
      persistAvailability(false).then(() => setAvailable(false));
      toast({
        title: "⚠️ Notificaciones desactivadas",
        description: "No recibirás solicitudes. Actívalas para continuar recibiendo viajes.",
        variant: "destructive",
      });
      return;
    }
    if (available && notifGranted) {
      // Resubscribe silently to refresh player_id (may change between sessions/devices).
      (async () => {
        try {
          const playerId = await subscribeToPush();
          if (playerId) {
            await supabase
              .from("conductores")
              .update({ onesignal_player_id: playerId })
              .eq("usuario_id", user.id);
            console.log("🔄 player_id refrescado:", playerId);
          }
        } catch (e) {
          console.warn("Resubscribe failed:", e);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conductorId, notifGranted]);

  // Application form
  const [form, setForm] = useState<ApplicationForm>({
    photoUrl: "",
    cedula: "",
    cedulaPhotoUrl: "",
    phone: "",
    plate: "",
    motoModel: "",
    motoColor: "",
    motoPhotoUrl: "",
  });

  // Active ride
  const [activeRide, setActiveRide] = useState<RideRequest | null>(null);
  const [rideStatus, setRideStatus] = useState<RideStatus>("en_camino");
  const [chatOpen, setChatOpen] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(true);
  const [msgText, setMsgText] = useState("");
  const { messages, sendMessage } = useRideChat(activeRide?.id ?? null, user?.id ?? null);

  // Pick up rides accepted from the global modal (works across all screens)
  useEffect(() => {
    if (acceptedRide && !activeRide) {
      const ride = consumeAcceptedRide();
      if (ride) {
        setActiveRide(ride);
        setRideStatus("en_camino");
      }
    }
  }, [acceptedRide, activeRide, consumeAcceptedRide]);

  const openInMaps = (address: string, coords?: { lat: number; lng: number }) => {
    const query = coords ? `${coords.lat},${coords.lng}` : encodeURIComponent(address + " Pedernales Ecuador");
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
  };

  const handleShareWhatsApp = () => {
    if (!activeRide) return;
    const text = encodeURIComponent(
      `🏍️ Viaje MotoYa\n👤 Pasajero: ${activeRide.passengerName}\n📍 Destino: ${activeRide.destination}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleSend = async () => {
    const text = msgText.trim();
    if (!text) return;
    setMsgText("");
    await sendMessage(text);
  };

  const advanceStatus = () => {
    if (rideStatus === "en_camino") setRideStatus("en_viaje");
    else if (rideStatus === "en_viaje") setRideStatus("completado");
  };

  // Share driver GPS every 5s while ride is active (en_camino or en_viaje)
  useShareDriverLocation(
    activeRide?.id ?? null,
    !!activeRide && rideStatus !== "completado",
    5000,
  );

  const finishRide = () => {
    setActiveRide(null);
    setChatOpen(false);
    setRideStatus("en_camino");
  };

  const handleFileSelect = (field: keyof ApplicationForm) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const url = URL.createObjectURL(file);
        setForm((prev) => ({ ...prev, [field]: url }));
      }
    };
    input.click();
  };

  const handleSubmitApplication = async () => {
    const phoneClean = (form.phone || "").trim();
    if (!form.cedula || !phoneClean || !form.plate || !form.motoModel || !form.motoColor) {
      toast({ title: "Campos incompletos", description: "Llena todos los campos obligatorios, incluido el teléfono.", variant: "destructive" });
      return;
    }
    if (!/^\d{7,15}$/.test(phoneClean.replace(/[\s+-]/g, ""))) {
      toast({ title: "Teléfono inválido", description: "Ingresa un número de teléfono válido (solo dígitos).", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Error", description: "Debes iniciar sesión.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const insertData = {
        usuario_id: user.id,
        nombre: user.user_metadata?.nombre || user.email?.split("@")[0] || "Sin nombre",
        foto: form.photoUrl || null,
        cedula: form.cedula,
        telefono: phoneClean,
        placa: form.plate,
        modelo_moto: form.motoModel,
        color: form.motoColor,
        foto_cedula: form.cedulaPhotoUrl || null,
        foto_moto: form.motoPhotoUrl || null,
        estado: "pendiente",
      };

      console.log("📤 Datos enviados a Supabase (conductores):", JSON.stringify(insertData, null, 2));

      const { data, error } = await supabase.from("conductores").insert(insertData).select();

      if (error) {
        console.error("❌ Error al guardar postulación:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        toast({ title: "Error al enviar", description: error.message, variant: "destructive" });
        return;
      }

      console.log("✅ Postulación guardada exitosamente:", data);
      setAppStatus("pending");
      setStep("panel");
      toast({ title: "📋 Postulación enviada", description: "Te notificaremos cuando sea revisada." });
    } catch (err) {
      console.error("Error inesperado al enviar postulación:", err);
      toast({ title: "Error inesperado", description: "Intenta de nuevo.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
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
            <p className="text-sm text-muted-foreground">📍 {activeRide.destination}</p>
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

        {/* Progress bar */}
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
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center border-2 border-accent flex-shrink-0">
              <span className="text-xl font-extrabold text-primary-foreground">
                {activeRide.passengerName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground truncate">{activeRide.passengerName}</h3>
              <p className="text-xs text-muted-foreground">📍 Destino: {activeRide.destination}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                💰 {activeRide.costType === "city" ? "$1.00" : "Consultar con pasajero"}
              </p>
            </div>
          </div>
        </div>

        {/* Live map */}
        {mapExpanded && (
          <div className="px-4 mt-4">
            <div className="h-48 rounded-2xl overflow-hidden border border-border">
              <LiveMap viajeId={activeRide.id} className="w-full h-full" />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-4 mt-4 grid grid-cols-3 gap-3">
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
        </div>

        {/* Chat */}
        {chatOpen && (
          <div className="px-4 mt-4 flex-1 flex flex-col min-h-0">
            <div className="bg-card rounded-2xl border border-border flex-1 flex flex-col p-3 max-h-48 overflow-y-auto">
              {messages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Envía un mensaje al pasajero</p>
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

        {/* Demo advance */}
        <div className="mt-auto px-4 pb-6 pt-4">
          <Button variant="hero" size="lg" className="w-full rounded-xl" onClick={advanceStatus}>
            {rideStatus === "en_camino" ? "📍 Llegué al pasajero — Iniciar viaje" : "🏁 Completar viaje"}
          </Button>
        </div>
      </div>
    );
  }

  // Incoming requests are handled globally by RideContext modal


  // ── APPLICATION FORM ──
  if (step === "apply") {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="gradient-primary px-4 pt-10 pb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep("panel")} className="p-1.5 rounded-full bg-primary-foreground/10 text-primary-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-extrabold text-accent">Postulación</h1>
              <p className="text-xs text-primary-foreground/70">Completa tu información</p>
            </div>
          </div>
        </header>

        <div className="px-4 -mt-4 space-y-4">
          {/* Personal Photo */}
          <div className="bg-card rounded-2xl border border-border p-4">
            <Label className="text-sm font-bold text-foreground mb-2 block">Foto personal *</Label>
            <button
              onClick={() => handleFileSelect("photoUrl")}
              className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-6 hover:border-accent transition-colors"
            >
              {form.photoUrl ? (
                <img src={form.photoUrl} alt="Foto personal" className="w-20 h-20 rounded-full object-cover border-2 border-accent" />
              ) : (
                <>
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Tomar o subir foto</span>
                </>
              )}
            </button>
          </div>

          {/* Cédula */}
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <div>
              <Label className="text-sm font-bold text-foreground mb-1.5 block">Número de cédula *</Label>
              <Input
                placeholder="Ej: 0801234567"
                value={form.cedula}
                onChange={(e) => setForm((p) => ({ ...p, cedula: e.target.value }))}
                className="rounded-xl"
                maxLength={10}
              />
            </div>
            <div>
              <Label className="text-sm font-bold text-foreground mb-1.5 block">Foto de la cédula *</Label>
              <button
                onClick={() => handleFileSelect("cedulaPhotoUrl")}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-4 hover:border-accent transition-colors"
              >
                {form.cedulaPhotoUrl ? (
                  <img src={form.cedulaPhotoUrl} alt="Cédula" className="h-20 rounded-lg object-cover" />
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Subir foto de cédula</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Contact */}
          <div className="bg-card rounded-2xl border border-border p-4">
            <Label className="text-sm font-bold text-foreground mb-1.5 block">Teléfono *</Label>
            <Input
              placeholder="Ej: 0991234567"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              className="rounded-xl"
              type="tel"
            />
          </div>

          {/* Moto info */}
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <h3 className="text-sm font-bold text-foreground">Datos de la moto</h3>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Placa *</Label>
              <Input
                placeholder="Ej: EC-0451"
                value={form.plate}
                onChange={(e) => setForm((p) => ({ ...p, plate: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Modelo *</Label>
              <Input
                placeholder="Ej: Honda Wave 110"
                value={form.motoModel}
                onChange={(e) => setForm((p) => ({ ...p, motoModel: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Color *</Label>
              <Input
                placeholder="Ej: Rojo"
                value={form.motoColor}
                onChange={(e) => setForm((p) => ({ ...p, motoColor: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Foto de la moto (placa visible) *</Label>
              <button
                onClick={() => handleFileSelect("motoPhotoUrl")}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-4 hover:border-accent transition-colors"
              >
                {form.motoPhotoUrl ? (
                  <img src={form.motoPhotoUrl} alt="Moto" className="h-20 rounded-lg object-cover" />
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Subir foto de la moto</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <Button variant="hero" size="lg" className="w-full rounded-xl" onClick={handleSubmitApplication} disabled={submitting}>
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Enviando...</> : "📋 Enviar postulación"}
          </Button>

          <p className="text-[10px] text-muted-foreground text-center pb-4">
            Tu información será revisada por el equipo MotoYa. Te notificaremos cuando tu postulación sea aprobada.
          </p>
        </div>

        <BottomNav />
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

      {appStatus === "approved" && (
        <NotificationsBanner critical={available && !notifGranted} />
      )}

      {/* Profile card */}
      <div className="px-4 -mt-5">
        <div className="bg-card rounded-2xl shadow-lg p-5 border border-border">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center border-2 border-accent overflow-hidden">
              <img src={logoMotoya} alt="MotoYa" className="w-12 h-12 object-contain" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-extrabold text-foreground">{userName}</h2>
              {appStatus === "approved" && (
                <>
                  <div className="flex items-center gap-1 mt-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < Math.round(rating) ? "fill-accent text-accent" : "fill-muted text-muted"}`} />
                    ))}
                    <span className="text-xs font-medium text-muted-foreground ml-1">{rating.toFixed(1)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{totalTrips} viajes completados</p>
                </>
              )}
            </div>
          </div>

          {/* Application status */}
          {appStatus === "none" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                ¿Quieres ser conductor en MotoYa? Completa tu postulación.
              </p>
              <Button variant="hero" size="lg" className="w-full rounded-xl" onClick={() => setStep("apply")}>
                🏍️ Postularme como conductor
              </Button>
            </div>
          )}

          {appStatus === "pending" && (
            <div className="bg-accent/10 rounded-xl px-4 py-4 text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 text-accent animate-spin" />
                <span className="text-sm font-bold text-accent">Tu solicitud está en revisión ⏳</span>
              </div>
              <p className="text-xs text-muted-foreground">
                El equipo MotoYa está revisando tus documentos. Te notificaremos cuando tengamos una respuesta.
              </p>
            </div>
          )}

          {appStatus === "rejected" && (
            <div className="space-y-3">
              <div className="bg-destructive/10 rounded-xl px-4 py-3 text-center">
                <span className="text-sm font-bold text-destructive">❌ Postulación rechazada</span>
                <p className="text-xs text-muted-foreground mt-1">
                  Tu postulación no fue aprobada. Puedes volver a intentarlo con documentos actualizados.
                </p>
              </div>
              <Button variant="heroOutline" size="lg" className="w-full rounded-xl" onClick={() => { setAppStatus("none"); setStep("apply"); }}>
                🔄 Volver a postular
              </Button>
            </div>
          )}

          {appStatus === "approved" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {available ? "🟢 Disponible" : "⚫ No disponible"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {available ? "Apareces en la lista de pasajeros" : "No recibirás solicitudes"}
                  </p>
                </div>
                <Switch checked={available} onCheckedChange={handleToggleAvailable} />
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

      {/* Stats (only if approved) */}
      {appStatus === "approved" && (
        <div className="px-4 mt-6">
          <h3 className="text-sm font-bold text-foreground mb-3">Tus estadísticas</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Viajes", value: totalTrips.toString(), emoji: "🏍️" },
              { label: "Calificación", value: rating.toFixed(1), emoji: "⭐" },
              { label: "Meses activo", value: monthsActive.toString(), emoji: "📅" },
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
