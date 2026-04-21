import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subscribeToPush } from "@/lib/onesignal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const NotificationsBanner = () => {
  const { user } = useAuth();
  const [denied, setDenied] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = () => {
    if (typeof Notification === "undefined") {
      setDenied(false);
      return;
    }
    setDenied(Notification.permission !== "granted");
  };

  useEffect(() => {
    refresh();
    const onVis = () => refresh();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const activate = async () => {
    if (typeof Notification === "undefined") return;
    setLoading(true);
    try {
      if (Notification.permission === "default") {
        await Notification.requestPermission();
      }
      if (Notification.permission === "granted") {
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
      }
    } finally {
      refresh();
      setLoading(false);
    }
  };

  if (!denied) return null;

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
