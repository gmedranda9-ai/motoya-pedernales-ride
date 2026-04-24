import { useEffect, useState } from "react";
import { Star, Phone, ShieldCheck, ArrowLeft, Clock, Route, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Driver } from "@/components/DriverCard";

interface DriverProfileProps {
  driver: Driver;
  onRequest: (driverId: string) => void;
  onClose: () => void;
  estimatedCost?: string;
}

interface RealComment {
  id: string;
  comentario: string | null;
  estrellas: number;
  fecha: string;
  pasajero_id: string;
  author?: string;
}

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

const monthsSince = (iso: string | null | undefined) => {
  if (!iso) return 0;
  const start = new Date(iso);
  if (isNaN(start.getTime())) return 0;
  const now = new Date();
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  return Math.max(0, months);
};

const DriverProfile = ({ driver, onRequest, onClose, estimatedCost }: DriverProfileProps) => {
  const [stats, setStats] = useState<{ trips: number; months: number; cedula: string | null }>({
    trips: 0,
    months: 0,
    cedula: null,
  });
  const [comments, setComments] = useState<RealComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);

  const initial = (driver.name || "?").trim().charAt(0).toUpperCase();
  const showRealPhoto = !isPlaceholderPhoto(driver.photo);

  useEffect(() => {
    const loadStats = async () => {
      const [{ data: cond }, { count }] = await Promise.all([
        supabase
          .from("conductores")
          .select("cedula, created_at")
          .eq("id", driver.id)
          .maybeSingle(),
        supabase
          .from("viajes")
          .select("id", { count: "exact", head: true })
          .eq("conductor_id", driver.id)
          .eq("estado", "completado"),
      ]);
      setStats({
        trips: count || 0,
        months: monthsSince((cond as any)?.created_at),
        cedula: (cond as any)?.cedula ?? null,
      });
    };
    loadStats();

    const load = async () => {
      setLoadingComments(true);
      const { data, error } = await supabase
        .from("calificaciones")
        .select("id, comentario, estrellas, fecha, pasajero_id")
        .eq("conductor_id", driver.id)
        .order("fecha", { ascending: false })
        .limit(5);

      if (error || !data) {
        setComments([]);
        setLoadingComments(false);
        return;
      }

      const ids = Array.from(new Set(data.map((c: any) => c.pasajero_id).filter(Boolean)));
      const nameMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: users } = await supabase
          .from("usuarios")
          .select("id, nombre")
          .in("id", ids);
        (users || []).forEach((u: any) => {
          const n = (u.nombre || "Usuario").trim();
          const parts = n.split(" ");
          nameMap[u.id] = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
        });
      }

      setComments(
        (data as any[])
          .filter((c) => (c.comentario || "").trim().length > 0)
          .map((c) => ({ ...c, author: nameMap[c.pasajero_id] || "Anónimo" }))
      );
      setLoadingComments(false);
    };
    load();
  }, [driver.id]);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-x-0 bottom-0 top-0 overflow-y-auto bg-background animate-slide-up">
        {/* Header */}
        <div className="gradient-primary px-4 pt-12 pb-8 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-full bg-primary-foreground/10 text-primary-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          {showRealPhoto ? (
            <img
              src={driver.photo}
              alt={driver.name}
              className="w-24 h-24 rounded-full object-cover border-4 border-accent mx-auto mb-3"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-primary border-4 border-accent mx-auto mb-3 flex items-center justify-center">
              <span className="text-4xl font-extrabold text-accent leading-none">
                {initial}
              </span>
            </div>
          )}
          <h2 className="text-xl font-extrabold text-primary-foreground">
            {driver.name}
          </h2>
          <div className="flex items-center justify-center gap-1 mt-1">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <span className="text-xs text-accent font-semibold">
              {stats.cedula ? `Cédula verificada · ${stats.cedula}` : "Verificado"}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="px-4 py-5 space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card rounded-xl border border-border p-3 text-center">
              <Route className="h-4 w-4 text-accent mx-auto mb-1" />
              <p className="text-lg font-extrabold text-foreground">{stats.trips}</p>
              <p className="text-[10px] text-muted-foreground">Viajes</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-3 text-center">
              <Star className="h-4 w-4 text-accent mx-auto mb-1" />
              <p className="text-lg font-extrabold text-foreground">{driver.rating.toFixed(1)}</p>
              <p className="text-[10px] text-muted-foreground">Calificación</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-3 text-center">
              <Clock className="h-4 w-4 text-accent mx-auto mb-1" />
              <p className="text-lg font-extrabold text-foreground">{stats.months}</p>
              <p className="text-[10px] text-muted-foreground">Meses</p>
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Estado</span>
            <Badge
              className={
                driver.available
                  ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]"
                  : "bg-muted text-muted-foreground"
              }
            >
              {driver.available ? "Disponible" : "Ocupado"}
            </Badge>
          </div>

          {/* Details */}
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Teléfono</span>
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-accent" />
                <span className="text-sm font-medium text-foreground">
                  {driver.phone || "0999-XXX-XXX"}
                </span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Placa</span>
              <span className="text-sm font-bold text-foreground">{driver.plate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Moto</span>
              <span className="text-sm text-foreground">{driver.model}</span>
            </div>
            {driver.color && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Color</span>
                <span className="text-sm text-foreground">{driver.color}</span>
              </div>
            )}
          </div>

          {/* Rating & comments */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.round(driver.rating)
                        ? "fill-accent text-accent"
                        : "fill-muted text-muted"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-bold text-foreground">
                {driver.rating.toFixed(1)}
              </span>
            </div>

            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Comentarios recientes
            </p>
            <div className="space-y-2">
              {loadingComments ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 text-accent animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-3">
                  Este conductor aún no tiene reseñas
                </p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-1 mb-1">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star
                          key={j}
                          className={`h-3 w-3 ${
                            j < c.estrellas ? "fill-accent text-accent" : "fill-muted text-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-foreground">{c.comentario}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">— {c.author}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-accent/10 rounded-xl border border-accent/30 p-4">
            <p className="text-sm font-bold text-foreground mb-1">💰 Costo del viaje</p>
            {estimatedCost === "city" ? (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Tarifa fija dentro de la ciudad</p>
                <span className="text-lg font-extrabold text-accent">$1.00</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Depende la distancia, el conductor te informará el costo
              </p>
            )}
          </div>

          {/* Request Button */}
          <Button
            variant="hero"
            size="lg"
            className="w-full rounded-xl text-base"
            disabled={!driver.available}
            onClick={() => onRequest(driver.id)}
          >
            {driver.available ? "Solicitar este conductor" : "No disponible en este momento"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DriverProfile;
