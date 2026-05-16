// Unified push registration:
// - Native (Capacitor) → OneSignal Cordova plugin (FCM/APNs token via OneSignal)
// - Web → OneSignal Web SDK (player id)
import { Capacitor } from "@capacitor/core";

import { subscribeToPush } from "./onesignal";

const ONESIGNAL_APP_ID = "205503f2-6063-40cb-9f36-07c46f559c18";

export const isNativePush = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

let nativeInitPromise: Promise<any> | null = null;

const getNativeOneSignal = async (): Promise<any | null> => {
  if (!isNativePush()) return null;
  try {
    const mod: any = await import("onesignal-cordova-plugin");
    const OneSignal = mod?.default ?? mod;
    if (!OneSignal) return null;
    if (!nativeInitPromise) {
      nativeInitPromise = (async () => {
        try {
          OneSignal.initialize(ONESIGNAL_APP_ID);
          console.log("✅ OneSignal nativo inicializado");
        } catch (e) {
          console.warn("OneSignal initialize error:", e);
        }
      })();
    }
    await nativeInitPromise;
    return OneSignal;
  } catch (e) {
    console.warn("OneSignal native plugin no disponible:", e);
    return null;
  }
};

/** Initialize OneSignal on native at app startup (no-op on web). */
export const initPushNotifications = async (): Promise<void> => {
  const OneSignal = await getNativeOneSignal();
  if (!OneSignal) return;
  // Navigate to home when user taps a push notification
  try {
    OneSignal.Notifications.addEventListener("click", (event: any) => {
      console.log("🔔 Notificación tocada:", event);
      window.location.href = "/";
    });
  } catch (e) {
    console.warn("OneSignal click listener error:", e);
  }
};

/**
 * Request native push permission via OneSignal and return the subscription token.
 * Returns null on denial or error.
 */
export const registerNativePush = async (): Promise<string | null> => {
  const OneSignal = await getNativeOneSignal();
  if (!OneSignal) return null;
  try {
    const granted = await OneSignal.Notifications.requestPermission(true);
    if (!granted) {
      console.warn("⚠️ Permiso OneSignal nativo no concedido");
      return null;
    }
    // The subscription id/token may take a moment to be available after first opt-in.
    for (let i = 0; i < 30; i++) {
      try {
        const sub = OneSignal?.User?.pushSubscription;
        const token: string | undefined = sub?.token ?? sub?.id;
        if (token) {
          console.log("🎯 OneSignal token nativo:", token);
          return token;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 300));
    }
    console.error("❌ No se obtuvo token OneSignal nativo");
    return null;
  } catch (e) {
    console.error("registerNativePush failed:", e);
    return null;
  }
};

/**
 * Get a push token for the current platform.
 * - Native: OneSignal subscription token
 * - Web:    OneSignal player id
 */
export const getPushToken = async (): Promise<string | null> => {
  if (isNativePush()) return registerNativePush();
  return subscribeToPush();
};
