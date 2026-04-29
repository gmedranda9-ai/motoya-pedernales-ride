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
  const [rol, setRol] = useState<'pasajero' | 'conductor' | null>(null);
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
        <div className="space-y-3">
          <Label className="text-base font-semibold">¿Cómo quieres usar MotoYa? <span className="text-destructive">*</span></Label>
          <RadioGroup
            value={rol ?? ''}
            onValueChange={(v) => setRol(v as 'pasajero' | 'conductor')}
            className="grid grid-cols-2 gap-3"
          >
            {([
              { value: 'pasajero', emoji: '👤', title: 'Pasajero', desc: 'Solicita mototaxis de forma segura' },
              { value: 'conductor', emoji: '🛺', title: 'Conductor', desc: 'Genera ingresos ofreciendo viajes' },
            ] as const).map((opt) => {
              const selected = rol === opt.value;
              return (
                <label
                  key={opt.value}
                  htmlFor={opt.value}
                  className={`relative flex flex-col items-center justify-start gap-2 p-5 min-h-[180px] rounded-2xl border-4 cursor-pointer transition-all ${
                    selected
                      ? 'border-accent bg-primary text-primary-foreground shadow-lg scale-[1.02]'
                      : 'border-border bg-muted/40 text-muted-foreground hover:border-muted-foreground/40'
                  }`}
                >
                  <RadioGroupItem value={opt.value} id={opt.value} className="sr-only" />
                  {selected && (
                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 bg-accent text-accent-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <Check className="h-3 w-3" /> Seleccionado
                    </span>
                  )}
                  <span className="text-5xl leading-none mt-1" aria-hidden>{opt.emoji}</span>
                  <span className={`text-base font-bold ${selected ? 'text-primary-foreground' : ''}`}>
                    {opt.title}
                  </span>
                  <span className={`text-xs text-center leading-snug ${selected ? 'text-primary-foreground/80' : ''}`}>
                    {opt.desc}
                  </span>
                </label>
              );
            })}
          </RadioGroup>
          {!rol && (
            <p className="text-xs text-muted-foreground text-center">Debes elegir un rol para continuar</p>
          )}
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

        <Button type="submit" variant="hero" size="lg" className="w-full mt-2" disabled={loading || !rol}>
          {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
        </Button>

        <p className="text-center text-muted-foreground" style={{ fontSize: '12px' }}>
          Al registrarte aceptas nuestros{' '}
          <a
            href="https://motoya.mkposeidon.com/legal/terminos.html"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: '#1a3a5c' }}
          >
            Términos y Condiciones
          </a>{' '}
          y{' '}
          <a
            href="https://motoya.mkposeidon.com/legal/privacidad.html"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: '#1a3a5c' }}
          >
            Política de Privacidad
          </a>
        </p>

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
