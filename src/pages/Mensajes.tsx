import { useEffect, useMemo, useRef, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { Loader2, ArrowLeft } from "lucide-react";
import { useBackHandler } from "@/hooks/useBackButton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";


interface Conversation {
  viajeIds: string[];
  otherKey: string;
  otherName: string;
  lastMsg: string;
  time: string;
  iso: string;
  unread: number;
}

interface ChatMessage {
  id: string;
  viaje_id: string;
  remitente_id: string;
  texto: string;
  hora: string;
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

const toTitleCase = (raw: string) =>
  (raw || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const initialOf = (name: string) => (name?.trim()?.[0] || "?").toUpperCase();
const readKey = (viajeId: string, userId: string) => `chat:lastRead:${userId}:${viajeId}`;

const Avatar = ({ name }: { name: string }) => (
  <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center shrink-0">
    <span className="text-base font-bold text-accent">{initialOf(name)}</span>
  </div>
);

const ChatPanel = ({
  viajeIds,
  otherName,
  onClose,
}: {
  viajeIds: string[];
  otherName: string;
  onClose: () => void;
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Device back button closes the chat overlay.
  useBackHandler(true, onClose);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      if (!viajeIds.length) {
        setMessages([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("mensajes")
        .select("id, viaje_id, remitente_id, texto, hora")
        .in("viaje_id", viajeIds)
        .order("hora", { ascending: true });
      if (!cancelled) {
        setMessages((data as ChatMessage[]) || []);
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [viajeIds]);

  useEffect(() => {
    if (!viajeIds.length) return;
    const channel = supabase
      .channel(`chat-multi-${viajeIds[0]}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensajes" },
        (payload: any) => {
          const m = payload.new as ChatMessage;
          if (viajeIds.includes(m.viaje_id)) {
            setMessages((prev) => [...prev, m]);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [viajeIds]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    if (user?.id && messages.length) {
      try {
        viajeIds.forEach((vid) =>
          localStorage.setItem(readKey(vid, user.id), new Date().toISOString())
        );
      } catch {}
    }
  }, [messages, viajeIds, user?.id]);

  const grouped = useMemo(() => {
    const out: { viajeId: string; date: string; items: ChatMessage[] }[] = [];
    let currentVid = "";
    messages.forEach((m) => {
      const date = new Date(m.hora).toLocaleDateString("es-EC", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
      if (m.viaje_id !== currentVid) {
        out.push({ viajeId: m.viaje_id, date, items: [m] });
        currentVid = m.viaje_id;
      } else {
        out[out.length - 1].items.push(m);
      }
    });
    return out;
  }, [messages]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <header className="gradient-primary px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={onClose} className="text-accent" aria-label="Volver">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar name={otherName} />
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-accent truncate">{otherName}</h2>
          <p className="text-[10px] text-primary-foreground/70">
            Historial · {viajeIds.length} {viajeIds.length === 1 ? "viaje" : "viajes"}
          </p>
        </div>
      </header>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 text-accent animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Sin mensajes aún</p>
        ) : (
          grouped.map((g, idx) => (
            <div key={`${g.viajeId}-${idx}`} className="space-y-2">
              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                  Viaje · {g.date}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
              {g.items.map((m) => {
                const mine = m.remitente_id === user?.id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                        mine
                          ? "bg-accent text-accent-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      <p className="break-words">{m.texto}</p>
                      <p className={`text-[10px] mt-0.5 ${mine ? "text-accent-foreground/70" : "text-muted-foreground"}`}>
                        {new Date(m.hora).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
      <div className="border-t border-border bg-card p-3 text-center">
        <p className="text-[11px] text-muted-foreground">Solo lectura · Historial completo</p>
      </div>
    </div>
  );
};

const Mensajes = () => {
  // Back button on the conversation list opens the global exit dialog (main route).
  const { user } = useAuth();
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [openChat, setOpenChat] = useState<{ viajeIds: string[]; name: string } | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const role: "pasajero" | "conductor" = useMemo(
    () => ((user?.user_metadata?.rol as any) === "conductor" ? "conductor" : "pasajero"),
    [user]
  );

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
        .select("id, pasajero_id, conductor_id, created_at, pasajero_nombre")
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
        .select("viaje_id, texto, hora, remitente_id")
        .in("viaje_id", viajeIds)
        .order("hora", { ascending: false });

      const lastByViaje: Record<string, { texto: string; hora: string }> = {};
      const unreadByViaje: Record<string, number> = {};
      (msgs || []).forEach((m: any) => {
        if (!lastByViaje[m.viaje_id]) lastByViaje[m.viaje_id] = { texto: m.texto, hora: m.hora };
        if (m.remitente_id !== user.id) {
          let lastRead = 0;
          try {
            const v = localStorage.getItem(readKey(m.viaje_id, user.id));
            lastRead = v ? new Date(v).getTime() : 0;
          } catch {}
          if (new Date(m.hora).getTime() > lastRead) {
            unreadByViaje[m.viaje_id] = (unreadByViaje[m.viaje_id] || 0) + 1;
          }
        }
      });

      const otherIds = Array.from(
        new Set(
          viajes
            .map((v: any) => (role === "conductor" ? v.pasajero_id : v.conductor_id))
            .filter(Boolean)
        )
      );
      const nameMap: Record<string, string> = {};
      if (role === "conductor") {
        // Prefer denormalized pasajero_nombre on viaje
        (viajes as any[]).forEach((v) => {
          if (v.pasajero_id && v.pasajero_nombre) {
            nameMap[v.pasajero_id] = toTitleCase(v.pasajero_nombre);
          }
        });
        const missing = otherIds.filter((id) => !nameMap[id as string]);
        if (missing.length) {
          const { data: us } = await supabase.from("usuarios").select("id, nombre").in("id", missing);
          (us || []).forEach((u: any) => (nameMap[u.id] = toTitleCase(u.nombre || "Pasajero")));
        }
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
          (us || []).forEach((u: any) => (un[u.id] = toTitleCase(u.nombre || "Conductor")));
          Object.entries(condToUser).forEach(([cid, uid]) => (nameMap[cid] = un[uid] || "Conductor"));
        }
      }

      // Group by other party — accumulate ALL viajeIds with that party (full historial)
      const grouped: Record<string, Conversation> = {};
      (viajes as any[]).forEach((v) => {
        const otherKey = role === "conductor" ? v.pasajero_id : v.conductor_id;
        if (!otherKey) return;
        const last = lastByViaje[v.id];
        const unreadForThis = unreadByViaje[v.id] || 0;
        const existing = grouped[otherKey];
        if (!existing) {
          grouped[otherKey] = {
            viajeIds: [v.id],
            otherKey,
            otherName: nameMap[otherKey] || "—",
            lastMsg: last?.texto || "",
            time: last ? formatTime(last.hora) : "",
            iso: last?.hora || "",
            unread: unreadForThis,
          };
        } else {
          existing.viajeIds.push(v.id);
          existing.unread += unreadForThis;
          if (last && (!existing.iso || existing.iso < last.hora)) {
            existing.lastMsg = last.texto;
            existing.time = formatTime(last.hora);
            existing.iso = last.hora;
          }
        }
      });

      // Solo mostrar conversaciones que tienen al menos un mensaje
      Object.keys(grouped).forEach((k) => {
        if (!grouped[k].iso) delete grouped[k];
      });

      const list: Conversation[] = Object.values(grouped).sort((a, b) =>
        a.iso < b.iso ? 1 : -1
      );

      setConvos(list);
      setLoading(false);
    };
    load();
  }, [user, role, refreshTick]);

  // Realtime: refresh list when any new message arrives
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`mensajes-list-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensajes" },
        () => setRefreshTick((t) => t + 1)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="gradient-primary px-4 pt-12 pb-6">
        <h1 className="text-xl font-extrabold text-accent">Historial de conversaciones</h1>
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
          <div className="text-center py-12 px-4">
            <p className="text-base font-semibold text-foreground">Sin conversaciones aún 💬</p>
            <p className="text-xs text-muted-foreground mt-1">
              Tus conversaciones de viaje aparecerán aquí
            </p>
          </div>
        ) : (
          convos.map((chat) => (
            <button
              key={chat.otherKey}
              onClick={() => {
                setOpenChat({ viajeIds: chat.viajeIds, name: chat.otherName });
                if (user?.id) {
                  try {
                    chat.viajeIds.forEach((vid) =>
                      localStorage.setItem(readKey(vid, user.id), new Date().toISOString())
                    );
                  } catch {}
                }
              }}
              className="flex items-center gap-3 w-full bg-card rounded-xl p-3 border border-border text-left hover:bg-muted/40 transition-colors"
            >
              <Avatar name={chat.otherName} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {chat.otherName}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {chat.time}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className={`text-xs truncate ${chat.unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {chat.lastMsg}
                  </p>
                  {chat.unread > 0 && (
                    <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center">
                      {chat.unread > 9 ? "9+" : chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {openChat && (
        <ChatPanel
          viajeIds={openChat.viajeIds}
          otherName={openChat.name}
          onClose={() => {
            setOpenChat(null);
            setRefreshTick((t) => t + 1);
          }}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default Mensajes;
