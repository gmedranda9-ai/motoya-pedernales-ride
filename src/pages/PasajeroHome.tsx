import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import DriverCard, { type Driver } from "@/components/DriverCard";
import DriverProfile from "@/components/DriverProfile";
import WaitingScreen from "@/components/WaitingScreen";
import BottomNav from "@/components/BottomNav";
import logoMotoya from "@/assets/logo-motoya.png";
import {
  Search,
  Frown,
  MapPin,
  Navigation,
  Zap,
  Shield,
  ArrowLeft,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const MOCK_DRIVERS: Driver[] = [
  {
    id: "1",
    name: "Carlos Mendoza",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    plate: "EC-0451",
    model: "Honda Wave 110",
    rating: 4.8,
    available: true,
    phone: "0991-234-567",
    color: "Rojo",
  },
  {
    id: "2",
    name: "Luis Bravo",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    plate: "EC-0322",
    model: "Yamaha YBR 125",
    rating: 4.5,
    available: true,
    phone: "0998-765-432",
    color: "Negro",
  },
  {
    id: "3",
    name: "Miguel Cedeño",
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    plate: "EC-0198",
    model: "Suzuki GN 125",
    rating: 4.2,
    available: false,
    phone: "0985-111-222",
    color: "Azul",
  },
  {
    id: "4",
    name: "Pedro Zambrano",
    photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    plate: "EC-0567",
    model: "Bajaj Pulsar 135",
    rating: 4.9,
    available: true,
    phone: "0993-456-789",
    color: "Negro y rojo",
  },
  {
    id: "5",
    name: "Jorge Pincay",
    photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face",
    plate: "EC-0410",
    model: "TVS Apache 160",
    rating: 3.8,
    available: false,
    phone: "0987-654-321",
    color: "Blanco",
  },
];

const FREQUENT_DESTINATIONS = [
  "Malecón de Pedernales",
  "Terminal Terrestre",
  "Hospital Básico",
  "Mercado Municipal",
  "Parque Central",
  "Colegio 5 de Junio",
];

type Step = "home" | "drivers" | "profile" | "waiting";

const PasajeroHome = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("home");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [search, setSearch] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  const userName =
    user?.user_metadata?.nombre || user?.email?.split("@")[0] || "Pasajero";

  const filteredDrivers = MOCK_DRIVERS.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.plate.toLowerCase().includes(search.toLowerCase())
  );

  const detectLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          setOrigin("Mi ubicación actual 📍");
          toast({ title: "Ubicación detectada", description: "Usaremos tu ubicación actual como origen." });
        },
        () => {
          setOrigin("Pedernales, Ecuador");
          toast({ title: "Ubicación no disponible", description: "Usaremos Pedernales como origen predeterminado." });
        }
      );
    } else {
      setOrigin("Pedernales, Ecuador");
    }
  };

  const handleSearch = () => {
    if (!destination) {
      toast({ title: "Selecciona un destino", description: "Elige a dónde quieres ir primero." });
      return;
    }
    if (!origin) detectLocation();
    setStep("drivers");
  };

  const handleDriverTap = (driver: Driver) => {
    setSelectedDriver(driver);
    setStep("profile");
  };

  const handleRequest = (driverId: string) => {
    const driver = MOCK_DRIVERS.find((d) => d.id === driverId);
    if (!driver) return;
    setSelectedDriver(driver);
    setStep("waiting");
    // TODO: save to viajes table when DB is connected
    toast({
      title: "¡Solicitud enviada!",
      description: `Viaje solicitado con ${driver.name}. Esperando confirmación.`,
    });
  };

  const handleCancel = () => {
    setSelectedDriver(null);
    setStep("drivers");
    toast({ title: "Solicitud cancelada" });
  };

  // ── Waiting Screen ──
  if (step === "waiting" && selectedDriver) {
    return <WaitingScreen driver={selectedDriver} onCancel={handleCancel} />;
  }

  // ── Driver Profile ──
  if (step === "profile" && selectedDriver) {
    return (
      <DriverProfile
        driver={selectedDriver}
        onRequest={handleRequest}
        onClose={() => setStep("drivers")}
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
                {destination}
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
          {filteredDrivers.length > 0 ? (
            filteredDrivers.map((driver) => (
              <div
                key={driver.id}
                onClick={() => handleDriverTap(driver)}
                className="cursor-pointer"
              >
                <DriverCard driver={driver} onRequest={handleRequest} />
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
        <div className="flex items-center gap-3 mb-4">
          <img src={logoMotoya} alt="MotoYa" className="h-10 w-10" />
          <div>
            <h1 className="text-xl font-extrabold text-accent">MotoYa</h1>
            <p className="text-sm text-primary-foreground/90">
              Hola, {userName} 👋
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
            {/* Origin */}
            <div className="flex items-center gap-3 bg-muted rounded-xl px-4 py-3">
              <div className="w-3 h-3 rounded-full bg-[hsl(var(--success))] animate-pulse" />
              <input
                type="text"
                placeholder="Tu ubicación actual"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="bg-transparent flex-1 text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <button onClick={detectLocation}>
                <Navigation className="h-4 w-4 text-muted-foreground hover:text-accent transition-colors" />
              </button>
            </div>

            {/* Destination */}
            <div className="flex items-center gap-3 bg-muted rounded-xl px-4 py-3">
              <MapPin className="h-4 w-4 text-accent" />
              <input
                type="text"
                placeholder="¿A dónde quieres ir?"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="bg-transparent flex-1 text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
          </div>

          <Button
            variant="hero"
            size="lg"
            className="w-full mt-4 rounded-xl text-base"
            onClick={handleSearch}
          >
            🔍 Buscar mototaxis disponibles
          </Button>
        </div>
      </div>

      {/* Frequent Destinations */}
      <div className="px-4 mt-6">
        <h3 className="text-sm font-bold text-foreground mb-3">
          Destinos frecuentes en Pedernales
        </h3>
        <div className="space-y-1.5">
          {FREQUENT_DESTINATIONS.map((place) => (
            <button
              key={place}
              onClick={() => setDestination(place)}
              className="flex items-center gap-2.5 w-full text-left py-2.5 px-3 rounded-xl hover:bg-muted transition-colors"
            >
              <MapPin className="h-4 w-4 text-accent flex-shrink-0" />
              <span className="text-sm text-foreground">{place}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Why MotoYa */}
      <div className="px-4 mt-6 mb-4">
        <h3 className="text-sm font-bold text-foreground mb-3">
          ¿Por qué MotoYa?
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Zap, label: "Rápido", desc: "En minutos", emoji: "⚡" },
            { icon: Shield, label: "Seguro", desc: "Conductores verificados", emoji: "🔒" },
            { icon: MapPin, label: "Local", desc: "Conocemos Pedernales", emoji: "📍" },
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
