import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import PermissionsScreen from '@/components/PermissionsScreen';
import { subscribeToPush } from '@/lib/onesignal';

const syncPlayerId = async (u: User) => {
  try {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'denied') return;
    if (Notification.permission === 'default') {
      try {
        const res = await Notification.requestPermission();
        if (res !== 'granted') return;
      } catch { return; }
    }
    const playerId = await Promise.race<string | null>([
      subscribeToPush(),
      new Promise<null>((r) => setTimeout(() => r(null), 10000)),
    ]);
    if (!playerId) return;
    const role = (u.user_metadata as any)?.rol;
    if (role === 'conductor') {
      await (supabase as any).from('conductores')
        .update({ onesignal_player_id: playerId })
        .eq('usuario_id', u.id);
      // fallback in case PK is the user id
      await (supabase as any).from('conductores')
        .update({ onesignal_player_id: playerId })
        .eq('id', u.id);
    } else {
      await (supabase as any).from('usuarios')
        .update({ onesignal_player_id: playerId })
        .eq('id', u.id);
    }
  } catch (e) {
    console.warn('syncPlayerId failed:', e);
  }
};

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const PERMISSIONS_KEY = "motoya_permisos_solicitados";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPermissions, setShowPermissions] = useState(false);

  useEffect(() => {
    const checkPermissions = async (u: User | null) => {
      if (!u) {
        setShowPermissions(false);
        return;
      }
      if (localStorage.getItem(PERMISSIONS_KEY)) return;

      // If both permissions are already granted, skip the screen and mark as asked
      try {
        let geoGranted = false;
        let notifGranted = false;

        if ("permissions" in navigator) {
          try {
            const geoStatus = await (navigator as any).permissions.query({ name: "geolocation" });
            geoGranted = geoStatus.state === "granted";
          } catch {}
        }
        if (typeof Notification !== "undefined") {
          notifGranted = Notification.permission === "granted";
        }

        if (geoGranted && notifGranted) {
          localStorage.setItem(PERMISSIONS_KEY, "1");
          return;
        }
      } catch {}

      setShowPermissions(true);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      checkPermissions(session?.user ?? null);
      if (session?.user) syncPlayerId(session.user);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      checkPermissions(session?.user ?? null);
      if (session?.user) syncPlayerId(session.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const handlePermissionsDone = () => {
    localStorage.setItem(PERMISSIONS_KEY, "1");
    setShowPermissions(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
      {showPermissions && user && <PermissionsScreen onDone={handlePermissionsDone} />}
    </AuthContext.Provider>
  );
};
