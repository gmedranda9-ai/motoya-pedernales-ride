import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mail } from 'lucide-react';
import logoMotoya from '@/assets/logo-motoya.png';

const OlvideContrasena = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="gradient-primary px-4 pt-10 pb-8">
        <button onClick={() => navigate('/login')} className="text-primary-foreground/70 mb-4">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <img src={logoMotoya} alt="MotoYa" className="h-10 w-10" />
          <div>
            <h1 className="text-xl font-extrabold text-accent">Recuperar Contraseña</h1>
            <p className="text-xs text-primary-foreground/70">Te enviaremos un enlace</p>
          </div>
        </div>
      </header>

      {sent ? (
        <div className="flex-1 p-6 flex flex-col items-center justify-center gap-4 text-center">
          <Mail className="h-16 w-16 text-accent" />
          <h2 className="text-lg font-bold text-foreground">¡Correo enviado!</h2>
          <p className="text-sm text-muted-foreground">
            Revisa tu bandeja de entrada en <strong>{email}</strong> y sigue el enlace para restablecer tu contraseña.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/login')}>
            Volver al login
          </Button>
        </div>
      ) : (
        <form onSubmit={handleReset} className="flex-1 p-6 flex flex-col gap-5">
          <p className="text-sm text-muted-foreground">
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
          </p>
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <Button type="submit" variant="hero" size="lg" className="w-full mt-4" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar enlace'}
          </Button>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-center text-sm text-accent font-semibold hover:underline mt-2"
          >
            Volver al login
          </button>
        </form>
      )}
    </div>
  );
};

export default OlvideContrasena;
