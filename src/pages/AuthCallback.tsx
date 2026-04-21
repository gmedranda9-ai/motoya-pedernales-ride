import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logoMotoya from "@/assets/logo-motoya.png";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase JS auto-detects the session from the URL hash/query.
        // We just need to wait for it to be available.
        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        let session = data.session;

        // If session not yet ready, listen briefly for SIGNED_IN
        if (!session) {
          session = await new Promise((resolve) => {
            const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
              if (s) {
                sub.subscription.unsubscribe();
                resolve(s);
              }
            });
            // Safety timeout
            setTimeout(() => {
              sub.subscription.unsubscribe();
              resolve(null);
            }, 5000);
          });
        }

        if (!session) {
          toast({
            title: "Error de autenticación",
            description: "No se pudo establecer la sesión.",
            variant: "destructive",
          });
          navigate("/login", { replace: true });
          return;
        }

        const role = session.user?.user_metadata?.rol;

        if (!role) {
          navigate("/seleccionar-rol", { replace: true });
        } else {
          navigate("/", { replace: true });
        }
      } catch (err: any) {
        toast({
          title: "Error de autenticación",
          description: err?.message ?? "Algo salió mal.",
          variant: "destructive",
        });
        navigate("/login", { replace: true });
      }
    };

    handleCallback();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <img src={logoMotoya} alt="MotoYa" className="h-16 w-16 animate-pulse" />
      <p className="text-sm text-muted-foreground">Iniciando sesión...</p>
    </div>
  );
};

export default AuthCallback;
