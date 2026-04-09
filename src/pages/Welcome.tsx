import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import logoMotoya from '@/assets/logo-motoya.png';

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen gradient-primary flex flex-col items-center justify-center px-6">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <img src={logoMotoya} alt="MotoYa" className="h-28 w-28 drop-shadow-lg" />
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-accent">MotoYa</h1>
          <p className="text-primary-foreground/80 text-sm mt-2">
            Tu mototaxi seguro y rápido en Pedernales 🏍️
          </p>
        </div>
      </div>

      <div className="w-full max-w-xs mt-16 flex flex-col gap-3">
        <Button
          variant="hero"
          size="lg"
          className="w-full text-base"
          onClick={() => navigate('/login')}
        >
          Iniciar Sesión
        </Button>
        <Button
          variant="heroOutline"
          size="lg"
          className="w-full text-base"
          onClick={() => navigate('/registro')}
        >
          Crear Cuenta
        </Button>
      </div>

      <p className="text-primary-foreground/50 text-xs mt-8">
        Pedernales, Ecuador
      </p>
    </div>
  );
};

export default Welcome;
