import { useEffect, useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Driver } from "@/components/DriverCard";

interface RatingScreenProps {
  driver: Driver;
  destination: string;
  viajeId?: string;
  onSubmit: (rating: number, comment: string) => void;
}

const RatingScreen = ({ driver, destination, viajeId, onSubmit }: RatingScreenProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);

  // Check if this trip was already rated
  useEffect(() => {
    const check = async () => {
      if (!viajeId) return;
      const { data } = await supabase
        .from("calificaciones")
        .select("id")
        .eq("viaje_id", viajeId)
        .maybeSingle();
      if (data) setAlreadyRated(true);
    };
    check();
  }, [viajeId]);

  const handleSubmit = async () => {
    if (rating === 0 || saving) return;
    if (!user) {
      toast({ title: "Sesión requerida", description: "Inicia sesión para calificar.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // 1. Insert rating
      const { error: insertErr } = await supabase.from("calificaciones").insert({
        viaje_id: viajeId,
        pasajero_id: user.id,
        conductor_id: driver.id,
        estrellas: rating,
        comentario: comment.trim() || null,
      });
      if (insertErr) {
        if (insertErr.code === "23505" || /duplicate|unique/i.test(insertErr.message)) {
          toast({ title: "Ya calificaste este viaje", variant: "destructive" });
          setAlreadyRated(true);
          setSaving(false);
          return;
        }
        throw insertErr;
      }

      // 2. Recalculate driver's average rating
      const { data: ratings } = await supabase
        .from("calificaciones")
        .select("estrellas")
        .eq("conductor_id", driver.id);
      if (ratings && ratings.length > 0) {
        const avg = ratings.reduce((s, r: any) => s + Number(r.estrellas), 0) / ratings.length;
        await supabase
          .from("conductores")
          .update({ calificacion_promedio: Number(avg.toFixed(2)) })
          .eq("id", driver.id);
      }

      setSubmitted(true);
      onSubmit(rating, comment);
    } catch (err: any) {
      console.error("Error guardando calificación:", err);
      toast({ title: "Error", description: err.message || "No se pudo guardar la calificación.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (alreadyRated && !submitted) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6 animate-fade-in">
        <div className="text-center space-y-6 max-w-sm">
          <span className="text-6xl">✅</span>
          <h2 className="text-xl font-extrabold text-foreground">Ya calificaste este viaje</h2>
          <p className="text-sm text-muted-foreground">Solo puedes calificar una vez por viaje.</p>
          <Button variant="hero" size="lg" className="w-full rounded-xl" onClick={() => onSubmit(0, "")}>
            Continuar
          </Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6 animate-fade-in">
        <div className="text-center space-y-6 max-w-sm">
          <span className="text-6xl">🎉</span>
          <h2 className="text-xl font-extrabold text-foreground">¡Gracias por tu calificación!</h2>
          <p className="text-sm text-muted-foreground">Tu opinión nos ayuda a mejorar el servicio en Pedernales.</p>
        </div>
      </div>
    );
  }

  const STAR_LABELS = ["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"];

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6 animate-fade-in">
      <div className="text-center space-y-6 max-w-sm w-full">
        <h2 className="text-xl font-extrabold text-foreground">¿Cómo estuvo tu viaje?</h2>
        
        <div className="flex items-center justify-center gap-3">
          <img
            src={driver.photo}
            alt={driver.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-accent"
          />
          <div className="text-left">
            <p className="font-bold text-foreground">{driver.name}</p>
            <p className="text-xs text-muted-foreground">📍 {destination}</p>
          </div>
        </div>

        {/* Stars */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`h-10 w-10 transition-colors ${
                    star <= (hoveredStar || rating)
                      ? "fill-accent text-accent"
                      : "fill-muted text-muted"
                  }`}
                />
              </button>
            ))}
          </div>
          {(hoveredStar || rating) > 0 && (
            <p className="text-sm font-semibold text-accent">
              {STAR_LABELS[hoveredStar || rating]}
            </p>
          )}
        </div>

        {/* Comment */}
        <Textarea
          placeholder="Comentario opcional..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="rounded-xl resize-none"
          rows={3}
        />

        <Button
          variant="hero"
          size="lg"
          className="w-full rounded-xl"
          disabled={rating === 0}
          onClick={handleSubmit}
        >
          Enviar calificación
        </Button>

        {rating === 0 && (
          <p className="text-[10px] text-muted-foreground">
            Selecciona al menos una estrella para continuar
          </p>
        )}
      </div>
    </div>
  );
};

export default RatingScreen;
