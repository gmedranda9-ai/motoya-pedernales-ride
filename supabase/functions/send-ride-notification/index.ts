// Edge function: send a OneSignal push to a driver when a passenger requests a ride
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
      return new Response(
        JSON.stringify({ error: "ONESIGNAL_REST_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const { player_id, passenger_name, destination, cost } = body ?? {};

    if (!player_id || typeof player_id !== "string") {
      return new Response(
        JSON.stringify({ error: "player_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const safeName = (passenger_name || "Un pasajero").toString().slice(0, 60);
    const safeDest = (destination || "tu zona").toString().slice(0, 80);
    const safeCost = cost ? `$${cost}` : "$1.00";

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: [player_id],
      headings: { en: "¡Nueva solicitud!", es: "¡Nueva solicitud!" },
      contents: {
        en: `${safeName} quiere ir a ${safeDest} - ${safeCost}`,
        es: `${safeName} quiere ir a ${safeDest} - ${safeCost}`,
      },
      url: req.headers.get("origin") || undefined,
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
    if (!res.ok) {
      console.error("OneSignal error:", res.status, data);
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
