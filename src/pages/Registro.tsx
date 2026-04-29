import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Mail, Lock, User, Check } from 'lucide-react';
import logoMotoya from '@/assets/logo-motoya.png';
import GoogleButton from '@/components/GoogleButton';

const Registro = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [rol, setRol] = useState<'pasajero' | 'conductor'>('pasajero');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre,
          rol,
        },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast({
        title: 'Error al registrarse',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: '¡Cuenta creada!',
        description: 'Revisa tu correo para confirmar tu cuenta.',
      });
      navigate('/login');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="gradient-primary px-4 pt-10 pb-8">
        <button onClick={() => navigate('/welcome')} className="text-primary-foreground/70 mb-4">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3">
          <img src={logoMotoya} alt="MotoYa" className="h-10 w-10" />
          <div>
            <h1 className="text-xl font-extrabold text-accent">Crear Cuenta</h1>
            <p className="text-xs text-primary-foreground/70">Únete a MotoYa</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleRegister} className="flex-1 p-6 flex flex-col gap-4">
        <div className="space-y-2">
          <Label>¿Cómo quieres usar MotoYa?</Label>
          <RadioGroup value={rol} onValueChange={(v) => setRol(v as 'pasajero' | 'conductor')} className="grid grid-cols-2 gap-3">
            <label
              htmlFor="pasajero"
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                rol === 'pasajero' ? 'border-accent bg-accent/10' : 'border-border'
              }`}
            >
              <RadioGroupItem value="pasajero" id="pasajero" className="sr-only" />
              <User className={`h-8 w-8 ${rol === 'pasajero' ? 'text-accent' : 'text-muted-foreground'}`} />
              <span className={`text-sm font-semibold ${rol === 'pasajero' ? 'text-foreground' : 'text-muted-foreground'}`}>
                Pasajero
              </span>
              <span className="text-[10px] text-muted-foreground text-center">Pide tu mototaxi</span>
            </label>
            <label
              htmlFor="conductor"
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                rol === 'conductor' ? 'border-accent bg-accent/10' : 'border-border'
              }`}
            >
              <RadioGroupItem value="conductor" id="conductor" className="sr-only" />
              <Bike className={`h-8 w-8 ${rol === 'conductor' ? 'text-accent' : 'text-muted-foreground'}`} />
              <span className={`text-sm font-semibold ${rol === 'conductor' ? 'text-foreground' : 'text-muted-foreground'}`}>
                Conductor
              </span>
              <span className="text-[10px] text-muted-foreground text-center">Ofrece viajes</span>
            </label>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre completo</Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="nombre"
              type="text"
              placeholder="Tu nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>

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

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
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

        <Button type="submit" variant="hero" size="lg" className="w-full mt-2" disabled={loading}>
          {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
        </Button>

        <div className="relative my-1">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-muted-foreground">o regístrate con</span>
          </div>
        </div>

        <GoogleButton label="Registrarme con Google" />

        <p className="text-center text-sm text-muted-foreground mt-2">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-accent font-semibold hover:underline">
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Registro;
