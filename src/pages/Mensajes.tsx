import BottomNav from "@/components/BottomNav";
import { MessageSquare } from "lucide-react";
import { useBackButton } from "@/hooks/useBackButton";

const mockChats = [
  { id: "1", name: "Juan Reyes", lastMsg: "Estoy llegando al punto", time: "14:32", unread: 1 },
  { id: "2", name: "Carlos Mendoza", lastMsg: "Gracias por el viaje!", time: "Ayer", unread: 0 },
];

const Mensajes = () => {
  useBackButton();
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="gradient-primary px-4 pt-12 pb-6">
        <h1 className="text-xl font-extrabold text-accent">Mensajes</h1>
        <p className="text-xs text-primary-foreground/70 mt-1">Chats con conductores</p>
      </header>

      <div className="mx-4 mt-4 space-y-2">
        {mockChats.map((chat) => (
          <button
            key={chat.id}
            className="flex items-center gap-3 w-full bg-card rounded-xl p-4 border border-border hover:border-accent/50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{chat.name}</span>
                <span className="text-[10px] text-muted-foreground">{chat.time}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{chat.lastMsg}</p>
            </div>
            {chat.unread > 0 && (
              <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                <span className="text-[10px] font-bold text-accent-foreground">{chat.unread}</span>
              </div>
            )}
          </button>
        ))}
      </div>

      <BottomNav />
    </div>
  );
};

export default Mensajes;
