import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Driver } from "@/components/DriverCard";

interface WaitingScreenProps {
  driver: Driver;
  onCancel: () => void;
}

const WaitingScreen = ({ driver, onCancel }: WaitingScreenProps) => {
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6 animate-fade-in">
      <div className="text-center space-y-6 max-w-sm">
        <div className="relative mx-auto w-28 h-28">
          <img
            src={driver.photo}
            alt={driver.name}
            className="w-24 h-24 rounded-full object-cover border-4 border-accent mx-auto"
          />
          <div className="absolute -bottom-1 -right-1 bg-accent rounded-full p-1.5 animate-pulse">
            <Loader2 className="h-4 w-4 text-accent-foreground animate-spin" />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-extrabold text-foreground mb-1">
            Esperando respuesta...
          </h2>
          <p className="text-sm text-muted-foreground">
            Has solicitado un viaje con{" "}
            <span className="font-bold text-foreground">{driver.name}</span>
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>El conductor confirmará tu solicitud pronto</span>
        </div>

        <Button
          variant="outline"
          size="lg"
          className="w-full rounded-xl"
          onClick={onCancel}
        >
          Cancelar solicitud
        </Button>
      </div>
    </div>
  );
};

export default WaitingScreen;
