import { useEffect, useState } from "react";
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
import { Star, LogOut, Mail, Phone, Bike, Pencil, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBackButton } from "@/hooks/useBackButton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ConductorData {
  foto: string | null;
  placa: string | null;
  modelo_moto: string | null;
  telefono: string | null;
  calificacion_promedio: number | null;
}

const Perfil = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  useBackButton();

  const role: "pasajero" | "conductor" =
    (user?.user_metadata?.rol as any) === "conductor" ? "conductor" : "pasajero";

  const [nombre, setNombre] = useState(user?.user_metadata?.nombre || "");
  const [telefono, setTelefono] = useState("");
  const [conductor, setConductor] = useState<ConductorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editNombre, setEditNombre] = useState("");
  const [editTelefono, setEditTelefono] = useState("");
  const [saving, setSaving] = useState(false);

  const email = user?.email || "—";
  const inicial = (nombre || email).charAt(0).toUpperCase();

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("nombre, telefono")
        .eq("id", user.id)
        .maybeSingle();
      if (usuario) {
        setNombre(usuario.nombre || user.user_metadata?.nombre || "");
        setTelefono((usuario as any).telefono || "");
      }
      if (role === "conductor") {
        const { data: cond } = await supabase
          .from("conductores")
          .select("foto, placa, modelo_moto, telefono, calificacion_promedio")
          .eq("usuario_id", user.id)
          .maybeSingle();
        if (cond) {
          setConductor(cond as ConductorData);
          if (!telefono && cond.telefono) setTelefono(cond.telefono);
        }
      }
      setLoading(false);
    };
    load();
  }, [user, role]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/welcome");
  };

  const openEdit = () => {
    setEditNombre(nombre);
    setEditTelefono(telefono);
    setEditOpen(true);
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const cleanNombre = editNombre.trim();
    const cleanTel = editTelefono.trim();

    const { error: uErr } = await supabase
      .from("usuarios")
      .upsert(
        { id: user.id, email: user.email, nombre: cleanNombre, telefono: cleanTel },
        { onConflict: "id" }
      );

    if (uErr) {
      console.error(uErr);
      toast({ title: "Error", description: "No se pudo guardar.", variant: "destructive" });
      setSaving(false);
      return;
    }

    if (role === "conductor") {
      await supabase
        .from("conductores")
        .update({ telefono: cleanTel })
        .eq("usuario_id", user.id);
    }

    await supabase.auth.updateUser({ data: { nombre: cleanNombre } });

    setNombre(cleanNombre);
    setTelefono(cleanTel);
    setSaving(false);
    setEditOpen(false);
    toast({ title: "Perfil actualizado" });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="gradient-primary px-4 pt-12 pb-8">
        <div className="flex items-center gap-4">
          {role === "conductor" && conductor?.foto ? (
            <img
              src={conductor.foto}
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
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                <span className="text-sm font-medium text-accent">
                  {(conductor?.calificacion_promedio ?? 0).toFixed(1)}
                </span>
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
          <div className="mx-4 -mt-4 bg-card rounded-2xl shadow-lg border border-border p-4 space-y-1">
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
                <p className="text-sm text-foreground truncate">{telefono || "Sin registrar"}</p>
              </div>
            </div>
            {role === "conductor" && (
              <>
                <div className="flex items-center gap-3 py-3 border-t border-border">
                  <Bike className="h-5 w-5 text-accent shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground">Moto</p>
                    <p className="text-sm text-foreground truncate">
                      {conductor?.modelo_moto || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-3 border-t border-border">
                  <span className="text-accent font-bold text-sm w-5 text-center">#</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground">Placa</p>
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
        </>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="edit-nombre">Nombre</Label>
              <Input
                id="edit-nombre"
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
                placeholder="Tu nombre"
              />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={saveProfile} disabled={saving || !editNombre.trim()}>
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
