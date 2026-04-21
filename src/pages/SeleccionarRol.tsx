import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { User, Bike } from "lucide-react";
import logoMotoya from "@/assets/logo-motoya.png";

const SeleccionarRol = () => {
  const [rol, setRol] = useState<"pasajero" | "conductor">("pasajero");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleContinue = async () => {
    if (!user) return;
    setLoading(true);

    const nombre =
      user.user_metadata?.nombre ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Usuario";

    const { error } = await supabase.auth.updateUser({
      data: { rol, nombre },
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    toast({ title: "¡Bienvenido a MotoYa!", description: `Cuenta configurada como ${rol}.` });
    // Force reload so AuthContext picks up new metadata
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="gradient-primary px-4 pt-10 pb-8">
        <div className="flex items-center gap-3">
          <img src={logoMotoya} alt="MotoYa" className="h-10 w-10" />
          <div>
            <h1 className="text-xl font-extrabold text-accent">Completa tu perfil</h1>
            <p className="text-xs text-primary-foreground/70">Elige cómo usarás MotoYa</p>
          </div>
        </div>
      </header>

      <div className="flex-1 p-6 flex flex-col gap-6">
        <Label className="text-base">¿Cómo quieres usar MotoYa?</Label>
        <RadioGroup
          value={rol}
          onValueChange={(v) => setRol(v as "pasajero" | "conductor")}
          className="grid grid-cols-2 gap-3"
        >
          <label
            htmlFor="rol-pasajero"
            className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 cursor-pointer transition-all ${
              rol === "pasajero" ? "border-accent bg-accent/10" : "border-border"
            }`}
          >
            <RadioGroupItem value="pasajero" id="rol-pasajero" className="sr-only" />
            <User className={`h-10 w-10 ${rol === "pasajero" ? "text-accent" : "text-muted-foreground"}`} />
            <span className={`text-sm font-semibold ${rol === "pasajero" ? "text-foreground" : "text-muted-foreground"}`}>
              Pasajero
            </span>
            <span className="text-[11px] text-muted-foreground text-center">Pide tu mototaxi</span>
          </label>
          <label
            htmlFor="rol-conductor"
            className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 cursor-pointer transition-all ${
              rol === "conductor" ? "border-accent bg-accent/10" : "border-border"
            }`}
          >
            <RadioGroupItem value="conductor" id="rol-conductor" className="sr-only" />
            <Bike className={`h-10 w-10 ${rol === "conductor" ? "text-accent" : "text-muted-foreground"}`} />
            <span className={`text-sm font-semibold ${rol === "conductor" ? "text-foreground" : "text-muted-foreground"}`}>
              Conductor
            </span>
            <span className="text-[11px] text-muted-foreground text-center">Ofrece viajes</span>
          </label>
        </RadioGroup>

        <Button
          variant="hero"
          size="lg"
          className="w-full mt-4"
          onClick={handleContinue}
          disabled={loading}
        >
          {loading ? "Guardando..." : "Continuar"}
        </Button>
      </div>
    </div>
  );
};

export default SeleccionarRol;
