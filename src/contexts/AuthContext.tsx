import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import PermissionsScreen from '@/components/PermissionsScreen';

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

const PERMISSIONS_KEY = "motoya_permissions_asked";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPermissions, setShowPermissions] = useState(false);

  useEffect(() => {
    const checkPermissions = (u: User | null) => {
      if (!u) return;
      const key = `${PERMISSIONS_KEY}_${u.id}`;
      if (!localStorage.getItem(key)) {
        setShowPermissions(true);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      checkPermissions(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      checkPermissions(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const handlePermissionsDone = () => {
    if (user) {
      localStorage.setItem(`${PERMISSIONS_KEY}_${user.id}`, "1");
    }
    setShowPermissions(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
      {showPermissions && user && <PermissionsScreen onDone={handlePermissionsDone} />}
    </AuthContext.Provider>
  );
};
