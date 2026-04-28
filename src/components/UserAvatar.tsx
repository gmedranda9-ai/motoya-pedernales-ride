import { cn } from "@/lib/utils";

interface UserAvatarProps {
  foto?: string | null;
  nombre: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const isInvalidPhoto = (url?: string | null) => {
  if (!url) return true;
  const u = url.toLowerCase();
  return (
    u.includes("logo-motoya") ||
    u.includes("placeholder") ||
    u.includes("via.placeholder") ||
    u.endsWith("/placeholder.svg")
  );
};

const SIZE_MAP = {
  sm: { box: "w-10 h-10", text: "text-base", border: "border-2" },
  md: { box: "w-16 h-16", text: "text-2xl", border: "border-2" },
  lg: { box: "w-24 h-24", text: "text-4xl", border: "border-[3px]" },
};

const UserAvatar = ({ foto, nombre, size = "md", className }: UserAvatarProps) => {
  const cfg = SIZE_MAP[size];
  const initial = (nombre || "?").trim().charAt(0).toUpperCase() || "?";
  const showPhoto = !isInvalidPhoto(foto);

  if (showPhoto) {
    return (
      <img
        src={foto as string}
        alt={nombre}
        onError={(e) => {
          // Si la imagen falla, ocultarla y dejar que el padre re-renderice como inicial
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
        className={cn(
          cfg.box,
          cfg.border,
          "rounded-full object-cover border-accent flex-shrink-0 shadow-md",
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        cfg.box,
        cfg.border,
        "rounded-full bg-primary border-accent flex items-center justify-center flex-shrink-0 shadow-md",
        className
      )}
      aria-label={nombre}
    >
      <span className={cn("font-extrabold text-accent leading-none", cfg.text)}>
        {initial}
      </span>
    </div>
  );
};

export default UserAvatar;
