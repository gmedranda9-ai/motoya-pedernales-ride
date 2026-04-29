// Edge function: send a OneSignal push to a driver when a passenger requests a ride
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ONESIGNAL_APP_ID = "205503f2-6063-40cb-9f36-07c46f559c18";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");
    if (!apiKey) {
      console.error("❌ ONESIGNAL_REST_API_KEY no configurada");
      return new Response(
        JSON.stringify({ error: "ONESIGNAL_REST_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    let { player_id, conductor_id, passenger_name, destination, cost, url, titulo, mensaje } = body ?? {};
    console.log("📥 Payload recibido:", { player_id, conductor_id, passenger_name, destination, cost, url, titulo, mensaje });

    // Fallback: resolve player_id from conductor_id via Supabase
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

    const BASE_URL = "https://motoya.mkposeidon.com";
    let finalUrl = url || "/?accion=solicitud";
    if (typeof finalUrl === "string" && finalUrl.startsWith("/")) {
      finalUrl = BASE_URL + finalUrl;
    }

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: [player_id],
      headings: { en: heading, es: heading },
      contents: { en: content, es: content },
      url: finalUrl,
    };

    console.log("📤 Enviando a OneSignal:", { player_id, contents: payload.contents });

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
      console.error("❌ OneSignal error:", res.status, data);
      return new Response(
        JSON.stringify({ error: "OneSignal API error", details: data }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ success: true, data }), {
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
