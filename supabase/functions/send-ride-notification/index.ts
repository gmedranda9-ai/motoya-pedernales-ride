// Edge function: send a push notification to either:
//  - a Capacitor (native) device via Firebase Cloud Messaging HTTP v1, or
//  - a web browser via OneSignal,
// based on the shape of the stored token in `onesignal_player_id`.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ONESIGNAL_APP_ID = "205503f2-6063-40cb-9f36-07c46f559c18";
const BASE_URL = "https://motoya.mkposeidon.com";

// ---------- helpers ----------

// OneSignal player IDs are UUIDs. FCM tokens are long opaque strings (often >100 chars, may contain ':').
const isFcmToken = (t: string): boolean => {
  if (!t) return false;
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRe.test(t)) return false;
  return t.length > 60;
};

// Base64url encode (no padding)
const b64url = (input: string | Uint8Array): string => {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let s = btoa(String.fromCharCode(...bytes));
  return s.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
};

// Convert PEM private key string to CryptoKey for RS256 signing.
const importServiceAccountKey = async (pem: string): Promise<CryptoKey> => {
  const cleaned = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
};

let cachedAccessToken: { token: string; exp: number } | null = null;

const getFirebaseAccessToken = async (
  serviceAccount: { client_email: string; private_key: string; token_uri?: string },
): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.exp - 60 > now) {
    return cachedAccessToken.token;
  }
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: serviceAccount.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const key = await importServiceAccountKey(serviceAccount.private_key);
  const sig = new Uint8Array(
    await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned)),
  );
  const jwt = `${unsigned}.${b64url(sig)}`;

  const res = await fetch(serviceAccount.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Firebase token error: ${res.status} ${JSON.stringify(data)}`);
  }
  cachedAccessToken = { token: data.access_token, exp: now + (data.expires_in ?? 3600) };
  return data.access_token;
};

const sendViaFcm = async (
  token: string,
  heading: string,
  content: string,
  url: string,
) => {
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON not configured");
  let sa: any;
  try {
    sa = JSON.parse(raw);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON");
  }
  if (!sa.project_id || !sa.client_email || !sa.private_key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON missing required fields");
  }
  const accessToken = await getFirebaseAccessToken(sa);

  const message = {
    message: {
      token,
      notification: { title: heading, body: content },
      data: { url },
      android: {
        priority: "HIGH",
        notification: {
          sound: "default",
          channel_id: "motoya_default",
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
    },
  };

  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    },
  );
  const data = await res.json();
  console.log("📨 Respuesta FCM:", res.status, data);
  if (!res.ok) {
    throw new Error(`FCM error ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
};

const sendViaOneSignal = async (
  player_id: string,
  heading: string,
  content: string,
  url: string,
) => {
  const apiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
  if (!apiKey) throw new Error("ONESIGNAL_REST_API_KEY not configured");
  const payload = {
    app_id: ONESIGNAL_APP_ID,
    include_player_ids: [player_id],
    headings: { en: heading, es: heading },
    contents: { en: content, es: content },
    url,
  };
  const res = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  console.log("📨 Respuesta OneSignal:", res.status, data);
  if (!res.ok) {
    throw new Error(`OneSignal error ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
};

// ---------- handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    let { player_id, conductor_id, passenger_name, destination, cost, url, titulo, mensaje } = body ?? {};
    console.log("📥 Payload recibido:", { player_id, conductor_id, passenger_name, destination, cost, url, titulo, mensaje });

    // Resolve player_id from conductor_id when missing
    if (!player_id && conductor_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && serviceKey) {
        const sb = createClient(supabaseUrl, serviceKey);
        const { data, error } = await sb
          .from("conductores")
          .select("onesignal_player_id")
          .eq("id", conductor_id)
          .maybeSingle();
        if (error) console.warn("⚠️ Error consultando conductor:", error.message);
        player_id = (data as any)?.onesignal_player_id;
        console.log("🔎 player_id resuelto desde conductor_id:", player_id);
      }
    }

    if (!player_id || typeof player_id !== "string") {
      console.warn("⚠️ player_id ausente; no se envía push.");
      return new Response(
        JSON.stringify({ error: "player_id is required (or conductor must have onesignal_player_id)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const safeName = (passenger_name || "Un pasajero").toString().slice(0, 60);
    const safeDest = (destination || "tu zona").toString().slice(0, 80);

    const heading = (titulo && typeof titulo === "string" ? titulo : "🛺 ¡Carrera disponible!").slice(0, 80);
    const content = (mensaje && typeof mensaje === "string"
      ? mensaje
      : `${safeName} necesita una carrera urgente hacia ${safeDest}`).slice(0, 180);

    let finalUrl = url || "/?accion=solicitud";
    if (typeof finalUrl === "string" && finalUrl.startsWith("/")) {
      finalUrl = BASE_URL + finalUrl;
    }

    const useFcm = isFcmToken(player_id);
    console.log(`📤 Enviando vía ${useFcm ? "FCM" : "OneSignal"} a ${player_id.slice(0, 16)}...`);

    const data = useFcm
      ? await sendViaFcm(player_id, heading, content, finalUrl)
      : await sendViaOneSignal(player_id, heading, content, finalUrl);

    return new Response(JSON.stringify({ success: true, channel: useFcm ? "fcm" : "onesignal", data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-ride-notification error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
