import { Star, Phone, ShieldCheck, ArrowLeft, Clock, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Driver } from "@/components/DriverCard";

interface DriverProfileProps {
  driver: Driver;
  onRequest: (driverId: string) => void;
  onClose: () => void;
  estimatedCost?: string;
}

const MOCK_COMMENTS = [
  { author: "María L.", text: "Muy puntual y amable. Recomendado.", rating: 5 },
  { author: "José R.", text: "Conduce con cuidado, buen servicio.", rating: 4 },
  { author: "Ana P.", text: "Llegó rápido. Todo bien.", rating: 5 },
];

const MOCK_STATS: Record<string, { trips: number; months: number; cedula: string }> = {
  "1": { trips: 342, months: 18, cedula: "080XXXXXXX01" },
  "2": { trips: 215, months: 12, cedula: "080XXXXXXX02" },
  "3": { trips: 189, months: 8, cedula: "080XXXXXXX03" },
  "4": { trips: 410, months: 24, cedula: "080XXXXXXX04" },
  "5": { trips: 98, months: 4, cedula: "080XXXXXXX05" },
};

const DriverProfile = ({ driver, onRequest, onClose, estimatedCost }: DriverProfileProps) => {
  const stats = MOCK_STATS[driver.id] || { trips: 0, months: 0, cedula: "---" };

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
          <img
            src={driver.photo}
            alt={driver.name}
            className="w-24 h-24 rounded-full object-cover border-4 border-accent mx-auto mb-3"
          />
          <h2 className="text-xl font-extrabold text-primary-foreground">
            {driver.name}
          </h2>
          <div className="flex items-center justify-center gap-1 mt-1">
            <ShieldCheck className="h-4 w-4 text-accent" />
            <span className="text-xs text-accent font-semibold">
              Cédula verificada · {stats.cedula}
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
              {MOCK_COMMENTS.map((c, i) => (
                <div key={i} className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-1 mb-1">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star
                        key={j}
                        className={`h-3 w-3 ${
                          j < c.rating
                            ? "fill-accent text-accent"
                            : "fill-muted text-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-foreground">{c.text}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">— {c.author}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Estimated Cost */}
          {estimatedCost && (
            <div className="bg-accent/10 rounded-xl border border-accent/30 p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-foreground">💰 Costo estimado</p>
                <p className="text-xs text-muted-foreground">Tarifa base $1.00 + $0.30/km</p>
              </div>
              <span className="text-lg font-extrabold text-accent">{estimatedCost}</span>
            </div>
          )}

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
