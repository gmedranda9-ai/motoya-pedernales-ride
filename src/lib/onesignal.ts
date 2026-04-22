// OneSignal helper utilities
// SDK is loaded in index.html via OneSignalDeferred

declare global {
  interface Window {
    OneSignalDeferred?: any[];
    OneSignal?: any;
  }
}

const waitForOneSignal = (): Promise<any> => {
  return new Promise((resolve) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push((OneSignal: any) => resolve(OneSignal));
  });
};

const logServiceWorkers = async () => {
  try {
    if (!("serviceWorker" in navigator)) {
      console.warn("⚠️ navigator.serviceWorker no soportado en este navegador");
      return;
    }
    const regs = await navigator.serviceWorker.getRegistrations();
    console.log("🛠️ Service Workers registrados:", regs.length, regs);
    regs.forEach((r, i) => {
      console.log(`  SW[${i}] scope=${r.scope} active=${!!r.active} script=${r.active?.scriptURL}`);
    });
  } catch (e) {
    console.warn("No se pudieron leer los Service Workers:", e);
  }
};

/**
 * Asks the user permission for push notifications and returns the OneSignal Player ID.
 * Returns null if the user denies, the browser doesn't support it, or anything fails.
 */
export const subscribeToPush = async (): Promise<string | null> => {
  console.log("🔔 Iniciando suscripción OneSignal...");
  try {
    const OneSignal = await waitForOneSignal();
    console.log("✅ OneSignal SDK cargado");

    // Verify Service Worker is registered BEFORE subscribing
    await logServiceWorkers();

    try {
      const perm = OneSignal?.Notifications?.permission;
      console.log("🔐 Permission previa:", perm);
    } catch {}

    // Try to request permission (no-op if already granted)
    try {
      await OneSignal.Notifications.requestPermission();
      console.log("🔐 requestPermission OK");
    } catch (e) {
      console.warn("OneSignal requestPermission error:", e);
    }

    // Opt user in to push (some browsers require this explicit step)
    try {
      await OneSignal.User.PushSubscription.optIn();
      console.log("📥 optIn ejecutado");
    } catch (e) {
      console.warn("OneSignal optIn error:", e);
    }

    try {
      const userId = OneSignal?.User?.onesignalId;
      console.log("👤 OneSignal userId:", userId);
    } catch {}

    // Poll for an ID for a few seconds (subscription is async on first opt-in)
    for (let i = 0; i < 30; i++) {
      const sub = OneSignal?.User?.PushSubscription;
      const id = sub?.id;
      const token = sub?.token;
      const optedIn = sub?.optedIn;
      if (i === 0 || i % 5 === 0) {
        console.log(`⏳ Poll[${i}] subscriptionId=${id} optedIn=${optedIn} token=${token ? "present" : "null"}`);
      }
      if (id) {
        console.log("🎯 Player ID obtenido:", id);
        await logServiceWorkers();
        return id as string;
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    console.error("❌ No se obtuvo Player ID después de 9s");
    await logServiceWorkers();
    return null;
  } catch (err) {
    console.error("❌ subscribeToPush failed:", err);
    return null;
  }
};

export const unsubscribeFromPush = async (): Promise<void> => {
  try {
    const OneSignal = await waitForOneSignal();
    await OneSignal.User.PushSubscription.optOut();
    console.log("📤 OneSignal optOut ejecutado");
  } catch (err) {
    console.error("unsubscribeFromPush failed:", err);
  }
};
