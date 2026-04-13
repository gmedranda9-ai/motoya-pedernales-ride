import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Driver } from "@/components/DriverCard";

interface RatingScreenProps {
  driver: Driver;
  destination: string;
  onSubmit: (rating: number, comment: string) => void;
}

const RatingScreen = ({ driver, destination, onSubmit }: RatingScreenProps) => {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating === 0) return;
    setSubmitted(true);
    onSubmit(rating, comment);
  };

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
