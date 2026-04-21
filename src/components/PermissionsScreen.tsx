import { MapPin, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoMotoya from "@/assets/logo-motoya.png";
import { subscribeToPush } from "@/lib/onesignal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";

interface PermissionsScreenProps {
  onDone: () => void;
}

const PermissionsScreen = ({ onDone }: PermissionsScreenProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const requestLocation = (): Promise<boolean> =>
    new Promise((resolve) => {
      if (!("geolocation" in navigator)) return resolve(false);
      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        () => resolve(false),
        { timeout: 10000 }
      );
    });

  const handleAllowAll = async () => {
    setLoading(true);
    await requestLocation();
    try {
      const playerId = await subscribeToPush();
      if (playerId && user) {
        const role = user.user_metadata?.rol;
        if (role === "conductor") {
          await supabase
            .from("conductores")
            .update({ onesignal_player_id: playerId })
            .eq("id", user.id);
        }
      }
    } catch (e) {
      console.warn("Push subscribe failed:", e);
    }
    setLoading(false);
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[80] bg-background flex flex-col items-center justify-center px-6 animate-fade-in">
      <div className="w-full max-w-sm space-y-6 text-center">
        <img src={logoMotoya} alt="MotoYa" className="h-16 w-16 mx-auto" />
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Permisos necesarios</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Para que MotoYa funcione mejor, necesitamos los siguientes permisos:
          </p>
        </div>

        <div className="space-y-3 text-left">
          <div className="bg-card border border-border rounded-2xl p-4 flex gap-3">
            <div className="p-2 rounded-full bg-accent/10 h-fit">
              <MapPin className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">📍 Ubicación</p>
              <p className="text-xs text-muted-foreground">
                MotoYa necesita tu ubicación para mostrarte conductores cercanos y compartir tu posición.
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 flex gap-3">
            <div className="p-2 rounded-full bg-accent/10 h-fit">
              <Bell className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">🔔 Notificaciones</p>
              <p className="text-xs text-muted-foreground">
                Activa las notificaciones para recibir alertas de viajes en tiempo real.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Button
            variant="hero"
            size="lg"
            className="w-full rounded-xl"
            onClick={handleAllowAll}
            disabled={loading}
          >
            {loading ? "Solicitando..." : "Permitir todo"}
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="w-full rounded-xl"
            onClick={onDone}
            disabled={loading}
          >
            Ahora no
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PermissionsScreen;
