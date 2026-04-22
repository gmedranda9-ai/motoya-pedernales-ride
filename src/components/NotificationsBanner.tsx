import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { subscribeToPush } from "@/lib/onesignal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";
import { useToast } from "@/hooks/use-toast";

interface Props {
  /** When true, render the persistent red "puedes perder viajes" banner. */
  critical?: boolean;
}

const NotificationsBanner = ({ critical = false }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isGranted, isBlocked, request, refresh } = useNotificationPermission();
  const [loading, setLoading] = useState(false);

  if (isGranted) return null;

  const activate = async () => {
    setLoading(true);
    try {
      if (isBlocked) {
        toast({
          title: "Notificaciones bloqueadas",
          description: "Actívalas en la configuración del navegador y recarga.",
          variant: "destructive",
        });
        return;
      }
      const next = await request();
      if (next === "granted") {
        try {
          const playerId = await Promise.race<string | null>([
            subscribeToPush(),
            new Promise<null>((r) => setTimeout(() => r(null), 8000)),
          ]);
          if (playerId && user) {
            await supabase
              .from("conductores")
              .update({ onesignal_player_id: playerId })
              .eq("usuario_id", user.id);
          }
        } catch (e) {
          console.warn("Push subscribe failed:", e);
        }
        toast({ title: "🔔 Notificaciones activadas" });
      }
    } finally {
      refresh();
      setLoading(false);
    }
  };

  if (critical) {
    return (
      <div className="mx-4 mt-3 bg-destructive/15 border-2 border-destructive rounded-2xl p-3 flex items-center gap-3 animate-fade-in">
        <div className="p-2 rounded-full bg-destructive/20 h-fit">
          <BellOff className="h-4 w-4 text-destructive" />
        </div>
        <p className="flex-1 text-xs text-destructive font-bold leading-snug">
          🔕 Sin notificaciones — Puedes perder viajes
        </p>
        <Button
          size="sm"
          variant="destructive"
          className="rounded-xl text-xs h-8"
          onClick={activate}
          disabled={loading}
        >
          {loading ? "..." : "Activar ahora"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-3 bg-accent/10 border border-accent/30 rounded-2xl p-3 flex items-center gap-3 animate-fade-in">
      <div className="p-2 rounded-full bg-accent/20 h-fit">
        <Bell className="h-4 w-4 text-accent" />
      </div>
      <p className="flex-1 text-xs text-foreground font-medium leading-snug">
        🔔 Activa notificaciones para no perderte solicitudes de viaje
      </p>
      <Button
        size="sm"
        variant="hero"
        className="rounded-xl text-xs h-8"
        onClick={activate}
        disabled={loading}
      >
        {loading ? "..." : "Activar ahora"}
      </Button>
    </div>
  );
};

export default NotificationsBanner;
