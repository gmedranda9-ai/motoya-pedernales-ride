import BottomNav from "@/components/BottomNav";
import DriverCard from "@/components/DriverCard";
import { Clock } from "lucide-react";
import { useBackButton } from "@/hooks/useBackButton";

const mockTrips = [
  {
    id: "1",
    driver: "Carlos Mendoza",
    date: "Hoy, 14:30",
    origin: "Malecón",
    destination: "Terminal",
    status: "completado",
    cost: "$1.50",
  },
  {
    id: "2",
    driver: "Miguel Torres",
    date: "Ayer, 09:15",
    origin: "Hospital",
    destination: "Mercado Central",
    status: "completado",
    cost: "$1.00",
  },
];

const Viajes = () => {
  useBackButton();
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="gradient-primary px-4 pt-12 pb-6">
        <h1 className="text-xl font-extrabold text-accent">Mis Viajes</h1>
        <p className="text-xs text-primary-foreground/70 mt-1">Historial de recorridos</p>
      </header>

      {/* Active ride mock */}
      <div className="mx-4 -mt-3 mb-4">
        <DriverCard
          driver={{
            id: "active",
            name: "Juan Reyes",
            photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
            rating: 4.8,
            plate: "ABC-1234",
            model: "Honda Wave",
            available: true,
          }}
          onRequest={() => {}}
        />
      </div>

      <div className="mx-4 space-y-3">
        <h2 className="text-sm font-bold text-foreground">Viajes anteriores</h2>
        {mockTrips.map((trip) => (
          <div key={trip.id} className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">{trip.driver}</span>
              <span className="text-sm font-bold text-accent">{trip.cost}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{trip.date}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {trip.origin} → {trip.destination}
            </p>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default Viajes;
