import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import logoMotoya from "@/assets/logo-motoya.png";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
  ArrowLeft,
  Shield,
  Eye,
  User,
  Bike,
  CreditCard,
  Phone,
} from "lucide-react";

interface Application {
  id: string;
  name: string;
  photo: string;
  cedula: string;
  cedulaPhoto: string;
  phone: string;
  plate: string;
  motoModel: string;
  motoColor: string;
  motoPhoto: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
}

const MOCK_APPLICATIONS: Application[] = [
  {
    id: "a1",
    name: "Roberto Quiñónez",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    cedula: "0801234567",
    cedulaPhoto: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=300&h=200&fit=crop",
    phone: "0991-111-222",
    plate: "EC-0789",
    motoModel: "Honda Wave 110",
    motoColor: "Rojo",
    motoPhoto: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=300&h=200&fit=crop",
    submittedAt: "2026-04-12",
    status: "pending",
  },
  {
    id: "a2",
    name: "Fernando Delgado",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    cedula: "0809876543",
    cedulaPhoto: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=300&h=200&fit=crop",
    phone: "0998-333-444",
    plate: "EC-0912",
    motoModel: "Yamaha YBR 125",
    motoColor: "Negro",
    motoPhoto: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=300&h=200&fit=crop",
    submittedAt: "2026-04-13",
    status: "pending",
  },
  {
    id: "a3",
    name: "Carlos Mendoza",
    photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    cedula: "0805556667",
    cedulaPhoto: "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=300&h=200&fit=crop",
    phone: "0991-234-567",
    plate: "EC-0451",
    motoModel: "Honda Wave 110",
    motoColor: "Rojo",
    motoPhoto: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=300&h=200&fit=crop",
    submittedAt: "2026-04-10",
    status: "approved",
  },
];

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState(MOCK_APPLICATIONS);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  const role = user?.user_metadata?.rol;

  // Gate: only admin role
  if (role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <Shield className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-xl font-extrabold text-foreground mb-2">Acceso denegado</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">Solo los administradores pueden acceder a este panel.</p>
        <Button variant="hero" onClick={() => navigate("/")}>Volver al inicio</Button>
      </div>
    );
  }

  const handleApprove = (id: string) => {
    setApplications((prev) => prev.map((a) => a.id === id ? { ...a, status: "approved" as const } : a));
    setSelectedApp(null);
  };

  const handleReject = (id: string) => {
    setApplications((prev) => prev.map((a) => a.id === id ? { ...a, status: "rejected" as const } : a));
    setSelectedApp(null);
  };

  const filtered = filter === "all" ? applications : applications.filter((a) => a.status === filter);
  const pendingCount = applications.filter((a) => a.status === "pending").length;

  // ── Detail View ──
  if (selectedApp) {
    return (
      <div className="min-h-screen bg-background pb-10">
        <header className="gradient-primary px-4 pt-10 pb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedApp(null)} className="p-1.5 rounded-full bg-primary-foreground/10 text-primary-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-extrabold text-accent">Detalle de postulación</h1>
              <p className="text-xs text-primary-foreground/70">{selectedApp.name}</p>
            </div>
          </div>
        </header>

        <div className="px-4 -mt-4 space-y-4">
          {/* Photo & Name */}
          <div className="bg-card rounded-2xl border border-border p-5 text-center">
            <img src={selectedApp.photo} alt={selectedApp.name} className="w-24 h-24 rounded-full object-cover border-4 border-accent mx-auto mb-3" />
            <h2 className="text-lg font-extrabold text-foreground">{selectedApp.name}</h2>
            <p className="text-xs text-muted-foreground">Enviado: {selectedApp.submittedAt}</p>
            <span className={`inline-block mt-2 text-xs px-3 py-1 rounded-full font-semibold ${
              selectedApp.status === "pending" ? "bg-accent/20 text-accent" :
              selectedApp.status === "approved" ? "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]" :
              "bg-destructive/20 text-destructive"
            }`}>
              {selectedApp.status === "pending" ? "⏳ Pendiente" : selectedApp.status === "approved" ? "✅ Aprobado" : "❌ Rechazado"}
            </span>
          </div>

          {/* Documents */}
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-accent" /> Cédula
            </h3>
            <p className="text-sm text-foreground font-mono">{selectedApp.cedula}</p>
            <img src={selectedApp.cedulaPhoto} alt="Cédula" className="w-full h-40 object-cover rounded-xl border border-border" />
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Phone className="h-4 w-4 text-accent" /> Teléfono
            </h3>
            <p className="text-sm text-foreground">{selectedApp.phone}</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Bike className="h-4 w-4 text-accent" /> Moto
            </h3>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><span className="text-muted-foreground">Placa:</span><p className="font-bold text-foreground">{selectedApp.plate}</p></div>
              <div><span className="text-muted-foreground">Modelo:</span><p className="font-bold text-foreground">{selectedApp.motoModel}</p></div>
              <div><span className="text-muted-foreground">Color:</span><p className="font-bold text-foreground">{selectedApp.motoColor}</p></div>
            </div>
            <img src={selectedApp.motoPhoto} alt="Moto" className="w-full h-40 object-cover rounded-xl border border-border" />
          </div>

          {/* Actions */}
          {selectedApp.status === "pending" && (
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" size="lg"
                className="rounded-xl border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => handleReject(selectedApp.id)}
              >
                <XCircle className="h-5 w-5 mr-1" /> Rechazar
              </Button>
              <Button variant="hero" size="lg" className="rounded-xl" onClick={() => handleApprove(selectedApp.id)}>
                <CheckCircle className="h-5 w-5 mr-1" /> Aprobar
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── List View ──
  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="gradient-primary px-4 pt-10 pb-6">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate("/")} className="p-1.5 rounded-full bg-primary-foreground/10 text-primary-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src={logoMotoya} alt="MotoYa" className="h-8 w-8" />
            <div>
              <h1 className="text-lg font-extrabold text-accent">Panel Admin</h1>
              <p className="text-xs text-primary-foreground/70">
                {pendingCount} postulación{pendingCount !== 1 ? "es" : ""} pendiente{pendingCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Filter tabs */}
      <div className="px-4 -mt-3 mb-4">
        <div className="flex gap-2 bg-card rounded-xl p-1 border border-border">
          {([
            { key: "pending", label: "Pendientes" },
            { key: "approved", label: "Aprobados" },
            { key: "rejected", label: "Rechazados" },
            { key: "all", label: "Todos" },
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
      </div>

      {/* Applications list */}
      <div className="px-4 space-y-3">
        {filtered.length > 0 ? (
          filtered.map((app) => (
            <div
              key={app.id}
              className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedApp(app)}
            >
              <img src={app.photo} alt={app.name} className="w-14 h-14 rounded-full object-cover border-2 border-accent" />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground truncate">{app.name}</h3>
                <p className="text-xs text-muted-foreground">🏍️ {app.motoModel} · {app.plate}</p>
                <p className="text-xs text-muted-foreground">📅 {app.submittedAt}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  app.status === "pending" ? "bg-accent/20 text-accent" :
                  app.status === "approved" ? "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]" :
                  "bg-destructive/20 text-destructive"
                }`}>
                  {app.status === "pending" ? "⏳ Pendiente" : app.status === "approved" ? "✅ Aprobado" : "❌ Rechazado"}
                </span>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-16">
            <User className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm font-bold text-foreground">No hay postulaciones</p>
            <p className="text-xs text-muted-foreground">No se encontraron postulaciones con este filtro.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
