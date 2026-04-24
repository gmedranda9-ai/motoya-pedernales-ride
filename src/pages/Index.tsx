import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import PasajeroHome from "@/pages/PasajeroHome";
import ConductorHome from "@/pages/ConductorHome";
import { MapPin, Shield, Zap } from "lucide-react";
import RideRequestCard from "@/components/RideRequestCard";
import BottomNav from "@/components/BottomNav";
import logoMotoya from "@/assets/logo-motoya.png";
import heroImage from "@/assets/hero-mototaxi.jpg";
import { useBackButton } from "@/hooks/useBackButton";

const Index = () => {
  const { user } = useAuth();
  useBackButton();
  const role = user?.user_metadata?.rol;

  // First-time OAuth users without a role yet
  if (user && !role) {
    return <Navigate to="/seleccionar-rol" replace />;
  }

  // Conductor view
  if (user && role === "conductor") {
    return <ConductorHome />;
  }

  // Passengers (or default logged-in users) see driver list
  if (user) {
    return <PasajeroHome />;
  }

  // Fallback / conductor placeholder / public landing
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="gradient-primary px-4 pt-12 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <img src={logoMotoya} alt="MotoYa" className="h-10 w-10" />
          <div>
            <h1 className="text-xl font-extrabold text-accent">MotoYa</h1>
            <p className="text-xs text-primary-foreground/70">Pedernales, Ecuador</p>
          </div>
        </div>
        <p className="text-primary-foreground/90 text-sm mt-3">
          Tu mototaxi seguro y rápido
        </p>
      </header>

      <div className="relative -mt-4 mx-4 rounded-2xl overflow-hidden shadow-lg mb-6">
        <img
          src={heroImage}
          alt="MotoYa - Servicio de mototaxis en Pedernales"
          className="w-full h-40 object-cover"
          width={1024}
          height={768}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <div className="absolute bottom-3 left-4">
          <p className="text-sm font-bold text-foreground">Viaja por Pedernales</p>
          <p className="text-xs text-muted-foreground">Rápido, seguro y económico</p>
        </div>
      </div>

      <RideRequestCard />

      <div className="grid grid-cols-3 gap-3 mx-4 mt-6">
        {[
          { icon: Zap, label: "Rápido", desc: "En minutos" },
          { icon: Shield, label: "Seguro", desc: "Conductores verificados" },
          { icon: MapPin, label: "Local", desc: "Conocemos Pedernales" },
        ].map((feature) => (
          <div
            key={feature.label}
            className="bg-card rounded-xl p-3 text-center border border-border"
          >
            <feature.icon className="h-6 w-6 mx-auto text-accent mb-1.5" />
            <p className="text-xs font-bold text-foreground">{feature.label}</p>
            <p className="text-[10px] text-muted-foreground">{feature.desc}</p>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
