import { useEffect, useRef, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { MessageSquare, Loader2, Send, X } from "lucide-react";
import { useBackButton } from "@/hooks/useBackButton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useRideChat } from "@/hooks/useRideChat";

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

const ChatPanel = ({
  viajeId,
  otherName,
  onClose,
}: {
  viajeId: string;
  otherName: string;
  onClose: () => void;
}) => {
  const { user } = useAuth();
  const { messages, sendMessage, loading } = useRideChat(viajeId, user?.id);
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const t = text;
    setText("");
    await sendMessage(t);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <header className="gradient-primary px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={onClose} className="text-accent" aria-label="Cerrar">
          <X className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-base font-bold text-accent">{otherName}</h2>
          <p className="text-[10px] text-primary-foreground/70">Chat del viaje</p>
        </div>
      </header>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 text-accent animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Sin mensajes aún 💬</p>
        ) : (
          messages.map((m) => {
            const mine = m.remitente_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                    mine
                      ? "bg-accent text-accent-foreground rounded-br-sm"
                      : "bg-card border border-border text-foreground rounded-bl-sm"
                  }`}
                >
                  <p className="break-words">{m.texto}</p>
                  <p className={`text-[10px] mt-0.5 ${mine ? "text-accent-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(m.hora).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="border-t border-border bg-card p-3 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Escribe un mensaje..."
          className="flex-1 bg-background border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          onClick={handleSend}
          className="w-10 h-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center disabled:opacity-50"
          disabled={!text.trim()}
          aria-label="Enviar"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const Mensajes = () => {
  useBackButton();
  const { user } = useAuth();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [openChat, setOpenChat] = useState<{ viajeId: string; name: string } | null>(null);
  const role: "pasajero" | "conductor" =
    (user?.user_metadata?.rol as any) === "conductor" ? "conductor" : "pasajero";

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);

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
        .limit(50);

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
          <p className="text-sm text-muted-foreground text-center py-12">Sin mensajes aún 💬</p>
        ) : (
          convos.map((chat) => (
            <button
              key={chat.viaje_id}
              onClick={() => setOpenChat({ viajeId: chat.viaje_id, name: chat.otherName })}
              className="flex items-center gap-3 w-full bg-card rounded-xl p-4 border border-border text-left hover:bg-muted/40 transition-colors"
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
            </button>
          ))
        )}
      </div>

      {openChat && (
        <ChatPanel
          viajeId={openChat.viajeId}
          otherName={openChat.name}
          onClose={() => setOpenChat(null)}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default Mensajes;
