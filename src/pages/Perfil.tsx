import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Shield, ChevronRight, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Perfil = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const nombre = user?.user_metadata?.nombre || user?.email || "Usuario";
  const rol = user?.user_metadata?.rol || "pasajero";
  const inicial = nombre.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    navigate("/welcome");
  };
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="gradient-primary px-4 pt-12 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center">
            <span className="text-2xl font-bold text-accent">{inicial}</span>
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-primary-foreground">{nombre}</h1>
            <p className="text-xs text-primary-foreground/70 capitalize">{rol}</p>
            <div className="flex items-center gap-1 mt-1">
              <Star className="h-3.5 w-3.5 fill-accent text-accent" />
              <span className="text-sm font-medium text-accent">4.9</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-4 -mt-4 bg-card rounded-2xl shadow-lg border border-border p-4 space-y-1">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-accent" />
            <span className="text-sm text-foreground">Mis direcciones</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-center justify-between py-3 border-t border-border">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-accent" />
            <span className="text-sm text-foreground">Seguridad</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-center justify-between py-3 border-t border-border">
          <div className="flex items-center gap-3">
            <Star className="h-5 w-5 text-accent" />
            <span className="text-sm text-foreground">Mis calificaciones</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <div className="mx-4 mt-4">
        <Button onClick={handleSignOut} variant="outline" className="w-full rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10">
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar sesión
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Perfil;
