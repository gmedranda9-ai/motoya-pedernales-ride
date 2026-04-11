import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import DriverCard, { type Driver } from "@/components/DriverCard";
import BottomNav from "@/components/BottomNav";
import logoMotoya from "@/assets/logo-motoya.png";
import { Search, Frown } from "lucide-react";
import { Input } from "@/components/ui/input";

// Mock data — will be replaced with Supabase queries
const MOCK_DRIVERS: Driver[] = [
  {
    id: "1",
    name: "Carlos Mendoza",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    plate: "EC-0451",
    model: "Honda Wave 110",
    rating: 4.8,
    available: true,
  },
  {
    id: "2",
    name: "Luis Bravo",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    plate: "EC-0322",
    model: "Yamaha YBR 125",
    rating: 4.5,
    available: true,
  },
  {
    id: "3",
    name: "Miguel Cedeño",
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    plate: "EC-0198",
    model: "Suzuki GN 125",
    rating: 4.2,
    available: false,
  },
  {
    id: "4",
    name: "Pedro Zambrano",
    photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    plate: "EC-0567",
    model: "Bajaj Pulsar 135",
    rating: 4.9,
    available: true,
  },
  {
    id: "5",
    name: "Jorge Pincay",
    photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face",
    plate: "EC-0410",
    model: "TVS Apache 160",
    rating: 3.8,
    available: false,
  },
];

const PasajeroHome = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const userName = user?.user_metadata?.nombre || user?.email?.split("@")[0] || "Pasajero";

  const filteredDrivers = MOCK_DRIVERS.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.plate.toLowerCase().includes(search.toLowerCase())
  );

  const availableCount = filteredDrivers.filter((d) => d.available).length;

  const handleRequest = (driverId: string) => {
    const driver = MOCK_DRIVERS.find((d) => d.id === driverId);
    toast({
      title: "¡Solicitud enviada!",
      description: `Has solicitado un viaje con ${driver?.name}. Pronto te confirmarán.`,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="gradient-primary px-4 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-3">
          <img src={logoMotoya} alt="MotoYa" className="h-10 w-10" />
          <div>
            <h1 className="text-xl font-extrabold text-accent">MotoYa</h1>
            <p className="text-xs text-primary-foreground/70">
              Hola, {userName} 👋
            </p>
          </div>
        </div>
        <p className="text-primary-foreground/90 text-sm">
          {availableCount > 0
            ? `${availableCount} conductor${availableCount > 1 ? "es" : ""} disponible${availableCount > 1 ? "s" : ""} cerca de ti`
            : "Buscando conductores..."}
        </p>
      </header>

      {/* Search */}
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

      {/* Driver List */}
      <div className="px-4 space-y-3">
        {filteredDrivers.length > 0 ? (
          filteredDrivers.map((driver) => (
            <DriverCard
              key={driver.id}
              driver={driver}
              onRequest={handleRequest}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Frown className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h2 className="text-lg font-bold text-foreground mb-1">
              No hay conductores disponibles
            </h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              En este momento no encontramos conductores cerca de ti. Intenta de nuevo en unos minutos.
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default PasajeroHome;
