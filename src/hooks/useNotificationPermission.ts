import { useEffect, useState, useCallback } from "react";

type PermState = "granted" | "denied" | "default" | "unsupported";

const read = (): PermState => {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission as PermState;
};

/**
 * Reactive hook that tracks the browser Notification permission.
 * Updates on tab focus / visibility change so toggling permissions
 * in OS settings is reflected without a manual reload.
 */
export const useNotificationPermission = () => {
  const [permission, setPermission] = useState<PermState>(read);

  const refresh = useCallback(() => setPermission(read()), []);

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
    if (typeof Notification === "undefined") return "unsupported";
    if (Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        // ignore
      }
    }
    const next = read();
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
