// Unified push registration: Capacitor (native) → FCM token; Web → OneSignal player id.
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { subscribeToPush } from "./onesignal";

export const isNativePush = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

/**
 * Register for native push (Android/iOS via Capacitor) and resolve with FCM/APNs token.
 * Returns null on denial or error.
 */
export const registerNativePush = async (): Promise<string | null> => {
  if (!isNativePush()) return null;
  try {
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") {
      console.warn("⚠️ Permiso push nativo no concedido:", perm.receive);
      return null;
    }

    const tokenPromise = new Promise<string | null>((resolve) => {
      let done = false;
      const finish = (val: string | null) => {
        if (done) return;
        done = true;
        resolve(val);
      };

      PushNotifications.addListener("registration", (token) => {
        console.log("✅ FCM/APNs Token:", token.value);
        finish(token.value);
      });
      PushNotifications.addListener("registrationError", (err) => {
        console.error("❌ Error registro push nativo:", err);
        finish(null);
      });

      setTimeout(() => finish(null), 15000);
    });

    await PushNotifications.register();
    return await tokenPromise;
  } catch (e) {
    console.error("registerNativePush failed:", e);
    return null;
  }
};

/**
 * Get a push token for the current platform.
 * - Native: FCM/APNs token
 * - Web: OneSignal player id
 */
export const getPushToken = async (): Promise<string | null> => {
  if (isNativePush()) return registerNativePush();
  return subscribeToPush();
};
