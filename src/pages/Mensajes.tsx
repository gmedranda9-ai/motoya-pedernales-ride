import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { MessageSquare, Loader2 } from "lucide-react";
import { useBackButton } from "@/hooks/useBackButton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Conversation {
  viaje_id: string;
  otherName: string;
  lastMsg: string;
  time: string;
  iso: string;
}

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" });
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-EC", { day: "2-digit", month: "short" });
};

const Mensajes = () => {
  useBackButton();
  const { user } = useAuth();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const role: "pasajero" | "conductor" =
    (user?.user_metadata?.rol as any) === "conductor" ? "conductor" : "pasajero";

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);

      // Find user's viajes
      let conductorId: string | null = null;
      if (role === "conductor") {
        const { data: cond } = await supabase
          .from("conductores")
          .select("id")
          .eq("usuario_id", user.id)
          .maybeSingle();
        conductorId = cond?.id ?? null;
      }

      const tripsQuery = supabase
        .from("viajes")
        .select("id, pasajero_id, conductor_id, created_at")
        .order("created_at", { ascending: false })
        .limit(30);

      const { data: viajes } =
        role === "conductor" && conductorId
          ? await tripsQuery.eq("conductor_id", conductorId)
          : await tripsQuery.eq("pasajero_id", user.id);

      if (!viajes || viajes.length === 0) {
        setConvos([]);
        setLoading(false);
        return;
      }

      const viajeIds = viajes.map((v: any) => v.id);
      const { data: msgs } = await supabase
        .from("mensajes")
        .select("viaje_id, texto, hora")
        .in("viaje_id", viajeIds)
        .order("hora", { ascending: false });

      const lastByViaje: Record<string, { texto: string; hora: string }> = {};
      (msgs || []).forEach((m: any) => {
        if (!lastByViaje[m.viaje_id]) lastByViaje[m.viaje_id] = { texto: m.texto, hora: m.hora };
      });

      // Get counterpart names
      const otherIds = Array.from(
        new Set(
          viajes
            .map((v: any) => (role === "conductor" ? v.pasajero_id : v.conductor_id))
            .filter(Boolean)
        )
      );
      const nameMap: Record<string, string> = {};
      if (role === "conductor" && otherIds.length) {
        const { data: us } = await supabase.from("usuarios").select("id, nombre").in("id", otherIds);
        (us || []).forEach((u: any) => (nameMap[u.id] = u.nombre || "Pasajero"));
      } else if (role === "pasajero" && otherIds.length) {
        const { data: cs } = await supabase
          .from("conductores")
          .select("id, usuario_id")
          .in("id", otherIds);
        const condToUser: Record<string, string> = {};
        (cs || []).forEach((c: any) => (condToUser[c.id] = c.usuario_id));
        const uids = Object.values(condToUser).filter(Boolean);
        if (uids.length) {
          const { data: us } = await supabase.from("usuarios").select("id, nombre").in("id", uids);
          const un: Record<string, string> = {};
          (us || []).forEach((u: any) => (un[u.id] = u.nombre || "Conductor"));
          Object.entries(condToUser).forEach(([cid, uid]) => (nameMap[cid] = un[uid] || "Conductor"));
        }
      }

      const list: Conversation[] = viajes
        .filter((v: any) => lastByViaje[v.id])
        .map((v: any) => {
          const last = lastByViaje[v.id];
          const otherKey = role === "conductor" ? v.pasajero_id : v.conductor_id;
          return {
            viaje_id: v.id,
            otherName: nameMap[otherKey] || "—",
            lastMsg: last.texto,
            time: formatTime(last.hora),
            iso: last.hora,
          };
        })
        .sort((a, b) => (a.iso < b.iso ? 1 : -1));

      setConvos(list);
      setLoading(false);
    };
    load();
  }, [user, role]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="gradient-primary px-4 pt-12 pb-6">
        <h1 className="text-xl font-extrabold text-accent">Mensajes</h1>
        <p className="text-xs text-primary-foreground/70 mt-1">
          {role === "conductor" ? "Chats con pasajeros" : "Chats con conductores"}
        </p>
      </header>

      <div className="mx-4 mt-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 text-accent animate-spin" />
          </div>
        ) : convos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">Sin mensajes aún</p>
        ) : (
          convos.map((chat) => (
            <div
              key={chat.viaje_id}
              className="flex items-center gap-3 w-full bg-card rounded-xl p-4 border border-border"
            >
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shrink-0">
                <MessageSquare className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {chat.otherName}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                    {chat.time}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{chat.lastMsg}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Mensajes;
