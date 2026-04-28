import { useState, useEffect } from "react";
import { Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Driver } from "@/components/DriverCard";
import UserAvatar from "@/components/UserAvatar";

interface WaitingScreenProps {
  driver: Driver;
  destination: string;
  onCancel: () => void;
  onTimeout: () => void;
  onAccepted: () => void;
  estimatedCost?: string;
  viajeId?: string;
}

const TIMEOUT_SECONDS = 60;

const WaitingScreen = ({ driver, destination, onCancel, onTimeout, onAccepted, estimatedCost, viajeId }: WaitingScreenProps) => {
  const [seconds, setSeconds] = useState(TIMEOUT_SECONDS);
  const [timedOut, setTimedOut] = useState(false);
  const [rejected, setRejected] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (seconds <= 0) {
      setTimedOut(true);
      // Cancel viaje in DB when timeout
      if (viajeId) {
        supabase
          .from("viajes")
          .update({ estado: "cancelado" })
          .eq("id", viajeId)
          .then();
      }
      return;
    }
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds, viajeId]);

  // Realtime: listen for driver's response
  useEffect(() => {
    if (!viajeId) return;

    const channel = supabase
      .channel(`viaje_activo_${viajeId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "viajes",
          filter: `id=eq.${viajeId}`,
        },
        (payload: any) => {
          const nuevo = payload.new;
          console.log("📡 Estado actual del viaje:", nuevo.estado, "| viajeId:", viajeId);
          if (nuevo.estado === "aceptado") {
            console.log("✅ Conductor aceptó el viaje, pasando a viaje activo");
            onAccepted();
          }
          if (nuevo.estado === "rechazado") {
            console.log("❌ Viaje rechazado por el conductor");
            setRejected(true);
          } else if (nuevo.estado === "cancelado") {
            console.log("❌ Viaje cancelado");
            setTimedOut(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [viajeId, onAccepted]);

  if (rejected) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6 animate-fade-in">
        <div className="text-center space-y-6 max-w-sm">
          <span className="text-5xl">😔</span>
          <h2 className="text-lg font-extrabold text-foreground">El conductor rechazó tu solicitud</h2>
          <p className="text-sm text-muted-foreground">
            {driver.name} no pudo aceptar tu viaje en este momento. Puedes elegir otro conductor disponible.
          </p>
          <div className="space-y-3">
            <Button variant="hero" size="lg" className="w-full rounded-xl" onClick={onTimeout}>
              Buscar otro conductor
            </Button>
            <Button variant="outline" size="lg" className="w-full rounded-xl" onClick={onCancel}>
              Cancelar viaje
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (timedOut) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6 animate-fade-in">
        <div className="text-center space-y-6 max-w-sm">
          <span className="text-5xl">⏰</span>
          <h2 className="text-lg font-extrabold text-foreground">El conductor no respondió</h2>
          <p className="text-sm text-muted-foreground">
            {driver.name} no confirmó tu solicitud a tiempo. Puedes elegir otro conductor.
          </p>
          <div className="space-y-3">
            <Button variant="hero" size="lg" className="w-full rounded-xl" onClick={onTimeout}>
              Elegir otro conductor
            </Button>
            <Button variant="outline" size="lg" className="w-full rounded-xl" onClick={onCancel}>
              Cancelar viaje
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Si cancelaste por error, puedes volver a solicitar desde la lista de conductores.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6 animate-fade-in">
      <div className="text-center space-y-6 max-w-sm">
        <div className="relative mx-auto w-28 h-28 flex items-center justify-center">
          <UserAvatar foto={driver.photo} nombre={driver.name} size="lg" className="w-24 h-24" />
          <div className="absolute bottom-1 right-1 bg-accent rounded-full p-1.5 animate-pulse">
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

        {/* Destination */}
        <div className="flex items-center justify-center gap-2 bg-muted rounded-xl px-4 py-2.5">
          <MapPin className="h-4 w-4 text-accent flex-shrink-0" />
          <span className="text-sm text-foreground font-medium">{destination}</span>
        </div>

        {/* Pricing */}
        <div className="bg-accent/10 rounded-xl px-4 py-2.5 text-center">
          {estimatedCost === "city" ? (
            <>
              <span className="text-xs text-muted-foreground">Costo: </span>
              <span className="text-sm font-extrabold text-accent">$1.00</span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">El conductor te informará el costo</span>
          )}
        </div>

        {/* Timer */}
        <div className="relative w-20 h-20 mx-auto">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="34" fill="none"
              stroke="hsl(var(--accent))" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - seconds / TIMEOUT_SECONDS)}`}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-extrabold text-foreground">
            {seconds}s
          </span>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>El conductor tiene {seconds}s para confirmar</span>
        </div>

        <Button
          variant="outline"
          size="lg"
          className="w-full rounded-xl"
          onClick={onCancel}
        >
          Cancelar solicitud
        </Button>

        <p className="text-[10px] text-muted-foreground">
          Si cancelas, podrás elegir otro conductor desde la lista.
        </p>
      </div>
    </div>
  );
};

export default WaitingScreen;
