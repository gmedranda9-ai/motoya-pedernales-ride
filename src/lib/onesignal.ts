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

/**
 * Asks the user permission for push notifications and returns the OneSignal Player ID.
 * Returns null if the user denies, the browser doesn't support it, or anything fails.
 */
export const subscribeToPush = async (): Promise<string | null> => {
  try {
    const OneSignal = await waitForOneSignal();

    // Try to request permission (no-op if already granted)
    try {
      await OneSignal.Notifications.requestPermission();
    } catch (e) {
      console.warn("OneSignal requestPermission error:", e);
    }

    // Opt user in to push (some browsers require this explicit step)
    try {
      await OneSignal.User.PushSubscription.optIn();
    } catch (e) {
      console.warn("OneSignal optIn error:", e);
    }

    // Poll for an ID for a few seconds (subscription is async on first opt-in)
    for (let i = 0; i < 20; i++) {
      const id = OneSignal?.User?.PushSubscription?.id;
      if (id) return id as string;
      await new Promise((r) => setTimeout(r, 300));
    }
    return null;
  } catch (err) {
    console.error("subscribeToPush failed:", err);
    return null;
  }
};

export const unsubscribeFromPush = async (): Promise<void> => {
  try {
    const OneSignal = await waitForOneSignal();
    await OneSignal.User.PushSubscription.optOut();
  } catch (err) {
    console.error("unsubscribeFromPush failed:", err);
  }
};
