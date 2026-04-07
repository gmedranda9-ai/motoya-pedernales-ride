import { Star, Phone, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DriverCardProps {
  name: string;
  photo: string;
  rating: number;
  plate: string;
  model: string;
  eta: string;
}

const DriverCard = ({ name, photo, rating, plate, model, eta }: DriverCardProps) => {
  return (
    <div className="bg-card rounded-2xl shadow-lg p-5 mx-4 animate-slide-up border border-border">
      <div className="flex items-center gap-4">
        <img
          src={photo}
          alt={name}
          className="w-14 h-14 rounded-full object-cover border-2 border-accent"
        />
        <div className="flex-1">
          <h3 className="font-bold text-foreground">{name}</h3>
          <div className="flex items-center gap-1 mt-0.5">
            <Star className="h-3.5 w-3.5 fill-accent text-accent" />
            <span className="text-sm font-medium text-foreground">{rating.toFixed(1)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{model} · {plate}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Llega en</p>
          <p className="text-lg font-bold text-accent">{eta}</p>
        </div>
      </div>

      <div className="flex gap-3 mt-4">
        <Button variant="outline" size="sm" className="flex-1 rounded-xl">
          <Phone className="h-4 w-4 mr-1" />
          Llamar
        </Button>
        <Button variant="outline" size="sm" className="flex-1 rounded-xl">
          <MessageSquare className="h-4 w-4 mr-1" />
          Mensaje
        </Button>
      </div>
    </div>
  );
};

export default DriverCard;
