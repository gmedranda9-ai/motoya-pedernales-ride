import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App as CapacitorApp } from "@capacitor/app";

const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 34.9 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C41 35.5 44 30.2 44 24c0-1.3-.1-2.3-.4-3.5z" />
  </svg>
);

interface GoogleButtonProps {
  label?: string;
}

const NATIVE_REDIRECT = "https://motoya.mkposeidon.com/auth/callback";

const GoogleButton = ({ label = "Continuar con Google" }: GoogleButtonProps) => {
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: NATIVE_REDIRECT,
            skipBrowserRedirect: true,
          },
        });
        if (error) throw error;
        if (!data?.url) throw new Error("No se obtuvo URL de autenticación");

        // Listen for the deep link callback
        const listener = await CapacitorApp.addListener("appUrlOpen", async (event) => {
          try {
            const url = new URL(event.url);
            const hash = url.hash?.startsWith("#") ? url.hash.slice(1) : "";
            const params = new URLSearchParams(hash || url.search);
            const access_token = params.get("access_token");
            const refresh_token = params.get("refresh_token");
            if (access_token && refresh_token) {
              await supabase.auth.setSession({ access_token, refresh_token });
            }
          } catch (e) {
            console.error("Deep link parse error", e);
          } finally {
            await Browser.close().catch(() => {});
            listener.remove();
          }
        });

        await Browser.open({ url: data.url, presentationStyle: "popover" });
        return;
      } catch (err: any) {
        toast({
          title: "Error con Google",
          description: err?.message ?? "No se pudo iniciar sesión",
          variant: "destructive",
        });
        return;
      }
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast({
        title: "Error con Google",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full gap-2 rounded-xl"
      onClick={handleGoogleSignIn}
    >
      <GoogleIcon />
      <span className="font-semibold">{label}</span>
    </Button>
  );
};

export default GoogleButton;
