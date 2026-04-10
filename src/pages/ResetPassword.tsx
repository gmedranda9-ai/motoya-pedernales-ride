import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Lock, CheckCircle } from 'lucide-react';
import logoMotoya from '@/assets/logo-motoya.png';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from the auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    // Also check hash for recovery type
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: 'Error',
        description: 'Las contraseñas no coinciden',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Error',
        description: 'La contraseña debe tener al menos 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (!isRecovery && !success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <p className="text-muted-foreground mb-4">Enlace inválido o expirado.</p>
        <Button variant="hero" onClick={() => navigate('/olvide-contrasena')}>
          Solicitar nuevo enlace
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="gradient-primary px-4 pt-10 pb-8">
        <button onClick={() => navigate('/login')} className="text-primary-foreground/70 mb-4">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <img src={logoMotoya} alt="MotoYa" className="h-10 w-10" />
          <div>
            <h1 className="text-xl font-extrabold text-accent">Nueva Contraseña</h1>
            <p className="text-xs text-primary-foreground/70">Crea tu nueva contraseña</p>
          </div>
        </div>
      </header>

      {success ? (
        <div className="flex-1 p-6 flex flex-col items-center justify-center gap-4 text-center">
          <CheckCircle className="h-16 w-16 text-accent" />
          <h2 className="text-lg font-bold text-foreground">¡Contraseña actualizada!</h2>
          <p className="text-sm text-muted-foreground">
            Tu contraseña ha sido cambiada exitosamente.
          </p>
          <Button variant="hero" className="mt-4" onClick={() => navigate('/')}>
            Ir al inicio
          </Button>
        </div>
      ) : (
        <form onSubmit={handleUpdate} className="flex-1 p-6 flex flex-col gap-5">
          <div className="space-y-2">
            <Label htmlFor="password">Nueva contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                minLength={6}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirm"
                type="password"
                placeholder="Repite la contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
                minLength={6}
                required
              />
            </div>
          </div>

          <Button type="submit" variant="hero" size="lg" className="w-full mt-4" disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar contraseña'}
          </Button>
        </form>
      )}
    </div>
  );
};

export default ResetPassword;
