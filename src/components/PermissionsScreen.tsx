import { MapPin, Bell, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoMotoya from "@/assets/logo-motoya.png";
import { subscribeToPush } from "@/lib/onesignal";
import { getPushToken, isNativePush } from "@/lib/pushNotifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

interface PermissionsScreenProps {
  onDone: () => void;
}

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

const PermissionsScreen = ({ onDone }: PermissionsScreenProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [locationFailed, setLocationFailed] = useState(false);
  const [showIOSTip, setShowIOSTip] = useState(false);
  const [showIOSRetryTip, setShowIOSRetryTip] = useState(false);

  const requestLocation = async (isRetryAttempt = false): Promise<boolean> => {
    if (Capacitor.isNativePlatform()) {
      try {
        const perm = await Geolocation.requestPermissions();
        if (perm.location !== "granted" && perm.coarseLocation !== "granted") return false;
        await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
        return true;
      } catch (e) {
        console.warn("Native geolocation error:", e);
        return false;
      }
    }
    return new Promise((resolve) => {
      if (!("geolocation" in navigator)) return resolve(false);
      let done = false;
      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        resolve(ok);
      };
      const isIOSRetry = isRetryAttempt && isIOS;
      const options = isIOSRetry
        ? { timeout: 15000, enableHighAccuracy: false, maximumAge: 30000 }
        : { timeout: 8000, maximumAge: 60000 };
      const fallbackTimeout = isIOSRetry ? 16000 : 9000;
      navigator.geolocation.getCurrentPosition(
        () => finish(true),
        () => finish(false),
        options
      );
      setTimeout(() => finish(false), fallbackTimeout);
    });
  };

  const requestNotifications = async (): Promise<boolean> => {
    if (isNativePush()) {
      const token = await getPushToken();
      return !!token;
    }
    try {
      if (typeof Notification === "undefined") return false;
      if (Notification.permission === "granted") return true;
      if (Notification.permission === "denied") return false;
      const result = await Promise.race<NotificationPermission | "timeout">([
        Notification.requestPermission(),
        new Promise<"timeout">((r) => setTimeout(() => r("timeout"), 8000)),
      ]);
      return result === "granted";
    } catch {
      return false;
    }
  };

  const handleAllowAll = async () => {
    console.log("[PermissionsScreen] Activar todo / Reintentar presionado");
    const isRetryAttempt = locationFailed && isIOS;
    setLoading(true);
    setLocationFailed(false);
    setShowIOSTip(false);
    setShowIOSRetryTip(false);
    let bothGranted = false;
    try {
      const locGranted = await requestLocation(isRetryAttempt);
      console.log("[PermissionsScreen] Ubicación:", locGranted);
      if (!locGranted) {
        setLocationFailed(true);
        if (isIOS) {
          if (isRetryAttempt) {
            setShowIOSRetryTip(true);
          } else {
            setShowIOSTip(true);
          }
        }
      }
      const notifGranted = await requestNotifications();
      console.log("[PermissionsScreen] Notificaciones:", notifGranted);
      bothGranted = locGranted && notifGranted;
      if (notifGranted && user) {
        try {
          const playerId = isNativePush()
            ? await getPushToken()
            : await Promise.race<string | null>([
                subscribeToPush(),
                new Promise<null>((r) => setTimeout(() => r(null), 8000)),
              ]);
          if (playerId) {
            const role = (user.user_metadata as any)?.rol;
            if (role === "conductor") {
              await supabase
                .from("conductores")
                .update({ onesignal_player_id: playerId })
                .eq("usuario_id", user.id);
            }
          }
        } catch (e) {
          console.warn("Push subscribe failed:", e);
        }
      }
    } catch (e) {
      console.warn("Permissions flow error:", e);
    } finally {
      setLoading(false);
      if (bothGranted) {
        onDone();
      } else {
        console.warn("[PermissionsScreen] Faltan permisos, no se continúa");
      }
    }
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
                Para que el conductor pueda encontrarte y para navegar durante el viaje.
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
                Para recibir alertas de viajes en tiempo real.
              </p>
            </div>
          </div>
        </div>

        {locationFailed && (
          <div className="space-y-3">
            <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 text-left">
              <p className="text-sm font-semibold text-destructive">
                No pudimos acceder a tu ubicación
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Activa la ubicación del navegador y vuelve a intentarlo.
              </p>
            </div>

            {showIOSTip && (
              <div className="bg-accent/10 border border-accent/30 rounded-2xl p-4 text-left space-y-3">
                <p className="text-sm text-foreground">
                  📱 En iPhone: después de activar la ubicación en Configuración → Safari → Ubicación,
                  debes recargar esta página.
                </p>
                <Button
                  variant="heroOutline"
                  size="lg"
                  className="w-full rounded-xl"
                  onClick={() => window.location.reload()}
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4" />
                  🔄 Recargar
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2 pt-2">
          <Button
            variant="hero"
            size="lg"
            className="w-full rounded-xl"
            onClick={handleAllowAll}
            disabled={loading}
          >
            {loading ? "Solicitando..." : locationFailed ? "Reintentar ubicación" : "Activar todo"}
          </Button>
          {locationFailed && (
            <Button
              variant="heroOutline"
              size="lg"
              className="w-full rounded-xl"
              onClick={handleAllowAll}
              disabled={loading}
            >
              Ya activé mi ubicación
            </Button>
          )}
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
