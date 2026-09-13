import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Tractor, Fuel, Truck, ShieldCheck, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { useConfig } from '../../hooks/queries';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Field';
import { Logo, DemoTag } from '../../components/ui/Logo';
import type { Role } from '../../types';

const DEMO_ROLES: Array<{ role: Role; label: string; org: string; icon: typeof Tractor; text: string }> = [
  { role: 'producer', label: 'Productor', org: 'Asociación Agrícola Santa Cruz', icon: Tractor, text: 'Publica una demanda y encuentra el match óptimo.' },
  { role: 'supplier', label: 'Proveedor', org: 'Combustibles del Norte SRL', icon: Fuel, text: 'Publica ofertas y revisa demandas compatibles.' },
  { role: 'carrier', label: 'Transportista', org: 'Logística Oriente', icon: Truck, text: 'Acepta transportes y actualiza estados de entrega.' },
  { role: 'admin', label: 'Administrador', org: 'DieselP2P', icon: ShieldCheck, text: 'Dashboard, mapa, anomalías e impacto.' },
];

export default function LoginPage() {
  const { loginDemo, loginWithPassword } = useAuth();
  const { data: config } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState<Role | 'password' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const from = (location.state as { from?: string } | null)?.from ?? '/app/dashboard';

  const enterDemo = async (role: Role) => {
    setBusy(role);
    try {
      const s = await loginDemo(role);
      toast.success(`Bienvenido, ${s.profile.full_name}`);
      navigate('/app/dashboard');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo iniciar la sesión demo');
    } finally {
      setBusy(null);
    }
  };

  const submitPassword = async (e: FormEvent) => {
    e.preventDefault();
    setBusy('password');
    try {
      await loginWithPassword(email, password);
      navigate(from);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Credenciales inválidas');
    } finally {
      setBusy(null);
    }
  };

  const demoMode = config?.demoMode ?? true;
  const supabaseOn = config?.supabaseConfigured ?? false;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="hidden w-[42%] flex-col justify-between bg-gradient-to-br from-brand-800 to-brand-950 p-10 text-white lg:flex">
        <Link to="/">
          <Logo light />
        </Link>
        <div>
          <h2 className="text-3xl font-extrabold leading-tight">Del combustible al productor, sin perder valor en el camino.</h2>
          <p className="mt-4 max-w-md text-brand-200">Elige un rol para recorrer la demo: la plataforma carga datos simulados listos para presentar el flujo completo.</p>
        </div>
        <p className="text-xs text-brand-300">MVP demo — datos simulados. Sin pagos reales.</p>
      </div>

      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-xl">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link to="/">
              <Logo />
            </Link>
            <DemoTag />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-slate-500">Accede con un perfil de demostración o con tu cuenta.</p>

          {demoMode && (
            <div className="mt-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Acceso demo por rol</p>
              <div className="stagger grid gap-3 sm:grid-cols-2">
                {DEMO_ROLES.map((r) => (
                  <button
                    key={r.role}
                    onClick={() => enterDemo(r.role)}
                    disabled={busy !== null}
                    className="card group flex items-start gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-float disabled:opacity-60"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 group-hover:bg-brand-600 group-hover:text-white">
                      <r.icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 font-semibold text-slate-900">
                        {r.label}
                        {busy === r.role ? <span className="text-xs text-slate-400">entrando…</span> : <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />}
                      </span>
                      <span className="block truncate text-xs font-medium text-brand-700">{r.org}</span>
                      <span className="mt-1 block text-xs text-slate-500">{r.text}</span>
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Cuentas ficticias: {config?.demoAccounts ? Object.values(config.demoAccounts).join(' · ') : 'demo.<rol>@dieselp2p.demo'}. Sin contraseñas.
              </p>
            </div>
          )}

          <div className="my-8 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" /> {supabaseOn ? 'o con tu cuenta' : 'cuenta con correo (requiere Supabase)'} <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={submitPassword} className="space-y-4">
            <Field label="Correo">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" required disabled={!supabaseOn} />
            </Field>
            <Field label="Contraseña">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required disabled={!supabaseOn} />
            </Field>
            <Button type="submit" className="w-full" loading={busy === 'password'} disabled={!supabaseOn}>
              Entrar
            </Button>
            {!supabaseOn && <p className="text-center text-xs text-slate-400">Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para habilitar cuentas reales.</p>}
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            ¿Sin cuenta?{' '}
            <Link to="/register" className="font-semibold text-brand-700 hover:underline">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
