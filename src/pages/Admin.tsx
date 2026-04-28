import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle,
  XCircle,
  Shield,
  Loader2,
  Bike,
  Phone,
  CreditCard,
  Route as RouteIcon,
  Users,
  BarChart3,
  DollarSign,
  Calendar,
} from "lucide-react";
import BottomNavAdmin, { AdminTab } from "@/components/BottomNavAdmin";

const ADMIN_EMAIL = "g.medranda9@gmail.com";

const isPlaceholder = (url: string | null | undefined) => {
  if (!url) return true;
  const u = url.toLowerCase();
  return (
    u.includes("placeholder") ||
    u.includes("logo-motoya") ||
    u.endsWith("/placeholder.svg")
  );
};

const toTitleCase = (raw: string) =>
  (raw || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
};

// ─────────────── CONDUCTORES ───────────────
const ConductoresTab = () => {
  const { toast } = useToast();
  const [filter, setFilter] = useState<"pendiente" | "aprobado" | "rechazado">("pendiente");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; nombre: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: conds } = await supabase
      .from("conductores")
      .select("id, usuario_id, foto, foto_cedula, foto_moto, cedula, placa, modelo_moto, color, telefono, estado, created_at")
      .order("created_at", { ascending: false });

    const ids = Array.from(new Set((conds || []).map((c: any) => c.usuario_id).filter(Boolean)));
    const nameMap: Record<string, { nombre: string; email: string }> = {};
    if (ids.length) {
      const { data: us } = await supabase
        .from("usuarios")
        .select("id, nombre, email")
        .in("id", ids);
      (us || []).forEach((u: any) => (nameMap[u.id] = { nombre: u.nombre || "—", email: u.email || "" }));
    }
    setItems(
      (conds || []).map((c: any) => ({
        ...c,
        nombre: toTitleCase(nameMap[c.usuario_id]?.nombre || "Sin nombre"),
        email: nameMap[c.usuario_id]?.email || "",
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter((i) => (i.estado || "pendiente") === filter);

  const updateEstado = async (id: string, estado: "aprobado" | "rechazado", motivo?: string) => {
    setActing(id);
    const payload: any = { estado };
    if (estado === "rechazado") payload.motivo_rechazo = motivo || null;
    if (estado === "aprobado") payload.motivo_rechazo = null;
    const { error } = await supabase.from("conductores").update(payload).eq("id", id);
    setActing(null);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: estado === "aprobado" ? "✅ Conductor aprobado" : "❌ Conductor rechazado" });
    load();
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    const motivo = rejectReason.trim();
    if (!motivo) {
      toast({ title: "Motivo requerido", description: "Escribe el motivo del rechazo.", variant: "destructive" });
      return;
    }
    await updateEstado(rejectTarget.id, "rechazado", motivo);
    setRejectTarget(null);
    setRejectReason("");
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 bg-card rounded-xl p-1 border border-border">
        {([
          { key: "pendiente", label: "Pendientes" },
          { key: "aprobado", label: "Aprobados" },
          { key: "rechazado", label: "Rechazados" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg transition-colors ${
              filter === tab.key ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 text-accent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10">
          No hay conductores en este estado.
        </p>
      ) : (
        filtered.map((c) => {
          const showPhoto = !isPlaceholder(c.foto);
          const showCedula = !isPlaceholder(c.foto_cedula);
          const showMoto = !isPlaceholder(c.foto_moto);
          const initial = (c.nombre || "?").charAt(0).toUpperCase();
          const isPendiente = (c.estado || "pendiente") === "pendiente";

          return (
            <div key={c.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
              {/* Cabecera con estado */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-foreground truncate">{c.nombre}</h3>
                  <p className="text-[11px] text-muted-foreground truncate">{c.email}</p>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${
                    c.estado === "aprobado"
                      ? "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]"
                      : c.estado === "rechazado"
                      ? "bg-destructive/20 text-destructive"
                      : "bg-accent/20 text-accent"
                  }`}
                >
                  {c.estado === "aprobado" ? "✅ Aprobado" : c.estado === "rechazado" ? "❌ Rechazado" : "⏳ Pendiente"}
                </span>
              </div>

              {isPendiente ? (
                <>
                  {/* Foto personal grande */}
                  <div className="flex justify-center">
                    {showPhoto ? (
                      <button
                        type="button"
                        onClick={() => setLightbox(c.foto)}
                        className="rounded-2xl overflow-hidden border-2 border-accent shadow-md focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <img
                          src={c.foto}
                          alt={`Foto de ${c.nombre}`}
                          className="w-40 h-40 object-cover"
                        />
                      </button>
                    ) : (
                      <div className="w-40 h-40 rounded-2xl bg-primary border-2 border-accent flex items-center justify-center">
                        <span className="text-6xl font-extrabold text-accent">{initial}</span>
                      </div>
                    )}
                  </div>

                  {/* Datos personales */}
                  <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-sm">
                    <p className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-accent shrink-0" />
                      <span className="text-muted-foreground">Cédula:</span>
                      <span className="font-mono font-semibold">{c.cedula || "—"}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-accent shrink-0" />
                      <span className="text-muted-foreground">Teléfono:</span>
                      <span className="font-semibold">{c.telefono || "—"}</span>
                    </p>
                  </div>

                  {/* Foto de cédula */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">📄 Foto de cédula</p>
                    {showCedula ? (
                      <button
                        type="button"
                        onClick={() => setLightbox(c.foto_cedula)}
                        className="w-full rounded-xl overflow-hidden border border-border focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <img src={c.foto_cedula} alt="Cédula" className="w-full h-44 object-cover" />
                      </button>
                    ) : (
                      <div className="w-full h-24 rounded-xl bg-muted/40 border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
                        Sin foto de cédula
                      </div>
                    )}
                  </div>

                  {/* Datos de moto */}
                  <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-sm">
                    <p className="flex items-center gap-2">
                      <Bike className="h-4 w-4 text-accent shrink-0" />
                      <span className="text-muted-foreground">Modelo:</span>
                      <span className="font-semibold">{c.modelo_moto || "—"}</span>
                      {c.color && <span className="text-muted-foreground">· {c.color}</span>}
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="text-muted-foreground">Placa:</span>
                      <span className="font-mono font-bold text-accent">#{c.placa || "—"}</span>
                    </p>
                  </div>

                  {/* Foto moto */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">🏍️ Foto de la moto</p>
                    {showMoto ? (
                      <button
                        type="button"
                        onClick={() => setLightbox(c.foto_moto)}
                        className="w-full rounded-xl overflow-hidden border border-border focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <img src={c.foto_moto} alt="Moto" className="w-full h-48 object-cover" />
                      </button>
                    ) : (
                      <div className="w-full h-24 rounded-xl bg-muted/40 border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
                        Sin foto de moto
                      </div>
                    )}
                  </div>

                  {/* Botones */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      variant="outline"
                      className="rounded-xl border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => updateEstado(c.id, "rechazado")}
                      disabled={acting === c.id}
                    >
                      {acting === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><XCircle className="h-4 w-4 mr-1" /> Rechazar</>)}
                    </Button>
                    <Button
                      variant="hero"
                      className="rounded-xl"
                      onClick={() => updateEstado(c.id, "aprobado")}
                      disabled={acting === c.id}
                    >
                      {acting === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><CheckCircle className="h-4 w-4 mr-1" /> Aprobar</>)}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-3">
                  {showPhoto ? (
                    <img
                      src={c.foto}
                      alt={c.nombre}
                      className="w-14 h-14 rounded-full object-cover border-2 border-accent shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-primary border-2 border-accent flex items-center justify-center shrink-0">
                      <span className="text-xl font-extrabold text-accent">{initial}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                    <p className="flex items-center gap-1">
                      <CreditCard className="h-3 w-3 text-accent" />
                      <span className="font-mono">{c.cedula || "—"}</span>
                    </p>
                    <p className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-accent" />
                      {c.telefono || "—"}
                    </p>
                    <p className="flex items-center gap-1">
                      <Bike className="h-3 w-3 text-accent" />
                      {c.modelo_moto || "—"}
                    </p>
                    <p className="font-bold">#{c.placa || "—"}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Lightbox para imágenes */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center text-xl"
            aria-label="Cerrar"
          >
            ✕
          </button>
          <img
            src={lightbox}
            alt="Vista ampliada"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

// ─────────────── VIAJES ───────────────
const VIAJES_ESTADOS = ["todos", "pendiente", "aceptado", "en_curso", "completado", "cancelado"] as const;

const ViajesTab = () => {
  const [estado, setEstado] = useState<(typeof VIAJES_ESTADOS)[number]>("todos");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let q = supabase
        .from("viajes")
        .select("id, pasajero_id, conductor_id, pasajero_nombre, destino, estado, costo, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (estado !== "todos") q = q.eq("estado", estado);
      const { data: viajes } = await q;

      const condIds = Array.from(new Set((viajes || []).map((v: any) => v.conductor_id).filter(Boolean)));
      const condNames: Record<string, string> = {};
      if (condIds.length) {
        const { data: cs } = await supabase
          .from("conductores")
          .select("id, usuario_id")
          .in("id", condIds);
        const userIds = (cs || []).map((c: any) => c.usuario_id).filter(Boolean);
        const condToUser: Record<string, string> = {};
        (cs || []).forEach((c: any) => (condToUser[c.id] = c.usuario_id));
        if (userIds.length) {
          const { data: us } = await supabase
            .from("usuarios")
            .select("id, nombre")
            .in("id", userIds);
          const un: Record<string, string> = {};
          (us || []).forEach((u: any) => (un[u.id] = toTitleCase(u.nombre || "Conductor")));
          Object.entries(condToUser).forEach(([cid, uid]) => (condNames[cid] = un[uid] || "—"));
        }
      }

      setItems(
        (viajes || []).map((v: any) => ({
          ...v,
          pasajeroNombre: toTitleCase(v.pasajero_nombre || "—"),
          conductorNombre: condNames[v.conductor_id] || "—",
        }))
      );
      setLoading(false);
    };
    load();
  }, [estado]);

  return (
    <div className="space-y-3">
      <Select value={estado} onValueChange={(v) => setEstado(v as any)}>
        <SelectTrigger className="rounded-xl">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {VIAJES_ESTADOS.map((e) => (
            <SelectItem key={e} value={e}>
              {e === "todos" ? "Todos los estados" : e.replace("_", " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 text-accent animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10">No hay viajes.</p>
      ) : (
        items.map((v) => (
          <div key={v.id} className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-foreground truncate">
                {v.pasajeroNombre} → {v.conductorNombre}
              </p>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize whitespace-nowrap ${
                  v.estado === "completado"
                    ? "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]"
                    : v.estado === "cancelado"
                    ? "bg-destructive/20 text-destructive"
                    : "bg-accent/20 text-accent"
                }`}
              >
                {(v.estado || "pendiente").replace("_", " ")}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate mt-1">
              📍 {v.destino || "Sin destino"}
            </p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-muted-foreground">{formatDate(v.created_at)}</p>
              <p className="text-xs font-bold text-accent">
                {v.costo != null ? `$${Number(v.costo).toFixed(2)}` : "—"}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// ─────────────── USUARIOS ───────────────
const ROLES = ["pasajero", "conductor", "admin"] as const;

const UsuariosTab = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("usuarios")
      .select("id, nombre, email, rol, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const changeRole = async (id: string, rol: string) => {
    setUpdating(id);
    const { error } = await supabase.from("usuarios").update({ rol }).eq("id", id);
    setUpdating(null);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Rol actualizado", description: `Nuevo rol: ${rol}` });
    setItems((prev) => prev.map((u) => (u.id === id ? { ...u, rol } : u)));
  };

  return (
    <div className="space-y-2">
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 text-accent animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10">No hay usuarios.</p>
      ) : (
        items.map((u) => (
          <div key={u.id} className="bg-card rounded-xl border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground truncate">
                  {toTitleCase(u.nombre || "Sin nombre")}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                <p className="text-[10px] text-muted-foreground">📅 {formatDate(u.created_at)}</p>
              </div>
              <Select
                value={u.rol || "pasajero"}
                onValueChange={(v) => changeRole(u.id, v)}
                disabled={updating === u.id}
              >
                <SelectTrigger className="w-32 h-9 rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// ─────────────── STATS ───────────────
const StatsTab = () => {
  const [stats, setStats] = useState({
    conductoresAprobados: 0,
    pasajeros: 0,
    viajesHoy: 0,
    viajesSemana: 0,
    viajesMes: 0,
    ingresosMes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 7);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
        condCountRes,
        pasajCountRes,
        hoyRes,
        semRes,
        mesRes,
        ingresosRes,
      ] = await Promise.all([
        supabase.from("conductores").select("id", { count: "exact", head: true }).eq("estado", "aprobado"),
        supabase.from("usuarios").select("id", { count: "exact", head: true }).eq("rol", "pasajero"),
        supabase.from("viajes").select("id", { count: "exact", head: true }).eq("estado", "completado").gte("created_at", startOfDay),
        supabase.from("viajes").select("id", { count: "exact", head: true }).eq("estado", "completado").gte("created_at", startOfWeek.toISOString()),
        supabase.from("viajes").select("id", { count: "exact", head: true }).eq("estado", "completado").gte("created_at", startOfMonth),
        supabase.from("viajes").select("costo").eq("estado", "completado").gte("created_at", startOfMonth),
      ]);

      const ingresos = (ingresosRes.data || []).reduce(
        (acc: number, v: any) => acc + (Number(v.costo) || 0),
        0
      );

      setStats({
        conductoresAprobados: condCountRes.count || 0,
        pasajeros: pasajCountRes.count || 0,
        viajesHoy: hoyRes.count || 0,
        viajesSemana: semRes.count || 0,
        viajesMes: mesRes.count || 0,
        ingresosMes: ingresos,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 text-accent animate-spin" />
      </div>
    );
  }

  const Card = ({ icon: Icon, label, value, sub }: any) => (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center">
          <Icon className="h-4 w-4 text-accent" />
        </div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-extrabold text-foreground mt-2">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card icon={Bike} label="Conductores activos" value={stats.conductoresAprobados} />
      <Card icon={Users} label="Pasajeros registrados" value={stats.pasajeros} />
      <Card icon={Calendar} label="Viajes hoy" value={stats.viajesHoy} sub="completados" />
      <Card icon={RouteIcon} label="Viajes semana" value={stats.viajesSemana} sub="últimos 7 días" />
      <Card icon={BarChart3} label="Viajes mes" value={stats.viajesMes} sub="completados este mes" />
      <Card
        icon={DollarSign}
        label="Ingresos mes"
        value={`$${stats.ingresosMes.toFixed(2)}`}
        sub="estimado"
      />
    </div>
  );
};

// ─────────────── ADMIN ROOT ───────────────
const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>("conductores");
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (!user) {
        setChecking(false);
        return;
      }
      // Bypass por email autorizado
      if (user.email?.toLowerCase() === ADMIN_EMAIL) {
        // Asegurar rol admin en tabla usuarios
        await supabase
          .from("usuarios")
          .upsert(
            { id: user.id, email: user.email, rol: "admin" },
            { onConflict: "id" }
          );
        setIsAdmin(true);
        setChecking(false);
        return;
      }
      // Rol en metadata
      if ((user.user_metadata as any)?.rol === "admin") {
        setIsAdmin(true);
        setChecking(false);
        return;
      }
      // Rol en tabla usuarios
      const { data } = await supabase
        .from("usuarios")
        .select("rol")
        .eq("id", user.id)
        .maybeSingle();
      setIsAdmin((data as any)?.rol === "admin");
      setChecking(false);
    };
    check();
  }, [user]);

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <Shield className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-xl font-extrabold text-foreground mb-2">Acceso denegado</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Solo los administradores pueden acceder a este panel.
        </p>
        <Button variant="hero" onClick={() => navigate("/")}>
          Volver al inicio
        </Button>
      </div>
    );
  }

  const titles: Record<AdminTab, string> = {
    conductores: "Conductores",
    viajes: "Viajes",
    usuarios: "Usuarios",
    stats: "Estadísticas",
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="gradient-primary px-4 pt-10 pb-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-accent" />
          <div>
            <h1 className="text-lg font-extrabold text-accent">Panel Admin</h1>
            <p className="text-xs text-primary-foreground/70">{titles[tab]}</p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4">
        {tab === "conductores" && <ConductoresTab />}
        {tab === "viajes" && <ViajesTab />}
        {tab === "usuarios" && <UsuariosTab />}
        {tab === "stats" && <StatsTab />}
      </div>

      <BottomNavAdmin active={tab} onChange={setTab} />
    </div>
  );
};

export default Admin;
