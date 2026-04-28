import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Star,
  LogOut,
  Mail,
  Phone,
  Bike,
  Pencil,
  Loader2,
  BadgeCheck,
  CalendarDays,
  Route,
  Camera,
  MapPin,
  Lock,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBackButton } from "@/hooks/useBackButton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logoPoseidon from "@/assets/logo-poseidon.png";

interface ConductorData {
  foto: string | null;
  placa: string | null;
  modelo_moto: string | null;
  color_moto: string | null;
  cedula: string | null;
  telefono: string | null;
  calificacion_promedio: number | null;
  estado: string | null;
  created_at: string | null;
}

// Capitaliza "ALEJANDRO PEREZ" -> "Alejandro Perez"
const toTitleCase = (raw: string) =>
  (raw || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

// Detecta fotos por defecto / placeholders / logo MotoYa
const isPlaceholderPhoto = (url: string | null | undefined) => {
  if (!url) return true;
  const u = url.toLowerCase();
  return (
    u.includes("placeholder") ||
    u.includes("logo-motoya") ||
    u.includes("via.placeholder") ||
    u.endsWith("/placeholder.svg")
  );
};

const formatJoinDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  try {
    const formatted = new Date(iso).toLocaleDateString("es-EC", {
      month: "long",
      year: "numeric",
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return "—";
  }
};

const Perfil = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  useBackButton();

  const role: "pasajero" | "conductor" =
    (user?.user_metadata?.rol as any) === "conductor" ? "conductor" : "pasajero";

  const [nombre, setNombre] = useState(toTitleCase(user?.user_metadata?.nombre || ""));
  const [telefono, setTelefono] = useState("");
  const [conductor, setConductor] = useState<ConductorData | null>(null);
  const [conductorId, setConductorId] = useState<string | null>(null);
  const [tripsCount, setTripsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editNombre, setEditNombre] = useState("");
  const [editTelefono, setEditTelefono] = useState("");
  const [saving, setSaving] = useState(false);

  const email = user?.email || "—";
  const inicial = (nombre || email).charAt(0).toUpperCase();
  const showRealPhoto = role === "conductor" && !isPlaceholderPhoto(conductor?.foto);
  const isVerified = role === "conductor" && conductor?.estado === "aprobado";

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("nombre, telefono")
        .eq("id", user.id)
        .maybeSingle();
      let tel = "";
      if (usuario) {
        setNombre(toTitleCase(usuario.nombre || user.user_metadata?.nombre || ""));
        tel = (usuario as any).telefono || "";
        setTelefono(tel);
      }
      if (role === "conductor") {
        const { data: cond } = await supabase
          .from("conductores")
          .select("id, foto, placa, modelo_moto, color_moto, cedula, telefono, calificacion_promedio, estado, created_at")
          .eq("usuario_id", user.id)
          .maybeSingle();
        if (cond) {
          setConductor(cond as ConductorData);
          setConductorId((cond as any).id);
          if (!tel && cond.telefono) setTelefono(cond.telefono);

          // Total de viajes completados como conductor
          const { count } = await supabase
            .from("viajes")
            .select("id", { count: "exact", head: true })
            .eq("conductor_id", (cond as any).id)
            .eq("estado", "completado");
          setTripsCount(count || 0);
        }
      } else {
        const { count } = await supabase
          .from("viajes")
          .select("id", { count: "exact", head: true })
          .eq("pasajero_id", user.id)
          .eq("estado", "completado");
        setTripsCount(count || 0);
      }
      setLoading(false);
    };
    load();
  }, [user, role]);

  const joinDate = useMemo(() => {
    if (role === "conductor") return formatJoinDate(conductor?.created_at);
    return formatJoinDate(user?.created_at);
  }, [role, conductor?.created_at, user?.created_at]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/welcome");
  };

  const openEdit = () => {
    setEditNombre(nombre);
    setEditTelefono(telefono);
    setEditOpen(true);
  };

  const handlePhotoUpload = () => {
    toast({ title: "Próximamente disponible" });
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const cleanTel = editTelefono.trim();

    if (!cleanTel || !/^[+\d\s\-()]{6,20}$/.test(cleanTel)) {
      toast({
        title: "Teléfono inválido",
        description: "Usa solo números, espacios, +, -, () (6-20 caracteres)",
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    const { error: uErr } = await supabase
      .from("usuarios")
      .update({ telefono: cleanTel })
      .eq("id", user.id);

    if (uErr) {
      console.error("❌ Error UPDATE usuarios:", uErr);
      toast({
        title: "Error al guardar",
        description: uErr.message,
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    if (role === "conductor") {
      const { error: cErr } = await supabase
        .from("conductores")
        .update({ telefono: cleanTel })
        .eq("usuario_id", user.id);
      if (cErr) {
        console.error("❌ Error UPDATE conductores:", cErr);
        toast({
          title: "Error al guardar conductor",
          description: cErr.message,
          variant: "destructive",
        });
        setSaving(false);
        return;
      }
    }

    setTelefono(cleanTel);
    setConductor((prev) => (prev ? { ...prev, telefono: cleanTel } : prev));
    setSaving(false);
    setEditOpen(false);
    toast({ title: "✅ Teléfono actualizado" });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="gradient-primary px-4 pt-12 pb-8">
        <div className="flex items-center gap-4">
          {showRealPhoto ? (
            <img
              src={conductor!.foto as string}
              alt={nombre}
              className="w-16 h-16 rounded-full object-cover border-2 border-accent"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center">
              <span className="text-2xl font-bold text-accent">{inicial}</span>
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-extrabold text-primary-foreground truncate">
              {nombre || "Usuario"}
            </h1>
            <p className="text-xs text-primary-foreground/70 capitalize">{role}</p>
            {role === "conductor" && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                  <span className="text-sm font-medium text-accent">
                    {(conductor?.calificacion_promedio ?? 0).toFixed(1)}
                  </span>
                </div>
                {isVerified && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]">
                    <BadgeCheck className="h-3 w-3" />
                    Conductor verificado
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 text-accent animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="mx-4 -mt-4 grid grid-cols-3 gap-2">
            <div className="bg-card rounded-2xl shadow-md border border-border p-3 flex flex-col items-center text-center">
              <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center mb-1">
                <Route className="h-4 w-4 text-accent" />
              </div>
              <p className="text-base font-extrabold text-foreground leading-none">{tripsCount}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Viajes</p>
            </div>
            <div className="bg-card rounded-2xl shadow-md border border-border p-3 flex flex-col items-center text-center">
              <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center mb-1">
                <Star className="h-4 w-4 text-accent fill-accent" />
              </div>
              <p className="text-base font-extrabold text-foreground leading-none">
                {role === "conductor"
                  ? (conductor?.calificacion_promedio ?? 0).toFixed(1)
                  : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Calificación</p>
            </div>
            <div className="bg-card rounded-2xl shadow-md border border-border p-3 flex flex-col items-center text-center">
              <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center mb-1">
                <CalendarDays className="h-4 w-4 text-accent" />
              </div>
              <p className="text-xs font-bold text-foreground leading-tight">{joinDate}</p>
              <p className="text-[10px] text-muted-foreground mt-1">En MotoYa</p>
            </div>
          </div>

          <div className="mx-4 mt-4 bg-card rounded-2xl shadow-lg border border-border p-4 space-y-1">
            <div className="flex items-center gap-3 py-3">
              <Mail className="h-5 w-5 text-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground">Email</p>
                <p className="text-sm text-foreground truncate">{email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-3 border-t border-border">
              <Phone className="h-5 w-5 text-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground">Teléfono</p>
                <p className="text-sm text-foreground truncate">
                  {telefono || (
                    <button
                      onClick={openEdit}
                      className="text-accent underline underline-offset-2"
                    >
                      Sin registrar — agregar
                    </button>
                  )}
                </p>
              </div>
            </div>
            {role === "pasajero" && (
              <>
                <div className="flex items-center gap-3 py-3 border-t border-border">
                  <MapPin className="h-5 w-5 text-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground">Miembro desde</p>
                    <p className="text-sm text-foreground truncate">{joinDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-3 border-t border-border">
                  <Bike className="h-5 w-5 text-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground">Viajes realizados</p>
                    <p className="text-sm font-bold text-foreground truncate">{tripsCount}</p>
                  </div>
                </div>
              </>
            )}
            {role === "conductor" && (
              <>
                <div className="flex items-center gap-3 py-3 border-t border-border">
                  <Bike className="h-5 w-5 text-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground">Moto (verificada)</p>
                    <p className="text-sm text-foreground truncate">
                      {conductor?.modelo_moto || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-3 border-t border-border">
                  <span className="text-accent font-bold text-sm w-5 text-center">#</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground">Placa (verificada)</p>
                    <p className="text-sm font-bold text-foreground truncate">
                      {conductor?.placa || "—"}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="mx-4 mt-4 space-y-2">
            <Button onClick={openEdit} variant="outline" className="w-full rounded-xl">
              <Pencil className="h-4 w-4 mr-2" />
              Editar perfil
            </Button>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </Button>
          </div>

          <div className="mx-4 mt-8 flex flex-col items-center">
            <div className="w-full h-px bg-border mb-4" />
            <img
              src={logoPoseidon}
              alt="Poseidon"
              className="h-16 w-auto opacity-80"
            />
            <p className="text-muted-foreground text-[11px] mt-2 opacity-70">
              Desarrollado por Poseidon
            </p>
          </div>
        </>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Avatar + subir foto */}
            <div className="flex flex-col items-center gap-2">
              {showRealPhoto ? (
                <img
                  src={conductor!.foto as string}
                  alt={nombre}
                  className="w-20 h-20 rounded-full object-cover border-2 border-accent"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center">
                  <span className="text-3xl font-bold text-accent">{inicial}</span>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePhotoUpload}
                className="rounded-xl"
              >
                <Camera className="h-4 w-4 mr-2" />
                Cambiar foto
              </Button>
            </div>

            <div>
              <Label className="flex items-center gap-1 text-xs">
                <Lock className="h-3 w-3 text-muted-foreground" />
                Nombre
              </Label>
              <Input value={nombre || "—"} disabled readOnly className="bg-muted/50" />
            </div>
            <div>
              <Label className="flex items-center gap-1 text-xs">
                <Lock className="h-3 w-3 text-muted-foreground" />
                Email
              </Label>
              <Input value={email} disabled readOnly className="bg-muted/50" />
            </div>
            <div>
              <Label htmlFor="edit-telefono">Teléfono</Label>
              <Input
                id="edit-telefono"
                value={editTelefono}
                onChange={(e) => setEditTelefono(e.target.value)}
                placeholder="0999-XXX-XXX"
                inputMode="tel"
              />
            </div>
            {role === "conductor" && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Lock className="h-3 w-3" />
                  Datos verificados — no editables
                </p>
                {[
                  { label: "Cédula", value: conductor?.cedula },
                  { label: "Placa", value: conductor?.placa },
                  { label: "Modelo", value: conductor?.modelo_moto },
                  { label: "Color", value: conductor?.color_moto },
                ].map((f) => (
                  <div key={f.label}>
                    <Label className="flex items-center gap-1 text-xs">
                      <Lock className="h-3 w-3 text-muted-foreground" />
                      {f.label}
                    </Label>
                    <Input value={f.value || "—"} disabled readOnly className="bg-muted/50" />
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={saveProfile} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Perfil;
