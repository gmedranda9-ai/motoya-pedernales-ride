import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  id: string;
  viaje_id: string;
  remitente_id: string;
  texto: string;
  hora: string;
}

/**
 * Realtime chat for a given ride (viaje).
 * - Loads existing messages
 * - Subscribes to new INSERTs filtered by viaje_id
 * - Exposes sendMessage(text)
 */
export function useRideChat(viajeId: string | null | undefined, userId: string | null | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // Initial load
  useEffect(() => {
    if (!viajeId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("mensajes")
        .select("*")
        .eq("viaje_id", viajeId)
        .order("hora", { ascending: true });
      if (!cancelled) {
        if (error) {
          console.error("Error cargando mensajes:", error);
          setMessages([]);
        } else {
          setMessages((data as ChatMessage[]) || []);
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viajeId]);

  // Realtime subscription
  useEffect(() => {
    if (!viajeId) return;
    const channel = supabase
      .channel(`mensajes-viaje-${viajeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mensajes",
          filter: `viaje_id=eq.${viajeId}`,
        },
        (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [viajeId]);

  const sendMessage = useCallback(
    async (texto: string) => {
      const clean = texto.trim();
      if (!clean || !viajeId || !userId) return { error: "missing-data" as const };
      const { error } = await supabase.from("mensajes").insert({
        viaje_id: viajeId,
        remitente_id: userId,
        texto: clean.slice(0, 1000),
        hora: new Date().toISOString(),
      });
      if (error) {
        console.error("Error enviando mensaje:", error);
        return { error: error.message };
      }
      return { error: null };
    },
    [viajeId, userId]
  );

  return { messages, loading, sendMessage };
}
