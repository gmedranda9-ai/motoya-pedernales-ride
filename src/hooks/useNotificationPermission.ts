import { useEffect, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

type PermState = "granted" | "denied" | "default" | "unsupported";

const isNative = (): boolean => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
};

const readWeb = (): PermState => {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission as PermState;
};

const readNative = async (): Promise<PermState> => {
  try {
    const r = await PushNotifications.checkPermissions();
    if (r.receive === "granted") return "granted";
    if (r.receive === "denied") return "denied";
    return "default";
  } catch {
    return "unsupported";
  }
};

/**
 * Reactive hook that tracks the push notification permission.
 * Works for web (Notification API) and native (Capacitor PushNotifications).
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
        const r = await PushNotifications.requestPermissions();
        if (r.receive === "granted") {
          try { await PushNotifications.register(); } catch (e) { console.warn("register failed:", e); }
          setPermission("granted");
          return "granted";
        }
        const next = r.receive === "denied" ? "denied" : "default";
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
