import { Link, Outlet } from 'react-router-dom';
import { Logo, DemoTag } from '../components/ui/Logo';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';

export function PublicLayout() {
  const { session } = useAuth();
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="/#como-funciona" className="hover:text-slate-900">Cómo funciona</a>
            <a href="/#problema" className="hover:text-slate-900">El problema</a>
            <a href="/#solucion" className="hover:text-slate-900">Solución</a>
            <a href="/#motor" className="hover:text-slate-900">El motor</a>
          </nav>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block">
              <DemoTag />
            </span>
            {session ? (
              <Link to="/app/dashboard">
                <Button size="sm">Ir a la app</Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button size="sm" variant="ghost">Iniciar sesión</Button>
                </Link>
                <Link to="/login">
                  <Button size="sm" variant="accent">Explorar demo</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <Outlet />
      <footer className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-slate-500 sm:flex-row">
          <Logo />
          <p>Conectamos el combustible con quienes producen Bolivia.</p>
          <p className="text-xs">MVP de hackathon · datos simulados · sin pagos reales</p>
        </div>
      </footer>
    </div>
  );
}
