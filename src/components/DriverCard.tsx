import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface Driver {
  id: string;
  name: string;
  photo: string;
  plate: string;
  model: string;
  rating: number;
  available: boolean;
  phone?: string;
  color?: string;
}

interface DriverCardProps {
  driver: Driver;
  onRequest: (driverId: string) => void;
}

const DriverCard = ({ driver, onRequest }: DriverCardProps) => {
  const { name, photo, plate, model, rating, available } = driver;

  return (
    <div className="bg-card rounded-2xl shadow-md p-4 border border-border animate-slide-up">
      <div className="flex items-center gap-4">
        <img
          src={photo}
          alt={name}
          className="w-16 h-16 rounded-full object-cover border-2 border-accent"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-bold text-foreground truncate">{name}</h3>
            <Badge
              variant={available ? "default" : "secondary"}
              className={
                available
                  ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-[10px] px-2 py-0.5"
                  : "bg-muted text-muted-foreground text-[10px] px-2 py-0.5"
              }
            >
              {available ? "Disponible" : "Ocupado"}
            </Badge>
          </div>

          <div className="flex items-center gap-1 mb-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${
                  i < Math.round(rating)
                    ? "fill-accent text-accent"
                    : "fill-muted text-muted"
                }`}
              />
            ))}
            <span className="text-xs font-medium text-muted-foreground ml-1">
              {rating.toFixed(1)}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            🏍️ {model} · <span className="font-semibold">{plate}</span>
          </p>
        </div>
      </div>

      <Button
        variant="hero"
        size="sm"
        className="w-full mt-3 rounded-xl"
        disabled={!available}
        onClick={() => onRequest(driver.id)}
      >
        {available ? "Solicitar viaje" : "No disponible"}
      </Button>
    </div>
  );
};

export default DriverCard;
