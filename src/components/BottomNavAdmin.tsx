import { Bike, Route, Users, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export type AdminTab = "conductores" | "viajes" | "usuarios" | "stats";

interface Props {
  active: AdminTab;
  onChange: (tab: AdminTab) => void;
}

const items: { key: AdminTab; label: string; icon: typeof Bike }[] = [
  { key: "conductores", label: "Conductores", icon: Bike },
  { key: "viajes", label: "Viajes", icon: Route },
  { key: "usuarios", label: "Usuarios", icon: Users },
  { key: "stats", label: "Stats", icon: BarChart3 },
];

const BottomNavAdmin = ({ active, onChange }: Props) => (
  <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md safe-area-bottom">
    <div className="flex items-center justify-around py-2">
      {items.map((item) => {
        const isActive = active === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors",
              isActive ? "text-accent" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>
  </nav>
);

export default BottomNavAdmin;
