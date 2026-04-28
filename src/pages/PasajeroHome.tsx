import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import DriverCard, { type Driver } from "@/components/DriverCard";
import DriverProfile from "@/components/DriverProfile";
import WaitingScreen from "@/components/WaitingScreen";
import ActiveRideScreen from "@/components/ActiveRideScreen";
import RatingScreen from "@/components/RatingScreen";
import BottomNav from "@/components/BottomNav";
import logoMotoya from "@/assets/logo-motoya.png";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  Frown,
  MapPin,
  Navigation,
  ArrowLeft,
  Loader2,
  Clock,
  Star,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const FREQUENT_DESTINATIONS = [
  "Malecón de Pedernales",
  "Terminal Terrestre",
  "Hospital Básico",
  "Mercado Municipal",
  "Parque Central",
  "Plaza Pedernales",
  "Municipio de Pedernales",
  "Oficinas Poseidon",
  "Empresa Eléctrica",
  "Empresa de Agua",
  "Estadio",
  "Palmar del Río",
  "Gasolinera",
];

const ROTATING_PHRASES = [
  "¿A dónde te escapas hoy? 🛺",
  "Tu destino te espera 🗺️",
  "Rápido, seguro y económico ⚡",
  "¿Listo para tu próximo viaje? 🚀",
];

const CITY_DESTINATIONS = new Set(FREQUENT_DESTINATIONS);

const getCostType = (dest: string): string => {
  return CITY_DESTINATIONS.has(dest) ? "city" : "outside";
};

type Step = "home" | "drivers" | "profile" | "waiting" | "active" | "rating";

const PasajeroHome = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("home");
  const [locationAddress, setLocationAddress] = useState("");
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [destination, setDestination] = useState("");
  const [search, setSearch] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [viajeId, setViajeId] = useState<string | undefined>();
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [destinationsOpen, setDestinationsOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % ROTATING_PHRASES.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  const userName =
    user?.user_metadata?.nombre || user?.email?.split("@")[0] || "Pasajero";

  // Fetch drivers from Supabase
  const fetchDrivers = async () => {
    setLoadingDrivers(true);
    try {
      const { data, error } = await supabase
        .from("conductores")
        .select("*")
        .eq("disponible", true)
        .eq("estado", "aprobado");

      if (error) {
        console.error("Error al cargar conductores:", error);
        toast({ title: "Error", description: "No se pudieron cargar los conductores.", variant: "destructive" });
        setDrivers([]);
      } else {
        const mapped: Driver[] = (data || []).map((c: any) => ({
          id: c.id,
          name: c.nombre || "Sin nombre",
          photo: c.foto || "",
          plate: c.placa || "",
          model: c.modelo_moto || "",
          rating: c.calificacion_promedio ?? 5.0,
          available: c.disponible ?? true,
          phone: c.telefono || "",
          color: c.color || "",
        }));
        setDrivers(mapped);
      }
    } catch (err) {
      console.error("Error inesperado:", err);
      setDrivers([]);
    }
    setLoadingDrivers(false);
  };

  useEffect(() => {
    if (step === "drivers") {
      fetchDrivers();
    }
  }, [step]);

  const filteredDrivers = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.plate.toLowerCase().includes(search.toLowerCase())
  );

  const canSearch = !!destination;

  const detectLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationDenied(true);
      toast({ title: "GPS no disponible", description: "Escribe tu dirección manualmente." });
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocationCoords({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1&accept-language=es`,
            { headers: { "User-Agent": "MotoYa/1.0" } }
          );
          const data = await res.json();
          const addr = data.address;
          const street = addr?.road || addr?.pedestrian || addr?.neighbourhood || "";
          const city = addr?.city || addr?.town || addr?.village || "";
          setLocationAddress(street && city ? `${street}, ${city}` : street || city || `(${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
          setLocationDenied(false);
        } catch {
          setLocationAddress(`(${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
          setLocationDenied(false);
        }
        setDetectingLocation(false);
        toast({ title: "📍 Ubicación detectada", description: "Tu ubicación GPS ha sido registrada." });
      },
      (err) => {
        setDetectingLocation(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationDenied(true);
          toast({
            title: "Ubicación bloqueada",
            description: "Escribe tu dirección manualmente o activa el GPS en la configuración.",
            variant: "destructive",
          });
        } else if (err.code === err.TIMEOUT) {
          toast({
            title: "GPS tardó demasiado",
            description: "Intenta de nuevo o escribe tu dirección manualmente.",
          });
        } else {
          toast({
            title: "No se pudo obtener tu ubicación",
            description: "Verifica que el GPS esté activo o escribe tu dirección manualmente.",
          });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleManualAddress = (value: string) => {
    setManualAddress(value);
    setLocationAddress(value);
  };

  const handleSearch = () => {
    if (!destination) {
      toast({ title: "Destino obligatorio", description: "Selecciona a dónde quieres ir." });
      return;
    }
    if (!locationAddress) detectLocation();
    setStep("drivers");
  };

  const handleDriverTap = (driver: Driver) => {
    setSelectedDriver(driver);
    setStep("profile");
  };

  const handleRequest = async (driverId: string) => {
    const driver = drivers.find((d) => d.id === driverId);
    if (!driver || !user) return;
    setSelectedDriver(driver);
    setStep("waiting");

    // Resolve passenger's real name from auth metadata
    const pasajeroNombre =
      user.user_metadata?.nombre ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Pasajero";

    // Ensure usuarios row exists with the real name (upsert)
    const { error: upsertError } = await supabase
      .from("usuarios")
      .upsert(
        { id: user.id, nombre: pasajeroNombre, email: user.email },
        { onConflict: "id" }
      );
    if (upsertError) {
      console.warn("No se pudo sincronizar usuario:", upsertError.message);
    }

    // Insert viaje in Supabase
    const { data, error } = await supabase
      .from("viajes")
      .insert({
        pasajero_id: user.id,
        conductor_id: driverId,
        destino: destination,
        origen: locationAddress,
        origen_lat: locationCoords?.lat ?? null,
        origen_lng: locationCoords?.lng ?? null,
        estado: "pendiente",
        costo_tipo: getCostType(destination),
        pasajero_nombre: pasajeroNombre,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creando viaje:", error);
      toast({ title: "Error", description: "No se pudo crear el viaje.", variant: "destructive" });
      setStep("drivers");
      return;
    }

    setViajeId(data.id);

    // Send push notification to the driver via OneSignal (best-effort)
    try {
      console.log("📨 Enviando notificación a conductor:", driverId);
      const { data: conductorRow, error: conductorErr } = await supabase
        .from("conductores")
        .select("onesignal_player_id")
        .eq("id", driverId)
        .maybeSingle();

      if (conductorErr) {
        console.warn("⚠️ Error consultando conductor:", conductorErr.message);
      }

      const playerId = (conductorRow as any)?.onesignal_player_id;
      console.log("🔑 OneSignal player_id:", playerId || "(no registrado)");

      const cost = getCostType(destination) === "city" ? "1.00" : "acordar";
      const { data: pushData, error: pushErr } = await supabase.functions.invoke(
        "send-ride-notification",
        {
          body: {
            player_id: playerId || undefined,
            conductor_id: driverId,
            passenger_name: pasajeroNombre,
            destination,
            cost,
          },
        }
      );
      if (pushErr) {
        console.error("❌ Error invocando send-ride-notification:", pushErr);
      } else {
        console.log("✅ Respuesta OneSignal:", pushData);
      }
    } catch (e) {
      console.warn("No se pudo enviar push al conductor:", e);
    }

    toast({
      title: "¡Solicitud enviada!",
      description: `Viaje solicitado con ${driver.name}. Esperando confirmación.`,
    });
  };

  const handleCancel = async () => {
    if (viajeId) {
      await supabase.from("viajes").update({ estado: "cancelado" }).eq("id", viajeId);
    }
    setSelectedDriver(null);
    setViajeId(undefined);
    setStep("home");
    toast({ title: "Solicitud cancelada" });
  };

  const handleTimeout = () => {
    setSelectedDriver(null);
    setViajeId(undefined);
    setStep("drivers");
  };

  const handleAccepted = () => {
    setStep("active");
    toast({ title: "🎉 ¡Viaje confirmado!", description: `${selectedDriver?.name} viene en camino.` });
  };

  const handleFinish = () => {
    setSelectedDriver(null);
    setDestination("");
    setLocationAddress("");
    setStep("home");
  };

  // ── Rating Screen ──
  if (step === "rating" && selectedDriver) {
    return (
      <RatingScreen
        driver={selectedDriver}
        destination={destination}
        viajeId={viajeId}
        onSubmit={(rating, comment) => {
          if (rating > 0) {
            toast({ title: "⭐ Calificación enviada", description: `Calificaste a ${selectedDriver.name} con ${rating} estrella${rating > 1 ? "s" : ""}.` });
          }
          setTimeout(() => handleFinish(), 1500);
        }}
      />
    );
  }

  // ── Active Ride ──
  if (step === "active" && selectedDriver) {
    return <ActiveRideScreen driver={selectedDriver} destination={destination} viajeId={viajeId} originCoords={locationCoords ?? undefined} onFinish={() => setStep("rating")} />;
  }

  // ── Waiting Screen ──
  if (step === "waiting" && selectedDriver) {
    const costType = getCostType(destination);
    return (
      <WaitingScreen
        driver={selectedDriver}
        destination={destination}
        onCancel={handleCancel}
        onTimeout={handleTimeout}
        onAccepted={handleAccepted}
        estimatedCost={costType}
        viajeId={viajeId}
      />
    );
  }

  // ── Driver Profile ──
  if (step === "profile" && selectedDriver) {
    const costType = getCostType(destination);
    return (
      <DriverProfile
        driver={selectedDriver}
        onRequest={handleRequest}
        onClose={() => setStep("drivers")}
        estimatedCost={costType}
      />
    );
  }

  // ── Driver List ──
  if (step === "drivers") {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="gradient-primary px-4 pt-10 pb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep("home")}
              className="p-1.5 rounded-full bg-primary-foreground/10 text-primary-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-extrabold text-accent">
                Conductores disponibles
              </h1>
              <p className="text-xs text-primary-foreground/70">
                📍 {destination}
              </p>
            </div>
          </div>
        </header>

        <div className="px-4 -mt-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o placa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-xl bg-card shadow-sm"
            />
          </div>
        </div>

        <div className="px-4 space-y-3">
          {loadingDrivers ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="h-10 w-10 text-accent animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Buscando conductores...</p>
            </div>
          ) : filteredDrivers.length > 0 ? (
            filteredDrivers.map((driver) => (
                <div
                  key={driver.id}
                  onClick={() => handleDriverTap(driver)}
                  className="cursor-pointer"
                >
                  <div className="bg-card rounded-2xl shadow-md p-4 border border-border animate-slide-up">
                    <div className="flex items-center gap-4">
                      {driver.photo && !driver.photo.includes("placeholder") && !driver.photo.includes("logo-motoya") ? (
                        <img
                          src={driver.photo}
                          alt={driver.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-accent"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-primary border-2 border-accent flex items-center justify-center flex-shrink-0">
                          <span className="text-2xl font-extrabold text-accent">
                            {(driver.name || "?").trim().charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-bold text-foreground truncate">{driver.name}</h3>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              driver.available
                                ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {driver.available ? "Disponible" : "Ocupado"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 mb-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3.5 w-3.5 ${
                              i < Math.round(driver.rating)
                                ? "fill-accent text-accent"
                                : "fill-muted text-muted"
                            }`} />
                          ))}
                          <span className="text-xs font-medium text-muted-foreground ml-1">
                            {driver.rating.toFixed(1)}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="text-xs">🛺</span>
                          {driver.model} · <span className="font-semibold">{driver.plate}</span>
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="hero"
                      size="sm"
                      className="w-full mt-3 rounded-xl"
                      disabled={!driver.available}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDriverTap(driver);
                      }}
                    >
                      {driver.available ? "Solicitar viaje" : "No disponible"}
                    </Button>
                  </div>
                </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Frown className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h2 className="text-lg font-bold text-foreground mb-1">
                No hay conductores disponibles
              </h2>
              <p className="text-sm text-muted-foreground max-w-xs">
                En este momento no encontramos conductores cerca de ti. Intenta
                de nuevo en unos minutos.
              </p>
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    );
  }

  // ── Home: Destination First ──
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="gradient-primary px-4 pt-10 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <img src={logoMotoya} alt="MotoYa" className="h-10 w-10" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-extrabold text-accent">MotoYa</h1>
            <p className="text-sm text-primary-foreground/90">
              Hola, {userName} 👋
            </p>
            <p
              key={phraseIdx}
              className="text-xs text-primary-foreground/80 mt-1 animate-fade-in"
            >
              {ROTATING_PHRASES[phraseIdx]}
            </p>
          </div>
        </div>
      </header>

      {/* Ride Request Card */}
      <div className="px-4 -mt-5">
        <div className="bg-card rounded-2xl shadow-lg p-5 border border-border">
          <h2 className="text-lg font-bold text-foreground mb-4">
            ¿A dónde vas?
          </h2>

          <div className="space-y-3">
            {/* Location button */}
            <button
              onClick={detectLocation}
              disabled={detectingLocation}
              className="flex items-center gap-3 bg-muted rounded-xl px-4 py-3 w-full text-left transition-colors hover:bg-muted/80"
            >
              <div className="w-3 h-3 rounded-full bg-[hsl(var(--success))] animate-pulse flex-shrink-0" />
              <span className={`flex-1 text-sm ${locationAddress ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {detectingLocation ? "Detectando ubicación..." : locationAddress || "📍 Toca aquí para detectar tu ubicación"}
              </span>
              {detectingLocation ? (
                <Loader2 className="h-4 w-4 text-accent animate-spin" />
              ) : (
                <Navigation className="h-4 w-4 text-accent" />
              )}
            </button>

            {locationDenied && (
              <div className="space-y-2 animate-fade-in">
                <div className="flex items-center gap-3 bg-muted rounded-xl px-4 py-3">
                  <MapPin className="h-4 w-4 text-accent flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Escribe tu dirección manualmente"
                    value={manualAddress}
                    onChange={(e) => handleManualAddress(e.target.value)}
                    className="bg-transparent flex-1 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2">
                  <p className="text-[11px] text-foreground flex-1">
                    Activa tu ubicación para mejor experiencia
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] rounded-lg"
                    onClick={detectLocation}
                  >
                    Reintentar
                  </Button>
                </div>
              </div>
            )}

            {locationAddress && !locationDenied && (
              <p className="text-[10px] text-muted-foreground px-1">
                ¿No es exacta? En una futura versión podrás mover el pin en el mapa.
              </p>
            )}

            {/* Destination */}
            <div className="flex items-center gap-3 bg-muted rounded-xl px-4 py-3">
              <MapPin className="h-4 w-4 text-accent flex-shrink-0" />
              <input
                type="text"
                placeholder="¿A dónde quieres ir? *"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="bg-transparent flex-1 text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>

            {/* Frequent Destinations (collapsible) */}
            <div>
              <button
                type="button"
                onClick={() => setDestinationsOpen((v) => !v)}
                className="flex items-center justify-between w-full text-left py-2"
                aria-expanded={destinationsOpen}
              >
                <span className="text-sm font-bold text-foreground">
                  📍 Destinos frecuentes
                </span>
                <span
                  className={`text-foreground transition-transform duration-200 ${
                    destinationsOpen ? "rotate-180" : ""
                  }`}
                >
                  ▼
                </span>
              </button>

              {destinationsOpen && (
                <div className="grid grid-cols-2 gap-2 mt-2 animate-fade-in">
                  {FREQUENT_DESTINATIONS.map((place) => (
                    <button
                      key={place}
                      type="button"
                      onClick={() => {
                        setDestination(place);
                        setDestinationsOpen(false);
                      }}
                      className="flex items-center gap-2 text-left py-2.5 px-3 rounded-xl bg-muted hover:bg-muted/70 transition-colors"
                    >
                      <MapPin className="h-4 w-4 text-accent flex-shrink-0" />
                      <span className="text-xs text-foreground leading-tight">{place}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Button
            variant="hero"
            size="lg"
            className="w-full mt-4 rounded-xl text-base"
            onClick={handleSearch}
            disabled={!canSearch}
          >
            🛺 Ver conductores disponibles
          </Button>

          {!canSearch && (
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Ingresa un destino para continuar
            </p>
          )}
        </div>
      </div>

      {/* Viaja seguro */}
      <div className="px-4 mt-6">
        <div className="rounded-2xl p-5 bg-primary text-primary-foreground shadow-lg">
          <h3 className="text-base font-bold mb-3">🔒 Viaja con confianza</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span>✅</span>
              <span>Conductores verificados por Poseidon</span>
            </li>
            <li className="flex items-start gap-2">
              <span>⭐</span>
              <span>Calificaciones reales de usuarios</span>
            </li>
            <li className="flex items-start gap-2">
              <span>🆘</span>
              <span>Botón SOS disponible en cada viaje</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Cómo funciona */}
      <div className="px-4 mt-6">
        <h3 className="text-sm font-bold text-foreground mb-3">
          ¿Cómo usar MotoYa?
        </h3>
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col items-center text-center flex-1">
              <span className="text-3xl mb-1">1️⃣</span>
              <p className="text-[11px] font-medium text-foreground leading-tight">
                Elige destino
              </p>
            </div>
            <span className="text-accent text-xl font-bold">→</span>
            <div className="flex flex-col items-center text-center flex-1">
              <span className="text-3xl mb-1">2️⃣</span>
              <p className="text-[11px] font-medium text-foreground leading-tight">
                Elige conductor
              </p>
            </div>
            <span className="text-accent text-xl font-bold">→</span>
            <div className="flex flex-col items-center text-center flex-1">
              <span className="text-3xl mb-1">3️⃣</span>
              <p className="text-[11px] font-medium text-foreground leading-tight">
                Viaja seguro
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Frequent Destinations (collapsible) */}
      <div className="px-4 mt-6">
        <button
          onClick={() => setDestinationsOpen((v) => !v)}
          className="flex items-center justify-between w-full text-left py-2"
          aria-expanded={destinationsOpen}
        >
          <span className="text-sm font-bold text-foreground">
            📍 Destinos frecuentes
          </span>
          <span
            className={`text-foreground transition-transform duration-200 ${
              destinationsOpen ? "rotate-180" : ""
            }`}
          >
            ▼
          </span>
        </button>

        {destinationsOpen && (
          <div className="grid grid-cols-2 gap-2 mt-2 animate-fade-in">
            {FREQUENT_DESTINATIONS.map((place) => (
              <button
                key={place}
                onClick={() => {
                  setDestination(place);
                  setDestinationsOpen(false);
                }}
                className="flex items-center gap-2 text-left py-2.5 px-3 rounded-xl bg-muted hover:bg-muted/70 transition-colors"
              >
                <MapPin className="h-4 w-4 text-accent flex-shrink-0" />
                <span className="text-xs text-foreground leading-tight">{place}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Why MotoYa */}
      <div className="px-4 mt-6 mb-4">
        <h3 className="text-sm font-bold text-foreground mb-3">
          ¿Por qué MotoYa?
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Rápido", desc: "En minutos", emoji: "⚡" },
            { label: "Seguro", desc: "Conductores verificados", emoji: "🔒" },
            { label: "Local", desc: "Conocemos Pedernales", emoji: "📍" },
          ].map((f) => (
            <div
              key={f.label}
              className="bg-card rounded-xl p-3 text-center border border-border"
            >
              <span className="text-xl mb-1 block">{f.emoji}</span>
              <p className="text-xs font-bold text-foreground">{f.label}</p>
              <p className="text-[10px] text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default PasajeroHome;
