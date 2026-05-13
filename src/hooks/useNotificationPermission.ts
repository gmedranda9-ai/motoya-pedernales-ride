import { useEffect, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";

type PermState = "granted" | "denied" | "default" | "unsupported";

const isNative = (): boolean => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
};

const readWeb = (): PermState => {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission as PermState;
};

let cachedOneSignal: any | null = null;
const getOneSignal = async (): Promise<any | null> => {
  if (cachedOneSignal) return cachedOneSignal;
  try {
    const mod: any = await import("onesignal-cordova-plugin");
    cachedOneSignal = mod?.default ?? mod;
    return cachedOneSignal;
  } catch {
    return null;
  }
};

const readNative = async (): Promise<PermState> => {
  try {
    const OneSignal = await getOneSignal();
    if (!OneSignal) return "unsupported";
    const has = await OneSignal.Notifications.getPermissionAsync?.()
      ?? OneSignal.Notifications.hasPermission?.();
    return has ? "granted" : "default";
  } catch {
    return "unsupported";
  }
};

/**
 * Reactive hook that tracks the push notification permission.
 * Native (Capacitor) → OneSignal Cordova plugin
 * Web → Notification API
 */
export const useNotificationPermission = () => {
  const [permission, setPermission] = useState<PermState>(() =>
    isNative() ? "default" : readWeb()
  );

  const refresh = useCallback(async () => {
    if (isNative()) {
      setPermission(await readNative());
    } else {
      setPermission(readWeb());
    }
  }, []);

  useEffect(() => {
    refresh();
    const onVis = () => refresh();
    const onFocus = () => refresh();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const request = useCallback(async (): Promise<PermState> => {
    if (isNative()) {
      try {
        const OneSignal = await getOneSignal();
        if (!OneSignal) {
          setPermission("unsupported");
          return "unsupported";
        }
        const granted: boolean = await OneSignal.Notifications.requestPermission(true);
        const next: PermState = granted ? "granted" : "denied";
        setPermission(next);
        return next;
      } catch (e) {
        console.warn("native requestPermissions failed:", e);
        setPermission("unsupported");
        return "unsupported";
      }
    }
    if (typeof Notification === "undefined") return "unsupported";
    if (Notification.permission === "default") {
      try { await Notification.requestPermission(); } catch {}
    }
    const next = readWeb();
    setPermission(next);
    return next;
  }, []);

  return {
    permission,
    isGranted: permission === "granted",
    isBlocked: permission === "denied",
    isUnsupported: permission === "unsupported",
    refresh,
    request,
  };
};
