import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import { Clock, Loader2, MapPin } from "lucide-react";
import { useBackButton } from "@/hooks/useBackButton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Trip {
  id: string;
  destino: string | null;
  origen: string | null;
  estado: string | null;
  costo_tipo: string | null;
  created_at: string;
  pasajero_id: string;
  conductor_id: string | null;
  otherName?: string;
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Hoy, ${time}`;
  if (isYesterday) return `Ayer, ${time}`;
  return `${d.toLocaleDateString("es-EC", { day: "2-digit", month: "short" })}, ${time}`;
};

const estadoLabel: Record<string, { label: string; cls: string }> = {
  completado: { label: "Finalizado ✅", cls: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]" },
  cancelado: { label: "Cancelado ❌", cls: "bg-destructive/15 text-destructive" },
  pendiente: { label: "En curso 🏍️", cls: "bg-accent/20 text-accent-foreground" },
  aceptado: { label: "En curso 🏍️", cls: "bg-accent/20 text-accent-foreground" },
  en_camino: { label: "En curso 🏍️", cls: "bg-accent text-accent-foreground" },
  en_viaje: { label: "En curso 🏍️", cls: "bg-accent text-accent-foreground" },
};

const costLabel = (tipo: string | null) => {
  if (tipo === "city") return "$1.00";
  if (tipo === "out") return "A convenir";
  return "—";
};

const Viajes = () => {
  useBackButton();
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
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

      const query = supabase
        .from("viajes")
        .select("id, destino, origen, estado, costo_tipo, created_at, pasajero_id, conductor_id")
        .order("created_at", { ascending: false })
        .limit(50);

      const { data, error } =
        role === "conductor" && conductorId
          ? await query.eq("conductor_id", conductorId)
          : await query.eq("pasajero_id", user.id);

      if (error || !data) {
        setTrips([]);
        setLoading(false);
        return;
      }

      // Fetch counterpart names
      const otherIds = Array.from(
        new Set(
          data
            .map((t: any) => (role === "conductor" ? t.pasajero_id : t.conductor_id))
            .filter(Boolean)
        )
      );
      const nameMap: Record<string, string> = {};
      if (role === "conductor" && otherIds.length) {
        const { data: us } = await supabase
          .from("usuarios")
          .select("id, nombre")
          .in("id", otherIds);
        (us || []).forEach((u: any) => (nameMap[u.id] = u.nombre || "Pasajero"));
      } else if (role === "pasajero" && otherIds.length) {
        const { data: cs } = await supabase
          .from("conductores")
          .select("id, usuario_id")
          .in("id", otherIds);
        const usuarioIds = (cs || []).map((c: any) => c.usuario_id).filter(Boolean);
        const condToUser: Record<string, string> = {};
        (cs || []).forEach((c: any) => (condToUser[c.id] = c.usuario_id));
        if (usuarioIds.length) {
          const { data: us } = await supabase
            .from("usuarios")
            .select("id, nombre")
            .in("id", usuarioIds);
          const userNames: Record<string, string> = {};
          (us || []).forEach((u: any) => (userNames[u.id] = u.nombre || "Conductor"));
          Object.entries(condToUser).forEach(([cid, uid]) => {
            nameMap[cid] = userNames[uid] || "Conductor";
          });
        }
      }

      setTrips(
        (data as any[]).map((t) => ({
          ...t,
          otherName: nameMap[role === "conductor" ? t.pasajero_id : t.conductor_id] || "—",
        }))
      );
      setLoading(false);
    };
    load();
  }, [user, role]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="gradient-primary px-4 pt-12 pb-6">
        <h1 className="text-xl font-extrabold text-accent">Mis Viajes</h1>
        <p className="text-xs text-primary-foreground/70 mt-1">
          {role === "conductor" ? "Historial como conductor" : "Historial de recorridos"}
        </p>
      </header>

      <div className="mx-4 mt-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 text-accent animate-spin" />
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">Aún no tienes viajes</p>
          </div>
        ) : (
          trips.map((trip) => {
            const est = estadoLabel[trip.estado || ""] || {
              label: trip.estado || "—",
              cls: "bg-muted text-muted-foreground",
            };
            return (
              <div key={trip.id} className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {trip.otherName}
                  </span>
                  <span className="text-sm font-bold text-accent">{costLabel(trip.costo_tipo)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(trip.created_at)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                  <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-accent" />
                  <span className="truncate">
                    {trip.origen || "—"} → {trip.destino || "—"}
                  </span>
                </p>
                <div className="mt-2">
                  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${est.cls}`}>
                    {est.label}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Viajes;
