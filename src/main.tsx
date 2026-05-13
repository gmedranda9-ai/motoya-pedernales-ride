import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPushNotifications } from "./lib/pushNotifications";

// Initialize OneSignal native SDK on Capacitor (no-op on web).
initPushNotifications().catch((e) => console.warn("initPushNotifications:", e));

createRoot(document.getElementById("root")!).render(<App />);
