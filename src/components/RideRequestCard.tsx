import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const RideRequestCard = () => {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  return (
    <div className="bg-card rounded-2xl shadow-lg p-5 mx-4 animate-slide-up border border-border">
      <h2 className="text-lg font-bold text-foreground mb-4">¿A dónde vas?</h2>
      
      <div className="space-y-3">
        <div className="flex items-center gap-3 bg-muted rounded-xl px-4 py-3">
          <div className="w-3 h-3 rounded-full bg-success animate-pulse-dot" />
          <input
            type="text"
            placeholder="Tu ubicación actual"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            className="bg-transparent flex-1 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <Navigation className="h-4 w-4 text-muted-foreground" />
        </div>

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

      <Button variant="hero" size="lg" className="w-full mt-4 rounded-xl text-base">
        Pedir MotoYa
      </Button>

      <div className="mt-4 space-y-2">
        <p className="text-xs text-muted-foreground font-medium">Destinos frecuentes</p>
        {["Malecón de Pedernales", "Terminal Terrestre", "Hospital Básico"].map((place) => (
          <button
            key={place}
            onClick={() => setDestination(place)}
            className="flex items-center gap-2 w-full text-left py-2 px-3 rounded-lg hover:bg-muted transition-colors"
          >
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm text-foreground">{place}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RideRequestCard;
